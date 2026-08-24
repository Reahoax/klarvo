"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { opretServerKlient } from "@/lib/supabase/server";

export async function opretKunde(formData: FormData) {
  const navn = String(formData.get("navn") ?? "").trim();
  if (!navn) return;

  const kontaktperson = String(formData.get("kontaktperson") ?? "").trim() || null;
  const prisRaa = String(formData.get("pris_pr_moede") ?? "").trim();
  const startdato = String(formData.get("startdato") ?? "").trim() || null;
  const pilotSlutdato = String(formData.get("pilot_slutdato") ?? "").trim() || null;

  const supabase = await opretServerKlient();
  const { data, error } = await supabase
    .from("kunder")
    .insert({
      navn,
      kontaktperson,
      pris_pr_moede: prisRaa ? Number(prisRaa) : null,
      startdato,
      pilot_slutdato: pilotSlutdato,
    })
    .select("id")
    .single();

  revalidatePath("/kunder");

  if (!error && data) {
    redirect(`/kunder/${data.id}`);
  }
}

export async function opdaterKunde(formData: FormData) {
  const kundeId = String(formData.get("kundeId") ?? "");
  if (!kundeId) return;

  const navn = String(formData.get("navn") ?? "").trim();
  const kontaktperson = String(formData.get("kontaktperson") ?? "").trim() || null;
  const prisRaa = String(formData.get("pris_pr_moede") ?? "").trim();
  const startdato = String(formData.get("startdato") ?? "").trim() || null;
  const pilotSlutdato = String(formData.get("pilot_slutdato") ?? "").trim() || null;

  const supabase = await opretServerKlient();
  await supabase
    .from("kunder")
    .update({
      navn,
      kontaktperson,
      pris_pr_moede: prisRaa ? Number(prisRaa) : null,
      startdato,
      pilot_slutdato: pilotSlutdato,
    })
    .eq("id", kundeId);

  revalidatePath(`/kunder/${kundeId}`);
  revalidatePath("/kunder");
}

// Delt af både kundens ICP-felt og hvert segments egne kriterier - samme
// firkantede kriterie-form bruges begge steder (se Spec.md "Hver kunde har
// en ICP-definition... Hvert segment er en navngiven ICP med sine egne
// kriterier").
function parseKriterier(formData: FormData) {
  const splitListe = (vaerdi: FormDataEntryValue | null) =>
    String(vaerdi ?? "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

  const ansatteFraRaa = String(formData.get("ansatte_fra") ?? "").trim();
  const ansatteTilRaa = String(formData.get("ansatte_til") ?? "").trim();

  return {
    branchekoder: splitListe(formData.get("branchekoder")),
    virksomhedsformer: splitListe(formData.get("virksomhedsformer")),
    postnumre: splitListe(formData.get("postnumre")),
    ansatte_fra: ansatteFraRaa ? Number(ansatteFraRaa) : null,
    ansatte_til: ansatteTilRaa ? Number(ansatteTilRaa) : null,
  };
}

export async function opdaterIcp(formData: FormData) {
  const kundeId = String(formData.get("kundeId") ?? "");
  if (!kundeId) return;

  const supabase = await opretServerKlient();
  await supabase.from("kunder").update({ icp: parseKriterier(formData) }).eq("id", kundeId);

  revalidatePath(`/kunder/${kundeId}`);
}

export async function opdaterDpa(formData: FormData) {
  const kundeId = String(formData.get("kundeId") ?? "");
  if (!kundeId) return;

  const underskrevet = formData.get("dpa_underskrevet") === "on";
  const dato = String(formData.get("dpa_dato") ?? "").trim() || null;
  const link = String(formData.get("dpa_link") ?? "").trim() || null;

  const supabase = await opretServerKlient();
  await supabase
    .from("kunder")
    .update({ dpa_underskrevet: underskrevet, dpa_dato: dato, dpa_link: link })
    .eq("id", kundeId);

  revalidatePath(`/kunder/${kundeId}`);
  revalidatePath("/kunder");
}

export async function opdaterMoederKoebt(formData: FormData) {
  const kundeId = String(formData.get("kundeId") ?? "");
  const antalRaa = String(formData.get("moeder_koebt") ?? "").trim();
  if (!kundeId || !antalRaa) return;

  const antal = Number(antalRaa);
  if (!Number.isFinite(antal) || antal < 0) return;

  const supabase = await opretServerKlient();
  await supabase.from("kunder").update({ moeder_koebt: antal }).eq("id", kundeId);

  revalidatePath(`/kunder/${kundeId}`);
  revalidatePath("/kunder");
}

// Etape 6 — Opkaldsmanuskripter (Spec.md 2B): "Gemte manuskripter pr. kunde
// og segment... Versionering, så vi kan se hvilket manuskript der gav hvilke
// resultater." Hver gemning er en NY række (aldrig en UPDATE), så tidligere
// versioner bevares uændret til senere at kunne sammenlignes med resultater.
export async function opretManuskript(formData: FormData) {
  const kundeId = String(formData.get("kundeId") ?? "");
  const indhold = String(formData.get("indhold") ?? "").trim();
  if (!kundeId || !indhold) return;

  const supabase = await opretServerKlient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: seneste } = await supabase
    .from("manuskripter")
    .select("version")
    .eq("kunde_id", kundeId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("manuskripter").insert({
    kunde_id: kundeId,
    indhold,
    version: (seneste?.version ?? 0) + 1,
    bruger_id: user?.id ?? null,
  });

  revalidatePath(`/kunder/${kundeId}`);
}

export async function skiftAktivStatus(formData: FormData) {
  const kundeId = String(formData.get("kundeId") ?? "");
  const nyStatus = formData.get("aktive") === "true";
  if (!kundeId) return;

  const supabase = await opretServerKlient();
  await supabase.from("kunder").update({ aktive: nyStatus }).eq("id", kundeId);

  revalidatePath(`/kunder/${kundeId}`);
  revalidatePath("/kunder");
}

// Etape 7C — Segmenter (Spec.md "I. ICP-analyse og segmenter"): en kunde kan
// have flere navngivne ICP'er ad gangen, hver med sin egen leadliste, så
// flere hypoteser kan testes parallelt og sammenlignes (se
// lib/segmenter/statistik.ts for kontaktrate/mødrate pr. segment).
export async function opretSegment(formData: FormData) {
  const kundeId = String(formData.get("kundeId") ?? "");
  const navn = String(formData.get("navn") ?? "").trim();
  if (!kundeId || !navn) return;

  const supabase = await opretServerKlient();
  await supabase.from("segmenter").insert({
    kunde_id: kundeId,
    navn,
    kriterier: parseKriterier(formData),
  });

  revalidatePath(`/kunder/${kundeId}`);
}

export async function opdaterSegment(formData: FormData) {
  const segmentId = String(formData.get("segmentId") ?? "");
  const kundeId = String(formData.get("kundeId") ?? "");
  const navn = String(formData.get("navn") ?? "").trim();
  if (!segmentId || !kundeId || !navn) return;

  const supabase = await opretServerKlient();
  await supabase
    .from("segmenter")
    .update({ navn, kriterier: parseKriterier(formData) })
    .eq("id", segmentId);

  revalidatePath(`/kunder/${kundeId}`);
}

export async function skiftSegmentAktiv(formData: FormData) {
  const segmentId = String(formData.get("segmentId") ?? "");
  const kundeId = String(formData.get("kundeId") ?? "");
  const nyStatus = formData.get("aktiv") === "true";
  if (!segmentId || !kundeId) return;

  const supabase = await opretServerKlient();
  await supabase.from("segmenter").update({ aktiv: nyStatus }).eq("id", segmentId);

  revalidatePath(`/kunder/${kundeId}`);
}
