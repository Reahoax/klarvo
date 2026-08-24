// Etape 11 — CVR-søgning. Bruger "virksomhedMetadata" (Erhvervsstyrelsens egen
// denormaliserede "nyeste værdi"-opsummering på hvert virksomhedsdokument) i
// stedet for de fulde tidsserie-arrays (navne, beliggenhedsadresse osv.), som
// kræver at man selv finder den gyldige periode. Se README "CVR
// system-til-system-adgang" for hvordan basis-URL og alias-struktur blev
// bekræftet ved rigtige kald, inkl. hvorfor "sammensatStatus" bruges som
// aktiv-filter frem for "nyesteStatus" (som ofte er null på ældre virksomheder).
const CVR_BASIS_URL = "http://distribution.virk.dk/cvr-permanent";

// Et enkelt from+size-kald må maks dække 3000 (bekræftet i mapping-metadata) -
// derfor sorteres og pagineres der med search_after (se koerCvrImport i
// lib/cvr/importer.ts for selve gennemløbet på tværs af flere kald/nætter).
export const CVR_MAKS_RESULTAT_VINDUE = 3000;

export type CvrSoegeParametre = {
  virksomhedsformer?: string[]; // fx ["APS", "A/S"] - kortBeskrivelse-værdier, se lib/cvr/mapning.ts
  size?: number;
  // Sidste cvrNummer fra forrige side - Elasticsearchs search_after-mekanisme.
  // Statsløs (modsat Scroll API), så den fungerer fint på tværs af cron-kørsler
  // med et døgns mellemrum, uden en udløbende server-side tilstand.
  efterCvrNummer?: string;
};

export type CvrSoegeResultat =
  | { ok: true; total: number; virksomheder: unknown[]; sidsteCvrNummer: string | null }
  | { ok: false; besked: string };

export async function sogVirksomheder(
  brugernavn: string,
  password: string,
  parametre: CvrSoegeParametre = {}
): Promise<CvrSoegeResultat> {
  const basicAuth = Buffer.from(`${brugernavn}:${password}`).toString("base64");

  const must: unknown[] = [
    { match: { "Vrvirksomhed.virksomhedMetadata.sammensatStatus": "NORMAL" } },
  ];
  if (parametre.virksomhedsformer?.length) {
    // Feltet er analyseret tekst uden .keyword-underfelt (bekræftet i den
    // rigtige mapping) - den danske analyzer lowercaser alt, så en "terms"
    // (eksakt match) kræver at søgeværdierne allerede er små bogstaver.
    must.push({
      terms: {
        "Vrvirksomhed.virksomhedMetadata.nyesteVirksomhedsform.kortBeskrivelse":
          parametre.virksomhedsformer.map((v) => v.toLowerCase()),
      },
    });
  }

  const body: Record<string, unknown> = {
    query: { bool: { must } },
    sort: [{ "Vrvirksomhed.cvrNummer": "asc" }],
    size: parametre.size ?? 50,
    _source: ["Vrvirksomhed"],
  };
  if (parametre.efterCvrNummer) {
    body.search_after = [parametre.efterCvrNummer];
  }

  try {
    const res = await fetch(`${CVR_BASIS_URL}/_search`, {
      method: "POST",
      headers: { Authorization: `Basic ${basicAuth}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const tekst = await res.text();
      return { ok: false, besked: `HTTP ${res.status}: ${tekst.slice(0, 500)}` };
    }

    const json = await res.json();
    const total = json.hits?.total?.value ?? json.hits?.total ?? 0;
    const traeffere: { _source: { Vrvirksomhed?: { cvrNummer?: unknown } }; sort?: unknown[] }[] =
      json.hits?.hits ?? [];

    const virksomheder = traeffere
      .map((h) => h._source.Vrvirksomhed)
      .filter((v: unknown) => v !== undefined);

    const sidste = traeffere.length > 0 ? traeffere[traeffere.length - 1] : null;
    const sidsteCvrNummer = sidste ? String(sidste._source.Vrvirksomhed?.cvrNummer ?? "") || null : null;

    return { ok: true, total, virksomheder, sidsteCvrNummer };
  } catch (fejl) {
    return { ok: false, besked: fejl instanceof Error ? fejl.message : "Ukendt fejl." };
  }
}
