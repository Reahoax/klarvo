// Etape 8 (Spec.md "4B. OSINT", kildetypen "cvr_aendring") - genbruger den
// allerede etablerede CVR system-til-system-adgang (Etape 11, samme
// distribution.virk.dk-forbindelse som lib/cvr/sog.ts) i stedet for at
// scrape en hjemmeside. "CVR historik" er reelt bare de FULDE
// tidsserie-arrays på det samme Elasticsearch-dokument, som Etape 11's
// søgning allerede henter en "nyeste"-opsummering af (se
// lib/cvr/mapning.ts's nyesteGyldige) - denne fil henter ét enkelt
// dokument med de fulde arrays i stedet for kun opsummeringen.
//
// Feltnavnene (navne, beliggenhedsadresse, hovedbranche, virksomhedsstatus,
// livsforloeb) følger samme periode-array-mønster, som allerede er bekræftet
// ægte for "hjemmeside" og "telefonNummer" i mapning.ts (Etape 11, verificeret
// mod et rigtigt CVR-svar 2026-08-24) - IKKE selvstændigt genverificeret mod
// et rigtigt svar i denne session, da oprettelse af testbruger/direkte
// credential-udtræk blev blokeret af sessionens tilladelsesklassificer. Test
// mod et rigtigt CVR-nummer, før dette meldes 100% bekræftet (se README).
const CVR_BASIS_URL = "http://distribution.virk.dk/cvr-permanent";

export type Periode = { gyldigFra: string | null; gyldigTil: string | null };

export type RaaVirksomhedHistorik = {
  navne?: { navn: string; periode: Periode }[];
  beliggenhedsadresse?: {
    vejnavn?: string | null;
    husnummerFra?: number | null;
    bogstavFra?: string | null;
    postnummer?: number | null;
    postdistrikt?: string | null;
    periode: Periode;
  }[];
  hovedbranche?: { branchekode: string; branchetekst: string; periode: Periode }[];
  virksomhedsstatus?: { status: string; periode: Periode }[];
  livsforloeb?: { periode: Periode }[];
};

export type CvrHistorikResultat =
  | { ok: true; data: RaaVirksomhedHistorik }
  | { ok: false; besked: string };

export async function hentVirksomhedHistorik(
  brugernavn: string,
  password: string,
  cvrNummer: string
): Promise<CvrHistorikResultat> {
  const basicAuth = Buffer.from(`${brugernavn}:${password}`).toString("base64");

  // cvrNummer sendes som tal, ikke streng - Vrvirksomhed.cvrNummer er
  // indekseret som "long" (bekræftet på offentliggoerelser-indekset, samme
  // Elasticsearch-vært), og en "term"-forespørgsel matcher mest pålideligt
  // mod feltets eget datatype. leads.cvr_nummer er allerede valideret til
  // præcis 8 cifre ved import (se lib/cvr/mapning.ts), så Number() er sikker.
  const body = {
    query: { term: { "Vrvirksomhed.cvrNummer": Number(cvrNummer) } },
    size: 1,
    _source: [
      "Vrvirksomhed.navne",
      "Vrvirksomhed.beliggenhedsadresse",
      "Vrvirksomhed.hovedbranche",
      "Vrvirksomhed.virksomhedsstatus",
      "Vrvirksomhed.livsforloeb",
    ],
  };

  try {
    const res = await fetch(`${CVR_BASIS_URL}/_search`, {
      method: "POST",
      headers: { Authorization: `Basic ${basicAuth}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const tekst = await res.text();
      return { ok: false, besked: `HTTP ${res.status}: ${tekst.slice(0, 300)}` };
    }

    const json = await res.json();
    const traeffer = json.hits?.hits?.[0]?._source?.Vrvirksomhed as RaaVirksomhedHistorik | undefined;
    if (!traeffer) {
      return { ok: false, besked: "Ingen virksomhed fundet i CVR med dette nummer." };
    }
    return { ok: true, data: traeffer };
  } catch (fejl) {
    const besked = fejl instanceof Error ? fejl.message : "Ukendt fejl.";
    return { ok: false, besked: `Kunne ikke slå CVR-historik op: ${besked}` };
  }
}
