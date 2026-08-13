"use server";

import { revalidatePath } from "next/cache";
import { opretServerKlient } from "@/lib/supabase/server";

// Kun ejere må logge/slette økonomiposter - tjekkes her (ikke kun i UI'et),
// samme mønster som gemForretningsregler i indstillinger-actions.ts.
async function kraevEjer() {
  const supabase = await opretServerKlient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, ok: false as const };

  const { data: profil } = await supabase
    .from("profiler")
    .select("rolle")
    .eq("id", user.id)
    .single();

  return { supabase, ok: profil?.rolle === "ejer", brugerId: user.id };
}

export async function opretOekonomiPost(
  _forrigeState: { fejl?: string; ok?: boolean } | null,
  formData: FormData
): Promise<{ fejl?: string; ok?: boolean }> {
  const { supabase, ok, brugerId } = await kraevEjer();
  if (!ok) return { fejl: "Kun ejere kan logge økonomiposter." };

  const type = String(formData.get("type") ?? "");
  const navn = String(formData.get("navn") ?? "").trim();
  const beloebRaa = String(formData.get("beloeb") ?? "").trim();
  const kategori = String(formData.get("kategori") ?? "").trim();
  const gentagelse = String(formData.get("gentagelse") ?? "engangs");
  const datoRaa = String(formData.get("dato") ?? "").trim();

  if (type !== "indtaegt" && type !== "omkostning") {
    return { fejl: "Ugyldig type." };
  }
  if (!navn) return { fejl: "Navn mangler." };

  const beloeb = Number.parseFloat(beloebRaa.replace(",", "."));
  if (!Number.isFinite(beloeb) || beloeb < 0) {
    return { fejl: "Beløb skal være et positivt tal." };
  }
  if (!["engangs", "maanedligt", "aarligt"].includes(gentagelse)) {
    return { fejl: "Ugyldig gentagelse." };
  }

  const { error } = await supabase.from("oekonomi_poster").insert({
    type,
    navn,
    beloeb,
    kategori: kategori || null,
    gentagelse,
    dato: datoRaa || new Date().toISOString().slice(0, 10),
    bruger_id: brugerId,
  });

  if (error) return { fejl: error.message };

  revalidatePath("/okonomi");
  return { ok: true };
}

export async function sletOekonomiPost(formData: FormData) {
  const { supabase, ok } = await kraevEjer();
  if (!ok) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabase.from("oekonomi_poster").delete().eq("id", id);
  revalidatePath("/okonomi");
}
