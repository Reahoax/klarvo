import { normaliserTelefon } from "../leads/telefon.ts";

// Etape 11 — slår ét rå CVR-virksomhedsdokument (Vrvirksomhed, som det
// returneres af lib/cvr/sog.ts) om til den samme rækkeform, som CSV-importen
// bruger (se lib/leads/import.ts's KlarLeadRaekke) - så leads-tabellen,
// beregn_lead_felter()-triggeren og resten af pipelinen er identisk uanset
// kilde. Feltnavnene her er bekræftet mod et rigtigt CVR-svar 2026-08-24
// (se README "CVR system-til-system-adgang"), IKKE kun gættet fra mapping-
// skemaet - "reklamebeskyttet" (ikke "reklamebeskyttelse") er fx et rigtigt
// eksempel på en detalje, der først blev tydelig ved at se et ægte dokument.

type Periode = { gyldigFra: string | null; gyldigTil: string | null };
type MedPeriode = { periode: Periode };

// Finder den for øjeblikket gyldige post i en tidsserie (gyldigTil: null),
// eller den nyeste hvis ingen aktuelt er gyldig (fx en ophørt virksomhed).
function nyesteGyldige<T extends MedPeriode>(liste: T[] | undefined | null): T | undefined {
  if (!liste || liste.length === 0) return undefined;
  const aktuel = liste.find((p) => p.periode?.gyldigTil === null);
  if (aktuel) return aktuel;
  return [...liste].sort((a, b) => (b.periode?.gyldigFra ?? "").localeCompare(a.periode?.gyldigFra ?? ""))[0];
}

export type RaaVirksomhed = {
  cvrNummer?: number | string;
  reklamebeskyttet?: boolean;
  telefonNummer?: { kontaktoplysning: string; periode: Periode }[];
  hjemmeside?: { kontaktoplysning: string; periode: Periode }[];
  virksomhedMetadata?: {
    sammensatStatus?: string | null;
    nyesteNavn?: { navn: string } | null;
    nyesteVirksomhedsform?: { kortBeskrivelse: string } | null;
    nyesteHovedbranche?: { branchekode: string; branchetekst: string } | null;
    nyesteBeliggenhedsadresse?: {
      vejnavn?: string | null;
      husnummerFra?: number | null;
      bogstavFra?: string | null;
      postnummer?: number | null;
      postdistrikt?: string | null;
    } | null;
    nyesteErstMaanedsbeskaeftigelse?: { antalAnsatte?: number | null } | null;
    nyesteAarsbeskaeftigelse?: { antalAnsatte?: number | null } | null;
    nyesteKvartalsbeskaeftigelse?: { antalAnsatte?: number | null } | null;
    nyesteMaanedsbeskaeftigelse?: { antalAnsatte?: number | null } | null;
  } | null;
};

export type CvrLeadRaekke = {
  cvr_nummer: string;
  virksomhedsnavn: string;
  virksomhedsform: string;
  branchekode: string | null;
  branchetekst: string | null;
  antal_ansatte: number | null;
  status: string;
  adresse: string | null;
  postnr: string | null;
  by: string | null;
  telefon: string | null;
  website: string | null;
  reklamebeskyttelse: boolean;
  kilde: string;
};

type Adresse = NonNullable<
  NonNullable<RaaVirksomhed["virksomhedMetadata"]>["nyesteBeliggenhedsadresse"]
>;

function byggAdresse(a: Adresse | null | undefined): string | null {
  if (!a) return null;
  const husnummer = [a.husnummerFra, a.bogstavFra].filter(Boolean).join("");
  const dele = [a.vejnavn, husnummer].filter(Boolean);
  return dele.length > 0 ? dele.join(" ") : null;
}

// Returnerer null hvis dokumentet mangler data, der er strengt nødvendig for
// et lead (cvr-nummer eller navn) - samme filosofi som CSV-importens
// frasortering af rækker uden de felter.
export function mapVirksomhedTilLead(raa: RaaVirksomhed): CvrLeadRaekke | null {
  const cvrNummer = String(raa.cvrNummer ?? "").trim();
  const navn = raa.virksomhedMetadata?.nyesteNavn?.navn?.trim();
  if (!/^\d{8}$/.test(cvrNummer) || !navn) return null;

  const adresseObj = raa.virksomhedMetadata?.nyesteBeliggenhedsadresse;
  const antalAnsatte =
    raa.virksomhedMetadata?.nyesteErstMaanedsbeskaeftigelse?.antalAnsatte ??
    raa.virksomhedMetadata?.nyesteAarsbeskaeftigelse?.antalAnsatte ??
    raa.virksomhedMetadata?.nyesteKvartalsbeskaeftigelse?.antalAnsatte ??
    raa.virksomhedMetadata?.nyesteMaanedsbeskaeftigelse?.antalAnsatte ??
    null;

  const telefon = normaliserTelefon(nyesteGyldige(raa.telefonNummer)?.kontaktoplysning);
  const website = nyesteGyldige(raa.hjemmeside)?.kontaktoplysning ?? null;

  return {
    cvr_nummer: cvrNummer,
    virksomhedsnavn: navn,
    virksomhedsform: raa.virksomhedMetadata?.nyesteVirksomhedsform?.kortBeskrivelse ?? "",
    branchekode: raa.virksomhedMetadata?.nyesteHovedbranche?.branchekode ?? null,
    branchetekst: raa.virksomhedMetadata?.nyesteHovedbranche?.branchetekst ?? null,
    antal_ansatte: antalAnsatte,
    status: raa.virksomhedMetadata?.sammensatStatus ?? "",
    adresse: byggAdresse(adresseObj),
    postnr: adresseObj?.postnummer != null ? String(adresseObj.postnummer) : null,
    by: adresseObj?.postdistrikt ?? null,
    telefon,
    website,
    reklamebeskyttelse: raa.reklamebeskyttet ?? false,
    kilde: "cvr_api",
  };
}
