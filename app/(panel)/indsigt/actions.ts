"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { opretServerKlient } from "@/lib/supabase/server";
import { sletLeadOgRelateredeData } from "@/lib/leads/sletLead.ts";

// Spec.md modulkatalog, "Sletteanmodning" (Etape 12): "Slet alt om en
// person eller virksomhed, men behold posten i opt-out-registret. Log
// handlingen." Adskilt fra R7-sletterutinen (lib/leads/sletterutine) ved
// at denne ALTID tilføjer til opt_out_register - en GDPR-sletteanmodning
// er implicit også et "kontakt mig aldrig igen", mens R7's forældelses-
// sletning bare er oprydning af data, ingen har rørt i lang tid.
export async function sletOgSpaerLead(
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
    return { fejl: "Kun ejere kan behandle sletteanmodninger." };
  }

  const { data: lead } = await supabase
    .from("leads")
    .select("virksomhedsnavn, cvr_nummer, telefon")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return { fejl: "Leadet blev ikke fundet - måske allerede slettet." };

  // Opt-out-registret skrives FØR selve sletningen, mens leadets data endnu
  // findes - og "kan aldrig fjernes, kun tilføjes" (Spec.md), så det er
  // helt bevidst, at der ikke er nogen "fortryd"-handling for dette.
  const { error: spaerFejl } = await supabase.from("opt_out_register").insert({
    cvr_nummer: lead.cvr_nummer,
    telefon: lead.telefon,
    begrundelse: `GDPR-sletteanmodning: ${lead.virksomhedsnavn}, CVR ${lead.cvr_nummer}.`,
  });
  if (spaerFejl) {
    return { fejl: `Kunne ikke tilføje til opt-out-registret, sletningen blev IKKE gennemført: ${spaerFejl.message}` };
  }

  const { error: logFejl } = await supabase.from("deletion_log").insert({
    lead_id: leadId,
    begrundelse: `GDPR-sletteanmodning: ${lead.virksomhedsnavn}, CVR ${lead.cvr_nummer} - slettet og tilføjet til opt-out-registret.`,
  });
  if (logFejl) {
    return { fejl: `Kunne ikke skrive til slettelog, sletningen blev IKKE gennemført: ${logFejl.message}` };
  }

  const resultat = await sletLeadOgRelateredeData(supabase, leadId);
  if (!resultat.ok) {
    return { fejl: `${resultat.fejl} (leadet er nu spærret i opt-out-registret, men sletningen er ufuldstændig)` };
  }

  revalidatePath("/indsigt");
  revalidatePath("/leads");
  redirect("/indsigt");
}
