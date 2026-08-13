import { normaliserTelefon } from "./telefon.ts";

// Etape 2 — CSV-import. Forventede kolonner matcher datamodellen i Spec.md afsnit 3.
// Rigtige udtræksfiler fra cvr.dk kan have andre kolonnenavne end dem, vi har gættet på her -
// ALIASER udvides, når vi ser en rigtig fil, i stedet for at gætte på det nu.
const ALIASER: Record<string, string[]> = {
  cvr_nummer: ["cvr_nummer", "cvr-nummer", "cvrnummer", "cvr"],
  virksomhedsnavn: ["virksomhedsnavn", "navn", "firmanavn"],
  virksomhedsform: ["virksomhedsform", "form", "virksomhedstype"],
  branchekode: ["branchekode"],
  branchetekst: ["branchetekst", "branche"],
  antal_ansatte: ["antal_ansatte", "antal ansatte", "ansatte"],
  status: ["status", "virksomhedsstatus"],
  adresse: ["adresse"],
  postnr: ["postnr", "postnummer"],
  by: ["by", "postdistrikt"],
  telefon: ["telefon", "tlf", "telefonnummer"],
  website: ["website", "hjemmeside", "url"],
  reklamebeskyttelse: ["reklamebeskyttelse", "reklame_beskyttelse"],
};

function normaliserHeader(header: string): string {
  return header.trim().toLowerCase();
}

function findFeltNoegle(headerNavn: string): string | null {
  const norm = normaliserHeader(headerNavn);
  for (const [felt, aliaser] of Object.entries(ALIASER)) {
    if (aliaser.includes(norm)) return felt;
  }
  return null;
}

// Slår en CSV-rækkes rå felter (som papaparse leverer, keyet på originale kolonnenavne)
// om til vores interne feltnavne, uanset hvilken af aliaserne ovenfor filen bruger.
export function omdoebFelter(raaRaekke: Record<string, string>): Record<string, string> {
  const resultat: Record<string, string> = {};
  for (const [header, vaerdi] of Object.entries(raaRaekke)) {
    const felt = findFeltNoegle(header);
    if (felt) resultat[felt] = (vaerdi ?? "").trim();
  }
  return resultat;
}

function parseReklamebeskyttelse(raa: string | undefined): boolean {
  if (!raa) return false;
  const v = raa.trim().toLowerCase();
  return v === "ja" || v === "true" || v === "1" || v === "j";
}

function parseAntalAnsatte(raa: string | undefined): number | null {
  if (!raa) return null;
  const tal = Number.parseInt(raa.replace(/\D/g, ""), 10);
  return Number.isFinite(tal) && tal >= 0 ? tal : null;
}

export type KlarLeadRaekke = {
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

export type FrasorteretRaekke = {
  raekkenummer: number;
  cvr_nummer: string | null;
  aarsag: string;
};

export type ImportAdvarsel = {
  raekkenummer: number;
  cvr_nummer: string;
  besked: string;
};

export type ImportResultat = {
  klar: KlarLeadRaekke[];
  frasorteret: FrasorteretRaekke[];
  advarsler: ImportAdvarsel[];
  muligeDubletter: { navn: string; postnr: string; cvrNumre: string[] }[];
};

export type ImportKonfiguration = {
  tilladteVirksomhedsformer: string[];
};

const CVR_REGEX = /^\d{8}$/;

// Kernen i importfilteret (R1, R3, R4). R1 er implicit opfyldt: funktionen tager kun imod data,
// der allerede er hentet - den henter ikke selv noget, og kan derfor ikke scrape.
// R3 håndhæves ikke her, men af databasetriggeren beregn_lead_felter() ved selve indsættelsen.
export function filtrerOgValidérImport(
  raaRaekker: Record<string, string>[],
  konfiguration: ImportKonfiguration
): ImportResultat {
  const klar: KlarLeadRaekke[] = [];
  const frasorteret: FrasorteretRaekke[] = [];
  const advarsler: ImportAdvarsel[] = [];
  const seteCvrNumreIDenneImport = new Set<string>();
  const navnPostnrTilCvr = new Map<string, Set<string>>();

  raaRaekker.forEach((raaRaekke, index) => {
    const raekkenummer = index + 2; // +2: række 1 er header, mennesker tæller fra 1
    const felter = omdoebFelter(raaRaekke);

    const cvrNummer = (felter.cvr_nummer ?? "").replace(/\D/g, "");
    if (!CVR_REGEX.test(cvrNummer)) {
      frasorteret.push({
        raekkenummer,
        cvr_nummer: felter.cvr_nummer || null,
        aarsag: "Ugyldigt CVR-nummer (skal være 8 cifre)",
      });
      return;
    }

    if (seteCvrNumreIDenneImport.has(cvrNummer)) {
      frasorteret.push({
        raekkenummer,
        cvr_nummer: cvrNummer,
        aarsag: "CVR-nummer optræder flere gange i samme fil",
      });
      return;
    }

    if (!felter.virksomhedsnavn) {
      frasorteret.push({
        raekkenummer,
        cvr_nummer: cvrNummer,
        aarsag: "Mangler virksomhedsnavn",
      });
      return;
    }

    if (!felter.virksomhedsform) {
      frasorteret.push({
        raekkenummer,
        cvr_nummer: cvrNummer,
        aarsag: "Mangler virksomhedsform",
      });
      return;
    }

    if (!konfiguration.tilladteVirksomhedsformer.includes(felter.virksomhedsform)) {
      frasorteret.push({
        raekkenummer,
        cvr_nummer: cvrNummer,
        aarsag: `Virksomhedsform "${felter.virksomhedsform}" er ikke på den tilladte liste`,
      });
      return;
    }

    if (!felter.status) {
      frasorteret.push({
        raekkenummer,
        cvr_nummer: cvrNummer,
        aarsag: "Mangler status",
      });
      return;
    }

    seteCvrNumreIDenneImport.add(cvrNummer);

    const telefonRaa = felter.telefon || undefined;
    const telefon = normaliserTelefon(telefonRaa);
    if (telefonRaa && !telefon) {
      advarsler.push({
        raekkenummer,
        cvr_nummer: cvrNummer,
        besked: `Telefonnummer "${telefonRaa}" kunne ikke tolkes som et dansk nummer og blev sat til tomt`,
      });
    }

    const antalAnsatteRaa = felter.antal_ansatte || undefined;
    const antalAnsatte = parseAntalAnsatte(antalAnsatteRaa);
    if (antalAnsatteRaa && antalAnsatte === null) {
      advarsler.push({
        raekkenummer,
        cvr_nummer: cvrNummer,
        besked: `Antal ansatte "${antalAnsatteRaa}" kunne ikke tolkes som et tal og blev sat til tomt`,
      });
    }

    if (felter.postnr && felter.virksomhedsnavn) {
      const noegle = `${felter.virksomhedsnavn.trim().toLowerCase()}::${felter.postnr.trim()}`;
      const eksisterende = navnPostnrTilCvr.get(noegle) ?? new Set<string>();
      eksisterende.add(cvrNummer);
      navnPostnrTilCvr.set(noegle, eksisterende);
    }

    klar.push({
      cvr_nummer: cvrNummer,
      virksomhedsnavn: felter.virksomhedsnavn,
      virksomhedsform: felter.virksomhedsform,
      branchekode: felter.branchekode || null,
      branchetekst: felter.branchetekst || null,
      antal_ansatte: antalAnsatte,
      status: felter.status,
      adresse: felter.adresse || null,
      postnr: felter.postnr || null,
      by: felter.by || null,
      telefon,
      website: felter.website || null,
      reklamebeskyttelse: parseReklamebeskyttelse(felter.reklamebeskyttelse),
      kilde: "csv_import",
    });
  });

  const muligeDubletter: ImportResultat["muligeDubletter"] = [];
  for (const [noegle, cvrSet] of navnPostnrTilCvr.entries()) {
    if (cvrSet.size > 1) {
      const [navn, postnr] = noegle.split("::");
      muligeDubletter.push({ navn, postnr, cvrNumre: [...cvrSet] });
    }
  }

  return { klar, frasorteret, advarsler, muligeDubletter };
}
