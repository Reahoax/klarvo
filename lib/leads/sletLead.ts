import type { SupabaseClient } from "@supabase/supabase-js";

// Delt mellem R7-sletterutinen (lib/leads/sletterutine, forældede leads) og
// GDPR-sletteanmodninger (app/(panel)/indsigt) - begge ender med præcis
// samme behov: ryd et leads relaterede data og slet selve leadet.
//
// Fem tabeller har en "NO ACTION"-fremmednøgle til leads (bekræftet mod et
// rigtigt sletteforsøg 2026-08-26 - ETHVERT lead har mindst én
// activity_log-række fra sin egen oprettelse) og skal derfor ryddes
// eksplicit FØR selve leadet slettes. signaler og lead_segmenter har
// CASCADE og ryddes automatisk af Postgres.
const TABELLER_MED_NO_ACTION_FREMMEDNOEGLE = [
  "aktiviteter",
  "moeder",
  "lead_snapshots",
  "ai_kald",
  "activity_log",
] as const;

export type SletResultat = { ok: true } | { ok: false; fejl: string };

export async function sletLeadOgRelateredeData(supabase: SupabaseClient, leadId: string): Promise<SletResultat> {
  for (const tabel of TABELLER_MED_NO_ACTION_FREMMEDNOEGLE) {
    const { error } = await supabase.from(tabel).delete().eq("lead_id", leadId);
    if (error) {
      return { ok: false, fejl: `Kunne ikke rydde ${tabel}: ${error.message}` };
    }
  }

  const { error: sletFejl } = await supabase.from("leads").delete().eq("id", leadId);
  if (sletFejl) {
    return { ok: false, fejl: `Kunne ikke slette leadet selv (relaterede data er ryddet): ${sletFejl.message}` };
  }

  return { ok: true };
}
