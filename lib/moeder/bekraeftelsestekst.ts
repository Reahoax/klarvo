// Etape 10 — Bookingflow (Spec.md 2A, skærmbillede H): "Systemet genererer en
// bekræftelsestekst, som et menneske sender." Vi sender aldrig selv noget -
// denne funktion returnerer kun teksten, som vises til brugeren til at
// kopiere og sende manuelt (fx via mail eller SMS).

export type MoedeForm = "fysisk" | "online" | "telefon";

export type BekraeftelsesParametre = {
  virksomhedsnavn: string;
  deltagerNavn: string;
  datoTid: string; // ISO-streng
  form: MoedeForm;
  kontekstnote?: string | null;
};

const FORM_BESKRIVELSE: Record<MoedeForm, string> = {
  fysisk: "et fysisk møde",
  online: "et online-møde",
  telefon: "en telefonsamtale",
};

export function genererBekraeftelsestekst(p: BekraeftelsesParametre): string {
  const dato = new Date(p.datoTid).toLocaleString("da-DK", {
    timeZone: "Europe/Copenhagen",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  const hilsen = p.deltagerNavn ? `Hej ${p.deltagerNavn},` : "Hej,";

  const linjer = [
    hilsen,
    "",
    `Tak for snakken. Vi har aftalt ${FORM_BESKRIVELSE[p.form]} med ${p.virksomhedsnavn} ${dato}.`,
  ];

  if (p.kontekstnote && p.kontekstnote.trim()) {
    linjer.push("", p.kontekstnote.trim());
  }

  linjer.push("", "Vi glæder os til at tale med jer.");

  return linjer.join("\n");
}
