// Etape 10B (Spec.md "F. Rapport") - "Eksport til CSV." Generisk, genbrugelig
// CSV-formattering - ingen afhængighed af rapportens egne datatyper, så den
// kan bruges til andre eksporter senere.

// Escaper efter RFC 4180: felter der indeholder komma, anførselstegn eller
// linjeskift pakkes i "..." med interne anførselstegn fordoblet. Alt andet
// efterlades urørt, så almindelige tal/tekster ikke unødigt citeres.
function csvFelt(vaerdi: unknown): string {
  const tekst = vaerdi === null || vaerdi === undefined ? "" : String(vaerdi);
  if (/[",\n\r]/.test(tekst)) {
    return `"${tekst.replace(/"/g, '""')}"`;
  }
  return tekst;
}

export function tilCsv(headere: string[], raekker: unknown[][]): string {
  const linjer = [headere, ...raekker].map((raekke) => raekke.map(csvFelt).join(","));
  // \r\n er CSV-standarden (RFC 4180) - Excel på Windows fejlfortolker
  // ellers linjeskift i nogle lokaliteter.
  return linjer.join("\r\n");
}
