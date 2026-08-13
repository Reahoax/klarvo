"use server";

import { revalidatePath } from "next/cache";
import { opretServerKlient } from "@/lib/supabase/server";

const GYLDIGE_UDFALD = [
  "ikke_kontakt",
  "lagde_paa",
  "ikke_interesseret",
  "ring_igen",
  "moede_booket",
] as const;

// Udfald der afslutter leadet med det samme - det kommer ikke tilbage i ringelisten.
// "ring_igen"/"lagde_paa"/"ikke_kontakt" er forbigående og lægger leadet tilbage i køen.
const AFSLUTTENDE_UDFALD = new Set(["moede_booket", "ikke_interesseret"]);
const MAKS_FORSOEG = 4;

// Etape 6: logger ét opkaldsudfald. Automatisk tidsstempel via aktiviteter.oprettet
// (default now()). Flytter selv leadet til "lukket", når det er endegyldigt afgjort,
// eller når det fjerde forsøg er brugt - genringningsmodulets grænse (afsnit 2B).
export async function gemAktivitet(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  const kundeId = formData.get("kundeId") ? String(formData.get("kundeId")) : null;
  const udfald = String(formData.get("udfald") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const ringIgenRaa = String(formData.get("ring_igen_dato") ?? "").trim();

  if (!leadId || !GYLDIGE_UDFALD.includes(udfald as (typeof GYLDIGE_UDFALD)[number])) {
    return;
  }

  const supabase = await opretServerKlient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let ringIgenDato: string | null = null;
  if (udfald === "ring_igen") {
    if (ringIgenRaa) {
      ringIgenDato = new Date(ringIgenRaa).toISOString();
    } else {
      const toDageFrem = new Date();
      toDageFrem.setDate(toDageFrem.getDate() + 2);
      ringIgenDato = toDageFrem.toISOString();
    }
  }

  await supabase.from("aktiviteter").insert({
    lead_id: leadId,
    kunde_id: kundeId,
    udfald,
    note: note || null,
    ring_igen_dato: ringIgenDato,
    bruger_id: user?.id ?? null,
  });

  const { count: antalForsoeg } = await supabase
    .from("aktiviteter")
    .select("id", { count: "exact", head: true })
    .eq("lead_id", leadId);

  const skalLukkes =
    AFSLUTTENDE_UDFALD.has(udfald) || (antalForsoeg ?? 0) >= MAKS_FORSOEG;

  if (skalLukkes) {
    await supabase.from("leads").update({ status_pipeline: "lukket" }).eq("id", leadId);
  }

  revalidatePath("/ringeliste");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
}
