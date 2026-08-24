// Etape 11 — CVR-søgning. Bruger "virksomhedMetadata" (Erhvervsstyrelsens egen
// denormaliserede "nyeste værdi"-opsummering på hvert virksomhedsdokument) i
// stedet for de fulde tidsserie-arrays (navne, beliggenhedsadresse osv.), som
// kræver at man selv finder den gyldige periode. Se README "CVR
// system-til-system-adgang" for hvordan basis-URL og alias-struktur blev
// bekræftet ved rigtige kald, inkl. hvorfor "sammensatStatus" bruges som
// aktiv-filter frem for "nyesteStatus" (som ofte er null på ældre virksomheder).
const CVR_BASIS_URL = "http://distribution.virk.dk/cvr-permanent";

// from + size må maks. være 3000 tilsammen (bekræftet i mapping-metadata) -
// større uddrag kræver Elasticsearchs Scroll API, som ikke er bygget endnu.
export const CVR_MAKS_RESULTAT_VINDUE = 3000;

export type CvrSoegeParametre = {
  virksomhedsformer?: string[]; // fx ["APS", "A/S"] - kortBeskrivelse-værdier, se lib/cvr/mapning.ts
  fra?: number;
  size?: number;
};

export type CvrSoegeResultat =
  | { ok: true; total: number; virksomheder: unknown[] }
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

  const body = {
    query: { bool: { must } },
    from: parametre.fra ?? 0,
    size: parametre.size ?? 50,
    _source: ["Vrvirksomhed"],
  };

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
    const virksomheder = (json.hits?.hits ?? [])
      .map((h: { _source: { Vrvirksomhed?: unknown } }) => h._source.Vrvirksomhed)
      .filter((v: unknown) => v !== undefined);

    return { ok: true, total, virksomheder };
  } catch (fejl) {
    return { ok: false, besked: fejl instanceof Error ? fejl.message : "Ukendt fejl." };
  }
}
