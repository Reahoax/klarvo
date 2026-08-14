"use server";

import { revalidatePath } from "next/cache";
import { opretServerKlient } from "@/lib/supabase/server";
import { INDVENDINGER, UDFALD_MED_INDVENDING } from "@/lib/leads/indvendinger.ts";
import { genererBekraeftelsestekst, type MoedeForm } from "@/lib/moeder/bekraeftelsestekst.ts";

const GYLDIGE_MOEDEFORMER = new Set(["fysisk", "online", "telefon"]);

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
  const manuskriptId = formData.get("manuskriptId") ? String(formData.get("manuskriptId")) : null;
  const udfald = String(formData.get("udfald") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const ringIgenRaa = String(formData.get("ring_igen_dato") ?? "").trim();
  const indvendingRaa = String(formData.get("indvending") ?? "").trim();

  if (!leadId || !GYLDIGE_UDFALD.includes(udfald as (typeof GYLDIGE_UDFALD)[number])) {
    return;
  }

  // Indvending gemmes kun ved udfald, hvor den reelt giver mening (afviste
  // opkald) - se lib/leads/indvendinger.ts. Ignoreres stille ellers, i
  // stedet for at kræve klient-JS til at skjule feltet betinget.
  const indvending =
    UDFALD_MED_INDVENDING.has(udfald) &&
    (INDVENDINGER as readonly string[]).includes(indvendingRaa)
      ? indvendingRaa
      : null;

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
    indvending,
    manuskript_id: manuskriptId || null,
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

// Etape 10 — Bookingflow (Spec.md 2A, skærmbillede H): opretter selve
// møde-rækken (status "planlagt") ud over den almindelige opkalds-log, og
// returnerer en bekræftelsestekst, som brugeren selv kopierer og sender -
// systemet sender aldrig noget selv. Lukker leadet på samme måde som
// gemAktivitet ville have gjort for udfaldet "moede_booket" (som også logges
// her, så Historik/Ring igen-logikken forbliver konsistent med de andre
// udfald).
export async function bookMoede(
  _forrigeState: { fejl?: string; ok?: boolean; bekraeftelsestekst?: string } | null,
  formData: FormData
): Promise<{ fejl?: string; ok?: boolean; bekraeftelsestekst?: string }> {
  const leadId = String(formData.get("leadId") ?? "");
  const kundeId = String(formData.get("kundeId") ?? "");
  const virksomhedsnavn = String(formData.get("virksomhedsnavn") ?? "");
  const datoTidRaa = String(formData.get("dato_tid") ?? "").trim();
  const moedeForm = String(formData.get("form") ?? "");
  const deltagerNavn = String(formData.get("deltager_navn") ?? "").trim();
  const deltagerTitel = String(formData.get("deltager_titel") ?? "").trim();
  const kontekstnote = String(formData.get("kontekstnote") ?? "").trim();

  if (!leadId || !kundeId) {
    return { fejl: "Leadet er ikke tilknyttet en kunde." };
  }
  if (!datoTidRaa) {
    return { fejl: "Vælg dato og tid for mødet." };
  }
  if (!GYLDIGE_MOEDEFORMER.has(moedeForm)) {
    return { fejl: "Vælg en mødeform." };
  }

  const datoTidIso = new Date(datoTidRaa).toISOString();

  const supabase = await opretServerKlient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error: moedeFejl } = await supabase.from("moeder").insert({
    lead_id: leadId,
    kunde_id: kundeId,
    status: "planlagt",
    dato_tid: datoTidIso,
    form: moedeForm,
    deltager_navn: deltagerNavn || null,
    deltager_titel: deltagerTitel || null,
    kontekstnote: kontekstnote || null,
  });
  if (moedeFejl) return { fejl: moedeFejl.message };

  await supabase.from("aktiviteter").insert({
    lead_id: leadId,
    kunde_id: kundeId,
    udfald: "moede_booket",
    bruger_id: user?.id ?? null,
  });
  await supabase.from("leads").update({ status_pipeline: "lukket" }).eq("id", leadId);

  revalidatePath("/ringeliste");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  revalidatePath("/moeder");
  revalidatePath("/okonomi");
  revalidatePath(`/kunder/${kundeId}`);

  const bekraeftelsestekst = genererBekraeftelsestekst({
    virksomhedsnavn,
    deltagerNavn,
    datoTid: datoTidIso,
    form: moedeForm as MoedeForm,
    kontekstnote,
  });

  return { ok: true, bekraeftelsestekst };
}
