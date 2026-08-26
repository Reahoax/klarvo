import type { SupabaseClient } from "@supabase/supabase-js";
import { beregnFunnel, type FunnelResultat } from "./funnel.ts";
import { analyserAfvisningsgrunde, analyserKontaktTitel, type AfvisningsPost, type KontaktTitelResultat } from "./analyser.ts";

// Etape 10B (Spec.md "F. Rapport") - selve databaseopslaget. Rene
// beregninger (funnel.ts, analyser.ts) er allerede testet uafhængigt af
// dette; denne fil samler kun rådata og fordeler dem pr. kunde.
export type KundeRapport = { kundeId: string; navn: string; funnel: FunnelResultat };

export type RapportData = {
  perKunde: KundeRapport[];
  afvisningsgrunde: AfvisningsPost[];
  kontaktTitler: KontaktTitelResultat[];
};

export async function hentRapportData(supabase: SupabaseClient, fra: string, til: string): Promise<RapportData> {
  // "Til" skal dække HELE slutdagen, ikke kun 00:00 - ellers ville dags
  // dato som slutdato aldrig vise noget for i dag.
  const tilSlutAfDagen = `${til}T23:59:59.999Z`;

  const [{ data: kunder }, { data: leads }, { data: aktiviteter }, { data: moeder }] = await Promise.all([
    supabase.from("kunder").select("id, navn").order("navn"),
    supabase.from("leads").select("id, kunde_id, kvalificeret, kontaktperson_titel").not("kunde_id", "is", null),
    supabase
      .from("aktiviteter")
      .select("id, lead_id, kunde_id, udfald, oprettet")
      .gte("oprettet", fra)
      .lte("oprettet", tilSlutAfDagen),
    supabase
      .from("moeder")
      .select("id, lead_id, kunde_id, status, afvisningsgrund, oprettet")
      .gte("oprettet", fra)
      .lte("oprettet", tilSlutAfDagen),
  ]);

  const alleKunder = kunder ?? [];
  const alleLeads = leads ?? [];
  const alleAktiviteter = aktiviteter ?? [];
  const alleMoeder = moeder ?? [];

  const perKunde: KundeRapport[] = alleKunder.map((kunde) => {
    const kundeLeads = alleLeads.filter((l) => l.kunde_id === kunde.id);
    const kundeAktiviteter = alleAktiviteter.filter((a) => a.kunde_id === kunde.id);
    const kundeMoeder = alleMoeder.filter((m) => m.kunde_id === kunde.id);

    const ringetLeadIds = new Set(kundeAktiviteter.map((a) => a.lead_id));
    const kontaktLeadIds = new Set(
      kundeAktiviteter.filter((a) => a.udfald !== "ikke_kontakt").map((a) => a.lead_id)
    );

    return {
      kundeId: kunde.id,
      navn: kunde.navn,
      funnel: beregnFunnel({
        researchet: kundeLeads.length,
        kvalificeret: kundeLeads.filter((l) => l.kvalificeret).length,
        ringet: ringetLeadIds.size,
        kontaktOpnaaet: kontaktLeadIds.size,
        moederBooket: kundeMoeder.length,
      }),
    };
  });

  // Q2/Q3 (Spec.md "Målinger der faktisk betyder noget") regnes på tværs af
  // alle kunder for perioden, ikke pr. kunde - spørgsmålene er formuleret
  // som samlede driftsmål, ikke kundespecifikke.
  const afvisningsgrunde = analyserAfvisningsgrunde(
    alleMoeder.filter((m) => m.status === "afvist_af_kunde").map((m) => m.afvisningsgrund)
  );

  const kontaktedeLeadIds = new Set(
    alleAktiviteter.filter((a) => a.udfald !== "ikke_kontakt").map((a) => a.lead_id)
  );
  const moedeBooketLeadIds = new Set(alleMoeder.map((m) => m.lead_id));
  const kontaktTitler = analyserKontaktTitel(
    alleLeads
      .filter((l) => kontaktedeLeadIds.has(l.id))
      .map((l) => ({ titel: l.kontaktperson_titel, moedeBooket: moedeBooketLeadIds.has(l.id) }))
  );

  return { perKunde, afvisningsgrunde, kontaktTitler };
}
