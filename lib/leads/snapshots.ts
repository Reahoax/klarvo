// Etape 7B — Snapshots. lead_snapshots gemmer et fuldt øjebliksbillede af de
// felter, der reelt kan ændre sig ude i den virkelige verden (adresse, antal
// ansatte, status, kontaktoplysninger), hver gang et lead røres af en import.
// Det er bevidst adskilt fra activity_log: activity_log logger ALLE
// felt-ændringer fra ALLE kilder (manuel redigering, kvalificering,
// pipeline-skift OG geninport) i én fælles strøm - lead_snapshots giver i
// stedet en ren, isoleret historik af kun det, en geninport har fundet, så
// man kan se præcis hvad der ændrede sig "derude" mellem to CVR-udtræk.
export const SNAPSHOT_FELTER = [
  "virksomhedsnavn",
  "virksomhedsform",
  "branchekode",
  "branchetekst",
  "antal_ansatte",
  "status",
  "adresse",
  "postnr",
  "by",
  "telefon",
  "website",
  "reklamebeskyttelse",
] as const;

export type SnapshotFelt = (typeof SNAPSHOT_FELTER)[number];

export type SnapshotData = Record<SnapshotFelt, string | number | boolean | null>;

export type SnapshotDiff = {
  felt: SnapshotFelt;
  gammel: string | number | boolean | null;
  ny: string | number | boolean | null;
};

// Sammenligner to snapshots og returnerer kun de felter, der reelt er
// forskellige - samme "kun det, der ændrede sig"-princip som activity_log.
export function beregnSnapshotDiff(gammel: SnapshotData, ny: SnapshotData): SnapshotDiff[] {
  const diff: SnapshotDiff[] = [];
  for (const felt of SNAPSHOT_FELTER) {
    if (gammel[felt] !== ny[felt]) {
      diff.push({ felt, gammel: gammel[felt], ny: ny[felt] });
    }
  }
  return diff;
}

export const SNAPSHOT_FELT_LABEL: Record<SnapshotFelt, string> = {
  virksomhedsnavn: "Virksomhedsnavn",
  virksomhedsform: "Virksomhedsform",
  branchekode: "Branchekode",
  branchetekst: "Branchetekst",
  antal_ansatte: "Antal ansatte",
  status: "Status",
  adresse: "Adresse",
  postnr: "Postnr",
  by: "By",
  telefon: "Telefon",
  website: "Website",
  reklamebeskyttelse: "Reklamebeskyttelse",
};
