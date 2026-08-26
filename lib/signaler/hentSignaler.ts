import type { SupabaseClient } from "@supabase/supabase-js";
import { udtraekDomaene } from "./domaene.ts";
import { parseRobotsTxt, erTilladt } from "./robots.ts";
import { uddragTitelOgBeskrivelse } from "./uddrag.ts";
import { skalVente, erSignalFrisk } from "./tidsregler.ts";

// Etape 8 (Spec.md "4B. OSINT") - starter med "website", den første af de to
// kilder specen nævner at starte med ("jobopslag og website"). Jobopslag
// kræver at kunne FINDE en karriereside på vilkårlig HTML først, hvilket er
// en selvstændig, større opgave - bevidst udskudt til næste kildetype, jf.
// "hentning fra de tilladte kilder, én kildetype ad gangen".
const USER_AGENT_NAVN = "Klarvo-signalindsamling";
const TIDSGRAENSE_MS = 8_000;
const MAKS_TEGN = 2_000_000; // et loft på selve HTML-svaret - ingen ubegrænset download

export type HentSignalResultat =
  | { ok: true; genbrugtFraCache: boolean; vaerdi: string; kildeUrl: string }
  | { ok: false; besked: string };

// Henter og gemmer ét "website"-signal for et lead. Rækkefølgen er bevidst:
// 1) tjek konfiguration, 2) tjek cache (ingen netværkskald ved cache-hit),
// 3) tjek/lås rate limit (ÉT samlet tidsstempel for robots.txt + selve
//    siden - de tælles som én "operation" mod domænet, ikke to separate
//    kald, da et robots.txt-opslag pr. definition altid går forud for
//    indholdshentningen), 4) robots.txt, 5) selve hentningen.
export async function hentWebsiteSignal(
  supabase: SupabaseClient,
  leadId: string,
  websiteRaa: string
): Promise<HentSignalResultat> {
  const { data: konfiguration } = await supabase
    .from("konfiguration")
    .select("osint_kontakt_email")
    .eq("id", true)
    .single();

  const kontaktEmail: string | null = konfiguration?.osint_kontakt_email ?? null;
  if (!kontaktEmail) {
    return {
      ok: false,
      besked:
        "Ingen kontakt-e-mail er sat endnu. Tilføj én under Indstillinger → Integrationer, før signaler kan hentes.",
    };
  }

  const domaene = udtraekDomaene(websiteRaa);
  if (!domaene) {
    return { ok: false, besked: "Ugyldig hjemmeside-URL - kan ikke udtrække et domæne." };
  }

  const { data: eksisterende } = await supabase
    .from("signaler")
    .select("vaerdi, kilde_url, hentet_dato")
    .eq("lead_id", leadId)
    .eq("type", "website")
    .order("hentet_dato", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (eksisterende?.vaerdi && erSignalFrisk(new Date(eksisterende.hentet_dato))) {
    return { ok: true, genbrugtFraCache: true, vaerdi: eksisterende.vaerdi, kildeUrl: eksisterende.kilde_url };
  }

  const { data: domaeneRaekke } = await supabase
    .from("signal_domaener")
    .select("sidst_hentet")
    .eq("domaene", domaene)
    .maybeSingle();

  if (skalVente(domaeneRaekke ? new Date(domaeneRaekke.sidst_hentet) : null)) {
    return { ok: false, besked: `${domaene} blev tjekket for under 5 sekunder siden - prøv igen om lidt.` };
  }

  // Slotten låses FØR noget som helst netværkskald sendes, så to leads på
  // samme domæne, udløst næsten samtidig, ikke begge slipper igennem.
  await supabase
    .from("signal_domaener")
    .upsert({ domaene, sidst_hentet: new Date().toISOString() });

  const userAgent = `${USER_AGENT_NAVN} (+mailto:${kontaktEmail})`;
  const hjemmesideUrl = /^[a-z]+:\/\//i.test(websiteRaa.trim()) ? websiteRaa.trim() : `https://${websiteRaa.trim()}`;

  let robotsRegelsaet;
  try {
    const robotsRes = await fetch(`https://${domaene}/robots.txt`, {
      headers: { "User-Agent": userAgent },
      signal: AbortSignal.timeout(TIDSGRAENSE_MS),
    });
    robotsRegelsaet = robotsRes.ok ? parseRobotsTxt(await robotsRes.text()) : parseRobotsTxt("");
  } catch {
    // Ingen robots.txt fundet (eller uopnåelig) - standarden er tilladt,
    // samme fallback som robots.txt-protokollen selv foreskriver.
    robotsRegelsaet = parseRobotsTxt("");
  }

  const sti = (() => {
    try {
      return new URL(hjemmesideUrl).pathname || "/";
    } catch {
      return "/";
    }
  })();

  if (!erTilladt(robotsRegelsaet, userAgent, sti)) {
    return { ok: false, besked: `${domaene}s robots.txt forbyder at hente denne side.` };
  }

  let html: string;
  try {
    const res = await fetch(hjemmesideUrl, {
      headers: { "User-Agent": userAgent },
      signal: AbortSignal.timeout(TIDSGRAENSE_MS),
    });
    if (!res.ok) {
      return { ok: false, besked: `${domaene} svarede med status ${res.status}.` };
    }
    html = (await res.text()).slice(0, MAKS_TEGN);
  } catch (fejl) {
    // "Fejler en hentning: log det, sæt feltet til null, gå videre. Aldrig
    // retry-storm" - vi gemmer ikke et fejlet forsøg som et signal, og
    // rate-limit-slotten er allerede låst, så et gentaget klik venter
    // naturligt 5 sekunder i stedet for at hamre løs.
    const besked = fejl instanceof Error ? fejl.message : "Ukendt fejl.";
    console.error(`Kunne ikke hente website-signal for ${domaene}:`, besked);
    return { ok: false, besked: `Kunne ikke hente ${domaene}: ${besked}` };
  }

  const { titel, beskrivelse } = uddragTitelOgBeskrivelse(html);
  if (!titel && !beskrivelse) {
    return { ok: false, besked: "Siden blev hentet, men indeholdt hverken titel eller beskrivelse." };
  }

  const vaerdi = [titel, beskrivelse].filter(Boolean).join(" — ");

  await supabase.from("signaler").insert({
    lead_id: leadId,
    type: "website",
    vaerdi,
    kilde_url: hjemmesideUrl,
    hentet_dato: new Date().toISOString(),
    // Ikke brugt endnu - signalbaseret vægtning i Matching (Spec.md "G")
    // afventer flere kildetyper end de to, der er bygget her.
    vaegt: 1,
  });

  return { ok: true, genbrugtFraCache: false, vaerdi, kildeUrl: hjemmesideUrl };
}
