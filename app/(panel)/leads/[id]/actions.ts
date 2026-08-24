"use server";

import { revalidatePath } from "next/cache";
import { opretServerKlient } from "@/lib/supabase/server";
import { PIPELINE_STADIER } from "@/lib/leads/pipeline.ts";

// Stadier der kun må sættes af den dedikerede forretningslogik (godkendLead,
// og fremover ringeliste-udfald) - ikke ved et frit klik her. Ellers kan et lead
// fx vises som "Ringeliste" uden reelt at være godkendt eller kvalificeret, og
// dukker så forvirrende nok hverken op i Ringeliste-visningen (som filtrerer på
// godkendt+kvalificeret) eller forsvinder fra Kvalificeringskøen.
const IKKE_MANUELT_VAELGBARE = new Set(["godkendt", "ringeliste"]);

// Flytter et lead til et andet pipeline-stadie. Selve ændringen logges automatisk
// i activity_log af databasetriggeren - der er ingen ekstra logning at gøre her.
export async function opdaterPipelineStatus(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  const nytStadie = String(formData.get("stadie") ?? "");

  if (
    !leadId ||
    !PIPELINE_STADIER.includes(nytStadie as (typeof PIPELINE_STADIER)[number]) ||
    IKKE_MANUELT_VAELGBARE.has(nytStadie)
  ) {
    return;
  }

  const supabase = await opretServerKlient();
  await supabase.from("leads").update({ status_pipeline: nytStadie }).eq("id", leadId);

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
}

// R5: intet lead kommer i ringelisten uden at et menneske aktivt har trykket "Godkend".
// Godkendelsen sker her - kun for leads der allerede er kvalificerede og må kontaktes,
// og flytter samtidig leadet til pipeline-stadiet "ringeliste".
export async function godkendLead(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  if (!leadId) return;

  const supabase = await opretServerKlient();

  const { data: lead } = await supabase
    .from("leads")
    .select("kvalificeret, maa_kontaktes, godkendt")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead || !lead.kvalificeret || !lead.maa_kontaktes || lead.godkendt) {
    return;
  }

  await supabase
    .from("leads")
    .update({ godkendt: true, status_pipeline: "ringeliste" })
    .eq("id", leadId);

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  revalidatePath("/ringeliste");
}

// Etape 7C — manuel tildeling af et lead til en kunde og (valgfrit) et eller
// flere af den kundes segmenter. Automatisk foreslået matching med score
// (Spec.md "G. Matching") er Etape 9, ikke bygget - dette er den menneske-
// styrede vej ind, indtil da. "Et lead kan tilhøre flere segmenter, men skal
// aldrig tildeles to kunder samtidig" (Spec.md "I") - håndhæves naturligt her,
// da leads.kunde_id er én enkelt fremmednøgle, ikke en liste.
export async function tildelKunde(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  if (!leadId) return;

  const kundeId = String(formData.get("kundeId") ?? "").trim() || null;
  const segmentIds = formData.getAll("segmentIds").map(String).filter(Boolean);

  const supabase = await opretServerKlient();

  await supabase.from("leads").update({ kunde_id: kundeId }).eq("id", leadId);

  await supabase.from("lead_segmenter").delete().eq("lead_id", leadId);
  if (kundeId && segmentIds.length > 0) {
    await supabase
      .from("lead_segmenter")
      .insert(segmentIds.map((segmentId) => ({ lead_id: leadId, segment_id: segmentId })));
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  revalidatePath("/kunder");
  if (kundeId) revalidatePath(`/kunder/${kundeId}`);
}
