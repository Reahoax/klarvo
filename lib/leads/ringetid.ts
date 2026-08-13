// Etape 6 — Ringetidsvindue (Spec.md 2B): "Systemet skjuler ringelisten uden
// for konfigurerede tider (default hverdage 9-16)." Beregnes i dansk
// lokaltid uanset hvilken tidszone serveren selv kører i (Vercel er UTC).
export type RingetidKonfiguration = {
  ringetid_fra: string; // "HH:MM" eller "HH:MM:SS"
  ringetid_til: string;
  ringetid_ugedage: number[]; // ISO-ugedage: 1=mandag ... 7=søndag
};

const UGEDAG_TIL_ISO: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

export function erIndenforRingetid(
  konfig: RingetidKonfiguration,
  naa: Date = new Date()
): boolean {
  const dele = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Copenhagen",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(naa);

  const ugedagKort = dele.find((d) => d.type === "weekday")?.value ?? "Mon";
  const time = dele.find((d) => d.type === "hour")?.value ?? "00";
  const minut = dele.find((d) => d.type === "minute")?.value ?? "00";

  const isoUgedag = UGEDAG_TIL_ISO[ugedagKort] ?? 1;
  const naaTid = `${time}:${minut}`;

  return (
    konfig.ringetid_ugedage.includes(isoUgedag) &&
    naaTid >= konfig.ringetid_fra.slice(0, 5) &&
    naaTid < konfig.ringetid_til.slice(0, 5)
  );
}
