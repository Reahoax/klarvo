import type { SupabaseClient } from "@supabase/supabase-js";
import { udtraekDomaene } from "./domaene.ts";
import { parseRobotsTxt, erTilladt, type RobotsRegelsaet } from "./robots.ts";
import { uddragTitelOgBeskrivelse } from "./uddrag.ts";
import { findKarriereLink } from "./karriere.ts";
import { skalVente, erSignalFrisk } from "./tidsregler.ts";

// Etape 8 (Spec.md "4B. OSINT") - de to første kildetyper, "website" og
// "jobopslag", hentes samlet i ét kald: jobopslag-linket findes ved at lede i
// forsidens HTML, så de to nødvendigvis deler ét robots.txt-opslag og ét
// rate-limit-tidsstempel pr. domæne (se README "Etape 8" for hvorfor det
// tælles som én "operation" mod domænet, ikke to). De øvrige fire tilladte
// kildetyper (regnskab, cvr_aendring, presse, anmeldelse) er ikke bygget
// endnu, jf. specens egen "én kildetype ad gangen".
const USER_AGENT_NAVN = "Klarvo-signalindsamling";
const TIDSGRAENSE_MS = 8_000;
const MAKS_TEGN = 2_000_000; // loft på hvert HTML-svar - ingen ubegrænset download

export type EnkeltSignalResultat =
  | { ok: true; genbrugtFraCache: boolean; vaerdi: string; kildeUrl: string }
  | { ok: false; besked: string };

export type SamletSignalResultat = {
  website: EnkeltSignalResultat;
  jobopslag: EnkeltSignalResultat;
};

type CachetSignal = { vaerdi: string; kilde_url: string; hentet_dato: string };

async function hentFriskCache(
  supabase: SupabaseClient,
  leadId: string,
  type: "website" | "jobopslag"
): Promise<CachetSignal | null> {
  const { data } = await supabase
    .from("signaler")
    .select("vaerdi, kilde_url, hentet_dato")
    .eq("lead_id", leadId)
    .eq("type", type)
    .order("hentet_dato", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data?.vaerdi && erSignalFrisk(new Date(data.hentet_dato))) return data;
  return null;
}

function stiFraUrl(url: string): string {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return "/";
  }
}

async function hentSideOgUddrag(
  url: string,
  userAgent: string,
  robotsRegelsaet: RobotsRegelsaet,
  domaene: string
): Promise<{ ok: true; html: string; titel: string | null; beskrivelse: string | null } | { ok: false; besked: string }> {
  if (!erTilladt(robotsRegelsaet, userAgent, stiFraUrl(url))) {
    return { ok: false, besked: `${domaene}s robots.txt forbyder at hente denne side.` };
  }
  try {
    const res = await fetch(url, { headers: { "User-Agent": userAgent }, signal: AbortSignal.timeout(TIDSGRAENSE_MS) });
    if (!res.ok) return { ok: false, besked: `${domaene} svarede med status ${res.status}.` };
    const html = (await res.text()).slice(0, MAKS_TEGN);
    const { titel, beskrivelse } = uddragTitelOgBeskrivelse(html);
    if (!titel && !beskrivelse) {
      return { ok: false, besked: "Siden blev hentet, men indeholdt hverken titel eller beskrivelse." };
    }
    return { ok: true, html, titel, beskrivelse };
  } catch (fejl) {
    const besked = fejl instanceof Error ? fejl.message : "Ukendt fejl.";
    console.error(`Kunne ikke hente side for ${domaene}:`, besked);
    return { ok: false, besked: `Kunne ikke hente ${domaene}: ${besked}` };
  }
}

// Henter "website"- og "jobopslag"-signaler for ét lead. Rækkefølgen er
// bevidst: 1) konfiguration, 2) cache pr. type (springer HELE operationen
// over, hvis begge allerede er friske - rører ikke rate-limit-tabellen
// unødigt), 3) tjek/lås rate limit ÉN gang for begge, 4) robots.txt, 5) hent
// forsiden og udled jobopslag-linket fra dens HTML, 6) hent evt. karrieresiden.
export async function hentSignalerForLead(
  supabase: SupabaseClient,
  leadId: string,
  websiteRaa: string
): Promise<SamletSignalResultat> {
  const { data: konfiguration } = await supabase
    .from("konfiguration")
    .select("osint_kontakt_email")
    .eq("id", true)
    .single();

  const kontaktEmail: string | null = konfiguration?.osint_kontakt_email ?? null;
  if (!kontaktEmail) {
    const fejl: EnkeltSignalResultat = {
      ok: false,
      besked:
        "Ingen kontakt-e-mail er sat endnu. Tilføj én under Indstillinger → Integrationer, før signaler kan hentes.",
    };
    return { website: fejl, jobopslag: fejl };
  }

  const domaene = udtraekDomaene(websiteRaa);
  if (!domaene) {
    const fejl: EnkeltSignalResultat = { ok: false, besked: "Ugyldig hjemmeside-URL - kan ikke udtrække et domæne." };
    return { website: fejl, jobopslag: fejl };
  }

  const websiteCache = await hentFriskCache(supabase, leadId, "website");
  const jobopslagCache = await hentFriskCache(supabase, leadId, "jobopslag");
  const somCacheResultat = (c: CachetSignal): EnkeltSignalResultat => ({
    ok: true,
    genbrugtFraCache: true,
    vaerdi: c.vaerdi,
    kildeUrl: c.kilde_url,
  });

  if (websiteCache && jobopslagCache) {
    return { website: somCacheResultat(websiteCache), jobopslag: somCacheResultat(jobopslagCache) };
  }

  const { data: domaeneRaekke } = await supabase
    .from("signal_domaener")
    .select("sidst_hentet")
    .eq("domaene", domaene)
    .maybeSingle();

  if (skalVente(domaeneRaekke ? new Date(domaeneRaekke.sidst_hentet) : null)) {
    const ventFejl: EnkeltSignalResultat = {
      ok: false,
      besked: `${domaene} blev tjekket for under 5 sekunder siden - prøv igen om lidt.`,
    };
    return {
      website: websiteCache ? somCacheResultat(websiteCache) : ventFejl,
      jobopslag: jobopslagCache ? somCacheResultat(jobopslagCache) : ventFejl,
    };
  }

  // Slotten låses FØR noget som helst netværkskald sendes.
  await supabase.from("signal_domaener").upsert({ domaene, sidst_hentet: new Date().toISOString() });

  const userAgent = `${USER_AGENT_NAVN} (+mailto:${kontaktEmail})`;
  const hjemmesideUrl = /^[a-z]+:\/\//i.test(websiteRaa.trim()) ? websiteRaa.trim() : `https://${websiteRaa.trim()}`;

  let robotsRegelsaet: RobotsRegelsaet;
  try {
    const robotsRes = await fetch(`https://${domaene}/robots.txt`, {
      headers: { "User-Agent": userAgent },
      signal: AbortSignal.timeout(TIDSGRAENSE_MS),
    });
    robotsRegelsaet = robotsRes.ok ? parseRobotsTxt(await robotsRes.text()) : parseRobotsTxt("");
  } catch {
    robotsRegelsaet = parseRobotsTxt("");
  }

  let websiteResultat: EnkeltSignalResultat;
  let hjemmesideHtml: string | null = null;

  if (websiteCache) {
    websiteResultat = somCacheResultat(websiteCache);
  } else {
    const uddrag = await hentSideOgUddrag(hjemmesideUrl, userAgent, robotsRegelsaet, domaene);
    if (!uddrag.ok) {
      websiteResultat = uddrag;
    } else {
      hjemmesideHtml = uddrag.html;
      const vaerdi = [uddrag.titel, uddrag.beskrivelse].filter(Boolean).join(" — ");
      await supabase.from("signaler").insert({
        lead_id: leadId,
        type: "website",
        vaerdi,
        kilde_url: hjemmesideUrl,
        hentet_dato: new Date().toISOString(),
        vaegt: 1, // ikke brugt endnu - afventer signalbaseret vægtning i Matching (Etape 9)
      });
      websiteResultat = { ok: true, genbrugtFraCache: false, vaerdi, kildeUrl: hjemmesideUrl };
    }
  }

  let jobopslagResultat: EnkeltSignalResultat;
  if (jobopslagCache) {
    jobopslagResultat = somCacheResultat(jobopslagCache);
  } else if (!hjemmesideHtml) {
    jobopslagResultat = { ok: false, besked: "Kunne ikke lede efter en karriereside, da forsiden ikke blev hentet korrekt." };
  } else {
    const karriereUrl = findKarriereLink(hjemmesideHtml, hjemmesideUrl);
    if (!karriereUrl) {
      jobopslagResultat = { ok: false, besked: "Fandt intet karriere-/jobside-link på forsiden." };
    } else if (udtraekDomaene(karriereUrl) !== domaene) {
      jobopslagResultat = { ok: false, besked: "Det fundne karriere-link peger på et andet domæne - springes over." };
    } else {
      const uddrag = await hentSideOgUddrag(karriereUrl, userAgent, robotsRegelsaet, domaene);
      if (!uddrag.ok) {
        jobopslagResultat = uddrag;
      } else {
        const vaerdi = [uddrag.titel, uddrag.beskrivelse].filter(Boolean).join(" — ");
        await supabase.from("signaler").insert({
          lead_id: leadId,
          type: "jobopslag",
          vaerdi,
          kilde_url: karriereUrl,
          hentet_dato: new Date().toISOString(),
          vaegt: 1,
        });
        jobopslagResultat = { ok: true, genbrugtFraCache: false, vaerdi, kildeUrl: karriereUrl };
      }
    }
  }

  return { website: websiteResultat, jobopslag: jobopslagResultat };
}
