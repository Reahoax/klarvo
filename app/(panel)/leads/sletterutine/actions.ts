"use server";

import { revalidatePath } from "next/cache";
import { opretServerKlient } from "@/lib/supabase/server";
import { sletLeadOgRelateredeData } from "@/lib/leads/sletLead.ts";

// Spec.md "R7 — Dataminimering og sletning": "kan slettes med ét klik. Log
// hvad der slettes hvornår." Loggen skrives FØR selve sletningen, mens
// leadets data endnu findes - deletion_log.lead_id har bevidst INGEN
// fremmednøgle til leads (ellers ville loggen enten blokere sletningen
// eller selv blive slettet med den, hvilket ville modsige hele formålet
// med en revisionslog).
export async function sletForaeldetLead(
  _forrigeState: { fejl?: string } | null,
  formData: FormData
): Promise<{ fejl?: string }> {
  const leadId = String(formData.get("leadId") ?? "");
  if (!leadId) return { fejl: "Mangler lead-id." };

  const supabase = await opretServerKlient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = user
    ? await supabase.from("profiler").select("rolle").eq("id", user.id).single()
    : { data: null };
  if (profil?.rolle !== "ejer") {
    return { fejl: "Kun ejere kan slette leads." };
  }

  const { data: lead } = await supabase
    .from("leads")
    .select("virksomhedsnavn, cvr_nummer")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return { fejl: "Leadet blev ikke fundet - måske allerede slettet." };

  const { error: logFejl } = await supabase.from("deletion_log").insert({
    lead_id: leadId,
    begrundelse: `Forældet (R7-sletterutine): ${lead.virksomhedsnavn}, CVR ${lead.cvr_nummer} - ingen registreret aktivitet inden for forældelsesgrænsen.`,
  });
  if (logFejl) {
    return { fejl: `Kunne ikke skrive til slettelog, sletningen blev IKKE gennemført: ${logFejl.message}` };
  }

  const resultat = await sletLeadOgRelateredeData(supabase, leadId);
  if (!resultat.ok) {
    return { fejl: `${resultat.fejl} (log blev skrevet, sletningen er ufuldstændig)` };
  }

  revalidatePath("/leads/sletterutine");
  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return {};
}
