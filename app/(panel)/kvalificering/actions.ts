"use server";

import { opretServerKlient } from "@/lib/supabase/server";

export type KvalificeringsFelt = "fit" | "behov" | "oekonomi" | "person";

// Gemmer ét kvalificeringssvar ad gangen (ikke alle fire på én gang), så en
// operatør kan besvare felt for felt med korte tastaturgenveje uden at miste
// fremgang, hvis de ikke når alle fire i samme session.
// kvalificeret beregnes af databasetriggeren beregn_lead_felter() - ikke her.
export async function gemKvalificeringsFelt(
  leadId: string,
  felt: KvalificeringsFelt,
  vaerdi: "J" | "N"
): Promise<{ fejl?: string }> {
  const supabase = await opretServerKlient();
  const { error } = await supabase.from("leads").update({ [felt]: vaerdi }).eq("id", leadId);

  if (error) {
    return { fejl: error.message };
  }
  return {};
}
