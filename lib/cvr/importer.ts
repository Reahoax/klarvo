import type { SupabaseClient } from "@supabase/supabase-js";
import { sogVirksomheder, CVR_MAKS_RESULTAT_VINDUE } from "./sog.ts";
import { mapVirksomhedTilLead, type RaaVirksomhed } from "./mapning.ts";
import { SNAPSHOT_FELTER, type SnapshotData } from "../leads/snapshots.ts";

type IndsatLead = SnapshotData & { id: string; cvr_nummer: string; maa_kontaktes: boolean };

export type CvrImportRapport = {
  fejl?: string;
  soegningNavn: string;
  antalHentet: number;
  antalImporteret: number;
  antalSpaerret: number;
  antalFrasorteret: number;
  antalBatches: number;
  gennemloebFuldfoert: boolean; // nåede vi enden af hele det filtrerede datasæt i denne kørsel?
  samletAntalLeadsEfter: number;
  advarselGraenseOverskredet: boolean;
  advarselGraense: number;
};

const STANDARD_TIDSBUDGET_MS = 50_000; // holder sig under Vercel cron-routens maxDuration (60s)
const MAKS_BATCHES_PR_KOERSEL = 20; // sikkerhedsnet ud over tidsbudgettet - maks 60.000 virksomheder/nat

// Etape 11 — selve import-logikken, delt mellem den automatiske cron-route
// (app/api/cron/cvr-import/route.ts, kører uden bruger-session) og en
// eventuel manuel udløser. Tager bevidst en allerede-autoriseret Supabase-
// klient ind i stedet for selv at tjekke rolle/session - autorisering er
// OPKALDERENS ansvar (cron-routen tjekker CRON_SECRET, ikke en ejer-rolle,
// da der ikke er nogen indlogget bruger i den sammenhæng).
//
// Gennemløber HELE det filtrerede CVR-datasæt over flere kørsler, ikke bare
// én fast batch pr. nat - se cvr_import_fremgang-tabellen og search_after i
// lib/cvr/sog.ts. Brugeren bad eksplicit om at "den skal kunne få alle leads
// ind", ikke kun en fast portion pr. dag.
export async function koerCvrImport(
  supabase: SupabaseClient,
  tidsbudgetMs: number = STANDARD_TIDSBUDGET_MS
): Promise<CvrImportRapport> {
  const start = Date.now();

  const { data: konfiguration } = await supabase
    .from("konfiguration")
    .select("tilladte_virksomhedsformer, import_advarsel_graense")
    .eq("id", true)
    .single();
  if (!konfiguration) return fejlRapport("Kunne ikke læse importkonfigurationen.");

  const { data: forbindelse } = await supabase
    .from("cvr_forbindelse")
    .select("brugernavn, password")
    .eq("id", true)
    .single();
  if (!forbindelse?.brugernavn || !forbindelse.password) {
    return fejlRapport("Ingen CVR-forbindelse er gemt. Tilføj den under Indstillinger → Integrationer.");
  }

  const { data: fremgang } = await supabase
    .from("cvr_import_fremgang")
    .select("sidste_cvr_nummer, samlet_gennemloeb")
    .eq("id", true)
    .single();

  let efterCvrNummer: string | null = fremgang?.sidste_cvr_nummer ?? null;
  let samletGennemloeb = fremgang?.samlet_gennemloeb ?? 0;

  let antalHentetSamlet = 0;
  let antalImporteretSamlet = 0;
  let antalSpaerretSamlet = 0;
  let antalFrasorteretSamlet = 0;
  let antalBatches = 0;
  let gennemloebFuldfoert = false;
  let sidsteFejl: string | null = null;
  const alleIndsatteLeads: IndsatLead[] = [];

  while (Date.now() - start < tidsbudgetMs && antalBatches < MAKS_BATCHES_PR_KOERSEL) {
    const soegning = await sogVirksomheder(forbindelse.brugernavn, forbindelse.password, {
      virksomhedsformer: konfiguration.tilladte_virksomhedsformer,
      size: CVR_MAKS_RESULTAT_VINDUE,
      efterCvrNummer: efterCvrNummer ?? undefined,
    });

    if (!soegning.ok) {
      sidsteFejl = soegning.besked;
      break;
    }

    if (soegning.virksomheder.length === 0) {
      // Nået enden af hele det filtrerede datasæt - start forfra ved næste kørsel.
      efterCvrNummer = null;
      samletGennemloeb += 1;
      gennemloebFuldfoert = true;
      break;
    }

    antalBatches += 1;
    antalHentetSamlet += soegning.virksomheder.length;

    const raekker = (soegning.virksomheder as RaaVirksomhed[])
      .map(mapVirksomhedTilLead)
      .filter((r): r is NonNullable<typeof r> => r !== null);
    antalFrasorteretSamlet += soegning.virksomheder.length - raekker.length;

    if (raekker.length > 0) {
      const { data: indsatte, error: upsertFejl } = await supabase
        .from("leads")
        .upsert(raekker, { onConflict: "cvr_nummer" })
        .select(
          "id, cvr_nummer, maa_kontaktes, virksomhedsnavn, virksomhedsform, branchekode, branchetekst, antal_ansatte, status, adresse, postnr, by, telefon, website, reklamebeskyttelse"
        )
        .returns<IndsatLead[]>();

      if (upsertFejl) {
        sidsteFejl = `Skrivning til databasen fejlede: ${upsertFejl.message}`;
        break;
      }

      antalSpaerretSamlet += (indsatte ?? []).filter((r) => !r.maa_kontaktes).length;
      alleIndsatteLeads.push(...(indsatte ?? []));
    }

    efterCvrNummer = soegning.sidsteCvrNummer;

    // Gemmes efter HVER batch, ikke kun til sidst - rammer kørslen tidsbudgettet
    // eller crasher midtvejs, er fremskridtet allerede sikret til næste nat.
    await supabase
      .from("cvr_import_fremgang")
      .update({
        sidste_cvr_nummer: efterCvrNummer,
        samlet_gennemloeb: samletGennemloeb,
        senest_opdateret: new Date().toISOString(),
      })
      .eq("id", true);
  }

  // Kun en reel fejl, hvis vi intet nåede at importere denne kørsel - stopper
  // en senere batch pga. en forbigående fejl, beholder vi det, der allerede
  // blev importeret, i stedet for at kassere det.
  if (sidsteFejl && antalBatches === 0) {
    return fejlRapport(`CVR-opslaget fejlede: ${sidsteFejl}`);
  }

  const soegningNavn = `CVR-import ${new Date().toLocaleString("da-DK")}`;
  const { data: soegningRaekke } = await supabase
    .from("soegninger")
    .insert({
      navn: soegningNavn,
      parametre: {
        kilde: "cvr_api",
        virksomhedsformer: konfiguration.tilladte_virksomhedsformer,
        antalBatches,
        gennemloebFuldfoert,
        fejl: sidsteFejl,
      },
      traeffere: antalImporteretSamlet,
      sidst_koert: new Date().toISOString(),
    })
    .select("id")
    .single();

  antalImporteretSamlet = alleIndsatteLeads.length;

  if (soegningRaekke) {
    await supabase.from("soegning_snapshots").insert({
      soegning_id: soegningRaekke.id,
      antal: antalImporteretSamlet,
      parametre: {
        antalSpaerret: antalSpaerretSamlet,
        antalFrasorteret: antalFrasorteretSamlet,
        cvrNumre: alleIndsatteLeads.map((l) => l.cvr_nummer),
      },
    });
  }

  if (alleIndsatteLeads.length > 0) {
    const { error: snapshotFejl } = await supabase.from("lead_snapshots").insert(
      alleIndsatteLeads.map((lead) => {
        const data = Object.fromEntries(SNAPSHOT_FELTER.map((felt) => [felt, lead[felt]])) as SnapshotData;
        return { lead_id: lead.id, data: { ...data, _soegning_id: soegningRaekke?.id ?? null } };
      })
    );
    if (snapshotFejl) {
      console.error("Kunne ikke gemme lead_snapshots for CVR-import:", snapshotFejl.message);
    }
  }

  const { count: samletAntalLeadsEfter } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true });

  return {
    soegningNavn,
    antalHentet: antalHentetSamlet,
    antalImporteret: antalImporteretSamlet,
    antalSpaerret: antalSpaerretSamlet,
    antalFrasorteret: antalFrasorteretSamlet,
    antalBatches,
    gennemloebFuldfoert,
    samletAntalLeadsEfter: samletAntalLeadsEfter ?? antalImporteretSamlet,
    advarselGraenseOverskredet: (samletAntalLeadsEfter ?? 0) > konfiguration.import_advarsel_graense,
    advarselGraense: konfiguration.import_advarsel_graense,
  };
}

function fejlRapport(besked: string): CvrImportRapport {
  return {
    fejl: besked,
    soegningNavn: "",
    antalHentet: 0,
    antalImporteret: 0,
    antalSpaerret: 0,
    antalFrasorteret: 0,
    antalBatches: 0,
    gennemloebFuldfoert: false,
    samletAntalLeadsEfter: 0,
    advarselGraenseOverskredet: false,
    advarselGraense: 0,
  };
}
