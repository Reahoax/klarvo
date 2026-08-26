import type { SupabaseClient } from "@supabase/supabase-js";
import { erSignalFrisk } from "./tidsregler.ts";

// Etape 8 (Spec.md "4B. OSINT") - udtrukket fra hentSignaler.ts, så nye
// kildetyper (cvr_aendring, anmeldelse m.fl.) kan genbruge samme "hent
// aldrig det samme to gange"-cachetjek uden at duplikere det pr. fil.
export type SignalType = "website" | "jobopslag" | "regnskab" | "cvr_aendring" | "presse" | "anmeldelse";

export type CachetSignal = { vaerdi: string; kilde_url: string; hentet_dato: string };

export async function hentFriskCache(
  supabase: SupabaseClient,
  leadId: string,
  type: SignalType
): Promise<CachetSignal | null> {
  const { data } = await supabase
    .from("signaler")
    .select("vaerdi, kilde_url, hentet_dato")
    .eq("lead_id", leadId)
    .eq("type", type)
    .order("hentet_dato", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data?.vaerdi && erSignalFrisk(new Date(data.hentet_dato))) return data;
  return null;
}
