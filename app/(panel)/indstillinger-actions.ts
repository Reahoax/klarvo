"use server";

import { revalidatePath } from "next/cache";
import { opretServerKlient } from "@/lib/supabase/server";

// Kun "navn" kan skrives herfra - kolonne-rettighederne på profiler-tabellen
// forhindrer at rolle (eller andet) kan ændres via dette eller et direkte API-kald.
export async function opdaterNavn(
  _forrigeState: { fejl?: string; ok?: boolean } | null,
  formData: FormData
): Promise<{ fejl?: string; ok?: boolean }> {
  const navn = String(formData.get("navn") ?? "").trim();
  const supabase = await opretServerKlient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { fejl: "Ikke logget ind." };

  const { error } = await supabase
    .from("profiler")
    .update({ navn: navn || null })
    .eq("id", user.id);

  if (error) return { fejl: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

// Selve upload til Storage sker klient-side (se KontoSektion i indstillinger-modal.tsx),
// ligesom brugerdefineret baggrundsbillede - denne action gemmer blot den
// resulterende offentlige URL på profilen.
export async function opdaterAvatar(
  _forrigeState: { fejl?: string; ok?: boolean } | null,
  formData: FormData
): Promise<{ fejl?: string; ok?: boolean }> {
  const avatarUrl = String(formData.get("avatar_url") ?? "").trim();
  const supabase = await opretServerKlient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { fejl: "Ikke logget ind." };

  const { error } = await supabase
    .from("profiler")
    .update({ avatar_url: avatarUrl || null })
    .eq("id", user.id);

  if (error) return { fejl: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function skiftAdgangskode(
  _forrigeState: { fejl?: string; ok?: boolean } | null,
  formData: FormData
): Promise<{ fejl?: string; ok?: boolean }> {
  const nyKode = String(formData.get("ny_adgangskode") ?? "");
  const gentag = String(formData.get("gentag_adgangskode") ?? "");

  if (nyKode.length < 8) {
    return { fejl: "Adgangskoden skal være mindst 8 tegn." };
  }
  if (nyKode !== gentag) {
    return { fejl: "De to felter er ikke ens." };
  }

  const supabase = await opretServerKlient();
  const { error } = await supabase.auth.updateUser({ password: nyKode });

  if (error) return { fejl: error.message };
  return { ok: true };
}

const splitListe = (vaerdi: FormDataEntryValue | null) =>
  String(vaerdi ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

// Kun "ejer" må ændre forretningsregler (virksomhedsform-whitelist mv.) - roller
// styres af profiler-tabellen, ikke af hvad klienten hævder, så den tjekkes her
// igen, uanset at UI'et allerede skjuler sektionen for operatører.
export async function gemForretningsregler(
  _forrigeState: { fejl?: string; ok?: boolean } | null,
  formData: FormData
): Promise<{ fejl?: string; ok?: boolean }> {
  const supabase = await opretServerKlient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { fejl: "Ikke logget ind." };

  const { data: profil } = await supabase
    .from("profiler")
    .select("rolle")
    .eq("id", user.id)
    .single();
  if (profil?.rolle !== "ejer") {
    return { fejl: "Kun ejere kan ændre forretningsregler." };
  }

  const graenseRaa = String(formData.get("import_advarsel_graense") ?? "").trim();
  const graense = graenseRaa ? Number.parseInt(graenseRaa, 10) : null;
  if (graenseRaa && (!Number.isFinite(graense) || graense === null || graense < 0)) {
    return { fejl: "Import-advarselsgrænsen skal være et positivt tal." };
  }

  const ringetidFra = String(formData.get("ringetid_fra") ?? "").trim();
  const ringetidTil = String(formData.get("ringetid_til") ?? "").trim();
  const ringetidUgedage = formData
    .getAll("ringetid_ugedage")
    .map((v) => Number.parseInt(String(v), 10))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 7);

  if (ringetidFra && ringetidTil && ringetidFra >= ringetidTil) {
    return { fejl: "Ringetidsvinduets sluttidspunkt skal være efter starttidspunktet." };
  }

  const { error } = await supabase
    .from("konfiguration")
    .update({
      tilladte_virksomhedsformer: splitListe(formData.get("tilladte_virksomhedsformer")),
      virksomhedsformer_fysiske_personer: splitListe(
        formData.get("virksomhedsformer_fysiske_personer")
      ),
      ...(graense !== null ? { import_advarsel_graense: graense } : {}),
      ...(ringetidFra ? { ringetid_fra: ringetidFra } : {}),
      ...(ringetidTil ? { ringetid_til: ringetidTil } : {}),
      ringetid_ugedage: ringetidUgedage,
    })
    .eq("id", true);

  if (error) return { fejl: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
