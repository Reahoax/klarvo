"use server";

import { revalidatePath } from "next/cache";
import { opretServerKlient } from "@/lib/supabase/server";
import { PIPELINE_STADIER } from "@/lib/leads/pipeline.ts";
import { hentSignalerForLead, type EnkeltSignalResultat } from "@/lib/signaler/hentSignaler.ts";
import { berigLead } from "@/lib/ai/berig.ts";

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

// Etape 7C/9 — tildeler et lead til en kunde og (valgfrit) et eller flere af
// den kundes segmenter. Genbruges to steder: den manuelle vælger her på
// leaddetaljer, og "Tildel"-knappen på Matching-siden (Spec.md "G. Matching")
// for et regelbaseret foreslået match - systemet tildeler aldrig selv, et
// menneske trykker altid Tildel. "Et lead kan tilhøre flere segmenter, men
// skal aldrig tildeles to kunder samtidig" (Spec.md "I") - håndhæves naturligt
// her, da leads.kunde_id er én enkelt fremmednøgle, ikke en liste.
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
  revalidatePath("/matching");
  revalidatePath("/kunder");
  if (kundeId) revalidatePath(`/kunder/${kundeId}`);
}

// Etape 8 (Spec.md "4B. OSINT") - "website" og "jobopslag" hentes samlet i
// ét kald (jobopslag-linket findes i forsidens HTML, se
// lib/signaler/hentSignaler.ts for hvorfor de deler robots.txt-opslag og
// rate-limit-slot). Selve rate limiting/robots.txt/cache-logikken er delt,
// så en fremtidig baggrundsjob (ligesom CVR-importens cron) kan genbruge den
// uden at duplikere reglerne.
type KildeVisning = { ok: boolean; besked: string };

function formaterEnkeltResultat(resultat: EnkeltSignalResultat): KildeVisning {
  if (!resultat.ok) return { ok: false, besked: resultat.besked };
  return {
    ok: true,
    besked: resultat.genbrugtFraCache ? "Genbruger gemt signal (under 30 dage gammelt)." : "Hentet.",
  };
}

export async function hentLeadSignaler(
  _forrigeState: { fejl?: string; website?: KildeVisning; jobopslag?: KildeVisning } | null,
  formData: FormData
): Promise<{ fejl?: string; website?: KildeVisning; jobopslag?: KildeVisning }> {
  const leadId = String(formData.get("leadId") ?? "");
  if (!leadId) return { fejl: "Mangler lead-id." };

  const supabase = await opretServerKlient();
  const { data: lead } = await supabase.from("leads").select("website").eq("id", leadId).single();
  if (!lead?.website) {
    return { fejl: "Dette lead har ingen registreret hjemmeside at hente signaler fra." };
  }

  const resultat = await hentSignalerForLead(supabase, leadId, lead.website);

  revalidatePath(`/leads/${leadId}`);

  return {
    website: formaterEnkeltResultat(resultat.website),
    jobopslag: formaterEnkeltResultat(resultat.jobopslag),
  };
}

// Etape 5 (Spec.md "4" og "4C") - manuel udløsning pr. lead, samme mønster
// som hentLeadSignaler ovenfor. Bevidst IKKE automatisk for alle leads -
// se lib/ai/berig.ts for begrundelsen (koster penge pr. kald, og kun
// leads et menneske rent faktisk kigger på, skal berammes).
export async function berigLeadMedAi(
  _forrigeState: { fejl?: string; besked?: string } | null,
  formData: FormData
): Promise<{ fejl?: string; besked?: string }> {
  const leadId = String(formData.get("leadId") ?? "");
  if (!leadId) return { fejl: "Mangler lead-id." };

  const supabase = await opretServerKlient();
  const resultat = await berigLead(supabase, leadId);

  revalidatePath(`/leads/${leadId}`);

  if (!resultat.ok) {
    return { fejl: resultat.fejl };
  }

  const dele: string[] = [];
  if (resultat.udfoerte.length > 0) dele.push(`Opdateret: ${resultat.udfoerte.join(", ")}.`);
  if (resultat.sprunget_over.length > 0) dele.push(`Genbrugt fra tidligere kald: ${resultat.sprunget_over.join(", ")}.`);
  return { besked: dele.length > 0 ? dele.join(" ") : "Intet at berige." };
}
