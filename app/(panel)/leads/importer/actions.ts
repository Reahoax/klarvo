"use server";

import Papa from "papaparse";
import { opretServerKlient } from "@/lib/supabase/server";
import { filtrerOgValidérImport, type ImportResultat } from "@/lib/leads/import.ts";
import { SNAPSHOT_FELTER, type SnapshotData } from "@/lib/leads/snapshots.ts";

type IndsatLead = SnapshotData & { id: string; cvr_nummer: string; maa_kontaktes: boolean };

export type ImportRapport = {
  fejl?: string;
  soegningNavn: string;
  antalRaekkerIFilen: number;
  antalImporteret: number;
  antalSpaerret: number;
  frasorteret: ImportResultat["frasorteret"];
  advarsler: ImportResultat["advarsler"];
  muligeDubletter: ImportResultat["muligeDubletter"];
  samletAntalLeadsEfter: number;
  advarselGraenseOverskredet: boolean;
  advarselGraense: number;
};

export async function importerLeads(
  _forrigeState: ImportRapport | null,
  formData: FormData
): Promise<ImportRapport | null> {
  const soegningNavn = String(formData.get("soegningNavn") ?? "").trim();
  const fil = formData.get("fil") as File | null;

  if (!soegningNavn) {
    return fejlRapport("Giv importen et navn (fx 'Kontorfag Nordjylland, aug 2026').");
  }

  if (!fil || fil.size === 0) {
    return fejlRapport("Vælg en CSV-fil at importere.");
  }

  const tekst = await fil.text();
  const parsed = Papa.parse<Record<string, string>>(tekst, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    return fejlRapport(
      `Filen kunne ikke læses: ${parsed.errors[0].message} (række ${parsed.errors[0].row ?? "?"}). Ret filen og prøv igen.`
    );
  }

  if (parsed.data.length === 0) {
    return fejlRapport("Filen indeholder ingen rækker.");
  }

  const supabase = await opretServerKlient();

  const { data: konfiguration, error: konfigFejl } = await supabase
    .from("konfiguration")
    .select("tilladte_virksomhedsformer, import_advarsel_graense")
    .single();

  if (konfigFejl || !konfiguration) {
    return fejlRapport("Kunne ikke læse importkonfigurationen. Prøv igen om lidt.");
  }

  const resultat = filtrerOgValidérImport(parsed.data, {
    tilladteVirksomhedsformer: konfiguration.tilladte_virksomhedsformer,
  });

  let antalSpaerret = 0;
  let indsatteLeads: IndsatLead[] = [];

  if (resultat.klar.length > 0) {
    const { data: indsatte, error: upsertFejl } = await supabase
      .from("leads")
      .upsert(resultat.klar, { onConflict: "cvr_nummer" })
      .select(
        "id, cvr_nummer, maa_kontaktes, virksomhedsnavn, virksomhedsform, branchekode, branchetekst, antal_ansatte, status, adresse, postnr, by, telefon, website, reklamebeskyttelse"
      )
      .returns<IndsatLead[]>();

    if (upsertFejl) {
      return fejlRapport(`Importen fejlede ved skrivning til databasen: ${upsertFejl.message}`);
    }

    antalSpaerret = (indsatte ?? []).filter((r) => !r.maa_kontaktes).length;
    indsatteLeads = indsatte ?? [];
  }

  const { data: soegning, error: soegningFejl } = await supabase
    .from("soegninger")
    .insert({
      navn: soegningNavn,
      parametre: { kilde: "csv_import", filnavn: fil.name },
      traeffere: resultat.klar.length,
      sidst_koert: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (!soegningFejl && soegning) {
    await supabase.from("soegning_snapshots").insert({
      soegning_id: soegning.id,
      antal: resultat.klar.length,
      parametre: {
        frasorteret: resultat.frasorteret,
        advarsler: resultat.advarsler,
        muligeDubletter: resultat.muligeDubletter,
        antalSpaerret,
        cvrNumre: indsatteLeads.map((l) => l.cvr_nummer),
      },
    });
  }

  // Etape 7B: ét fuldt øjebliksbillede pr. berørt lead ved hver import, så
  // ændringer opdaget ved geninport (adresse, antal ansatte, status m.m.) kan
  // spores over tid - se lib/leads/snapshots.ts. Fejler denne skrivning,
  // skal det ikke vælte selve importen (leads er allerede gemt) - logges kun.
  if (indsatteLeads.length > 0) {
    const { error: snapshotFejl } = await supabase.from("lead_snapshots").insert(
      indsatteLeads.map((lead) => {
        const data = Object.fromEntries(
          SNAPSHOT_FELTER.map((felt) => [felt, lead[felt]])
        ) as SnapshotData;
        return {
          lead_id: lead.id,
          data: { ...data, _soegning_id: soegning?.id ?? null },
        };
      })
    );
    if (snapshotFejl) {
      console.error("Kunne ikke gemme lead_snapshots for import:", snapshotFejl.message);
    }
  }

  const { count: samletAntalLeadsEfter } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true });

  return {
    soegningNavn,
    antalRaekkerIFilen: parsed.data.length,
    antalImporteret: resultat.klar.length,
    antalSpaerret,
    frasorteret: resultat.frasorteret,
    advarsler: resultat.advarsler,
    muligeDubletter: resultat.muligeDubletter,
    samletAntalLeadsEfter: samletAntalLeadsEfter ?? resultat.klar.length,
    advarselGraenseOverskredet:
      (samletAntalLeadsEfter ?? 0) > konfiguration.import_advarsel_graense,
    advarselGraense: konfiguration.import_advarsel_graense,
  };
}

function fejlRapport(besked: string): ImportRapport {
  return {
    fejl: besked,
    soegningNavn: "",
    antalRaekkerIFilen: 0,
    antalImporteret: 0,
    antalSpaerret: 0,
    frasorteret: [],
    advarsler: [],
    muligeDubletter: [],
    samletAntalLeadsEfter: 0,
    advarselGraenseOverskredet: false,
    advarselGraense: 0,
  };
}
