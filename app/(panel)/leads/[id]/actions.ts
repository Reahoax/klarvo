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
