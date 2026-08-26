"use server";

import { revalidatePath } from "next/cache";
import { opretServerKlient } from "@/lib/supabase/server";
import { testCvrForbindelse } from "@/lib/cvr/klient.ts";

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

// Bruges af alle tre CVR-forbindelse-actions - findes ét sted, så rollechecket
// ikke kan komme til at afvige mellem dem.
async function kraevEjer() {
  const supabase = await opretServerKlient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { fejl: "Ikke logget ind." as const };

  const { data: profil } = await supabase
    .from("profiler")
    .select("rolle")
    .eq("id", user.id)
    .single();
  if (profil?.rolle !== "ejer") {
    return { fejl: "Kun ejere kan ændre CVR-forbindelsen." as const };
  }
  return { supabase, brugerId: user.id };
}

// Gemmer credentials og tester forbindelsen med det samme, så brugeren får
// besked, hvis login fejler, i stedet for at opdage det først ved næste
// datatræk. Password'et returneres aldrig - kun status.
export async function gemCvrForbindelse(
  _forrigeState: { fejl?: string; ok?: boolean; testBesked?: string } | null,
  formData: FormData
): Promise<{ fejl?: string; ok?: boolean; testBesked?: string }> {
  const resultat = await kraevEjer();
  if ("fejl" in resultat) return { fejl: resultat.fejl };
  const { supabase, brugerId } = resultat;

  const brugernavn = String(formData.get("brugernavn") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!brugernavn || !password) {
    return { fejl: "Udfyld både brugernavn og password." };
  }

  const test = await testCvrForbindelse(brugernavn, password);

  const { error } = await supabase
    .from("cvr_forbindelse")
    .update({
      brugernavn,
      password,
      forbundet_af: brugerId,
      forbundet_tidspunkt: new Date().toISOString(),
      sidst_testet: new Date().toISOString(),
      sidst_test_ok: test.ok,
      sidst_test_besked: test.besked,
    })
    .eq("id", true);

  if (error) return { fejl: error.message };

  revalidatePath("/", "layout");
  return { ok: true, testBesked: test.besked };
}

// Kører en frisk test mod de allerede gemte credentials - bruges af
// "Test forbindelse"-knappen uden at brugeren skal skrive password igen.
export async function afproevCvrForbindelse(): Promise<{ fejl?: string; besked?: string; ok?: boolean }> {
  const resultat = await kraevEjer();
  if ("fejl" in resultat) return { fejl: resultat.fejl };
  const { supabase } = resultat;

  const { data: forbindelse } = await supabase
    .from("cvr_forbindelse")
    .select("brugernavn, password")
    .eq("id", true)
    .single();

  if (!forbindelse?.brugernavn || !forbindelse.password) {
    return { fejl: "Ingen CVR-forbindelse er gemt endnu." };
  }

  const test = await testCvrForbindelse(forbindelse.brugernavn, forbindelse.password);

  await supabase
    .from("cvr_forbindelse")
    .update({
      sidst_testet: new Date().toISOString(),
      sidst_test_ok: test.ok,
      sidst_test_besked: test.besked,
    })
    .eq("id", true);

  revalidatePath("/", "layout");
  return { ok: test.ok, besked: test.besked };
}

export async function fjernCvrForbindelse(): Promise<{ fejl?: string; ok?: boolean }> {
  const resultat = await kraevEjer();
  if ("fejl" in resultat) return { fejl: resultat.fejl };
  const { supabase } = resultat;

  const { error } = await supabase
    .from("cvr_forbindelse")
    .update({
      brugernavn: null,
      password: null,
      forbundet_af: null,
      forbundet_tidspunkt: null,
      sidst_testet: null,
      sidst_test_ok: null,
      sidst_test_besked: null,
    })
    .eq("id", true);

  if (error) return { fejl: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

// Etape 8 (Spec.md "4B. OSINT") - "identificér jer med en ærlig User-Agent
// med kontakt-e-mail". Brugeren bad eksplicit om at kunne tilføje adressen
// senere via en indstilling, i stedet for at Claude gætter eller hardcoder
// en (2026-08-26) - uden en adresse her nægter lib/signaler/hentSignaler.ts
// helt at hente noget.
export async function opdaterOsintKontaktEmail(
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
    return { fejl: "Kun ejere kan ændre kontakt-e-mailen." };
  }

  const email = String(formData.get("osint_kontakt_email") ?? "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { fejl: "Det ligner ikke en gyldig e-mailadresse." };
  }

  const { error } = await supabase
    .from("konfiguration")
    .update({ osint_kontakt_email: email || null })
    .eq("id", true);

  if (error) return { fejl: error.message };

  revalidatePath("/", "layout");
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
