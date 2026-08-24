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
  samletAntalLeadsEfter: number;
  advarselGraenseOverskredet: boolean;
  advarselGraense: number;
};

// Etape 11 — selve import-logikken, delt mellem den automatiske cron-route
// (app/api/cron/cvr-import/route.ts, kører uden bruger-session) og en
// eventuel manuel udløser. Tager bevidst en allerede-autoriseret Supabase-
// klient ind i stedet for selv at tjekke rolle/session - autorisering er
// OPKALDERENS ansvar (cron-routen tjekker CRON_SECRET, ikke en ejer-rolle,
// da der ikke er nogen indlogget bruger i den sammenhæng).
export async function koerCvrImport(
  supabase: SupabaseClient,
  antal: number = 200
): Promise<CvrImportRapport> {
  const graenset = Math.min(Math.max(antal, 1), CVR_MAKS_RESULTAT_VINDUE);

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

  const soegning = await sogVirksomheder(forbindelse.brugernavn, forbindelse.password, {
    virksomhedsformer: konfiguration.tilladte_virksomhedsformer,
    size: graenset,
  });
  if (!soegning.ok) return fejlRapport(`CVR-opslaget fejlede: ${soegning.besked}`);

  const raekker = (soegning.virksomheder as RaaVirksomhed[])
    .map(mapVirksomhedTilLead)
    .filter((r): r is NonNullable<typeof r> => r !== null);
  const antalFrasorteret = soegning.virksomheder.length - raekker.length;

  let antalSpaerret = 0;
  let indsatteLeads: IndsatLead[] = [];

  if (raekker.length > 0) {
    const { data: indsatte, error: upsertFejl } = await supabase
      .from("leads")
      .upsert(raekker, { onConflict: "cvr_nummer" })
      .select(
        "id, cvr_nummer, maa_kontaktes, virksomhedsnavn, virksomhedsform, branchekode, branchetekst, antal_ansatte, status, adresse, postnr, by, telefon, website, reklamebeskyttelse"
      )
      .returns<IndsatLead[]>();

    if (upsertFejl) return fejlRapport(`Importen fejlede ved skrivning til databasen: ${upsertFejl.message}`);

    antalSpaerret = (indsatte ?? []).filter((r) => !r.maa_kontaktes).length;
    indsatteLeads = indsatte ?? [];
  }

  const soegningNavn = `CVR-import ${new Date().toLocaleString("da-DK")}`;
  const { data: soegningRaekke } = await supabase
    .from("soegninger")
    .insert({
      navn: soegningNavn,
      parametre: { kilde: "cvr_api", virksomhedsformer: konfiguration.tilladte_virksomhedsformer },
      traeffere: raekker.length,
      sidst_koert: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (soegningRaekke) {
    await supabase.from("soegning_snapshots").insert({
      soegning_id: soegningRaekke.id,
      antal: raekker.length,
      parametre: { antalSpaerret, antalFrasorteret, cvrNumre: indsatteLeads.map((l) => l.cvr_nummer) },
    });
  }

  if (indsatteLeads.length > 0) {
    const { error: snapshotFejl } = await supabase.from("lead_snapshots").insert(
      indsatteLeads.map((lead) => {
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
    antalHentet: soegning.virksomheder.length,
    antalImporteret: raekker.length,
    antalSpaerret,
    antalFrasorteret,
    samletAntalLeadsEfter: samletAntalLeadsEfter ?? raekker.length,
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
    samletAntalLeadsEfter: 0,
    advarselGraenseOverskredet: false,
    advarselGraense: 0,
  };
}
