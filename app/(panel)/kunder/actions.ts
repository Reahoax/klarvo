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

export async function opdaterIcp(formData: FormData) {
  const kundeId = String(formData.get("kundeId") ?? "");
  if (!kundeId) return;

  const splitListe = (vaerdi: FormDataEntryValue | null) =>
    String(vaerdi ?? "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

  const ansatteFraRaa = String(formData.get("ansatte_fra") ?? "").trim();
  const ansatteTilRaa = String(formData.get("ansatte_til") ?? "").trim();

  const icp = {
    branchekoder: splitListe(formData.get("branchekoder")),
    virksomhedsformer: splitListe(formData.get("virksomhedsformer")),
    postnumre: splitListe(formData.get("postnumre")),
    ansatte_fra: ansatteFraRaa ? Number(ansatteFraRaa) : null,
    ansatte_til: ansatteTilRaa ? Number(ansatteTilRaa) : null,
  };

  const supabase = await opretServerKlient();
  await supabase.from("kunder").update({ icp }).eq("id", kundeId);

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

export async function skiftAktivStatus(formData: FormData) {
  const kundeId = String(formData.get("kundeId") ?? "");
  const nyStatus = formData.get("aktive") === "true";
  if (!kundeId) return;

  const supabase = await opretServerKlient();
  await supabase.from("kunder").update({ aktive: nyStatus }).eq("id", kundeId);

  revalidatePath(`/kunder/${kundeId}`);
  revalidatePath("/kunder");
}
