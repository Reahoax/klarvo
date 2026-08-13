// Etape 6 — Indvendingslog (Spec.md 2B): "Fast liste over almindelige
// indvendinger; operatøren vælger én pr. opkald. Efter 200 opkald ved vi
// præcis hvorfor folk siger nej." Bevidst en fast liste, ikke en tabel
// brugeren selv redigerer - konsistente værdier er hele pointen med at
// kunne sammenligne på tværs af opkald senere.
export const INDVENDINGER = [
  "Ingen tid lige nu",
  "Ikke interesseret",
  "Har allerede en leverandør",
  "For dyrt / intet budget",
  "Forkert person/beslutningstager",
  "Vil tænke over det",
  "Dårlig timing",
  "Andet",
] as const;

export type Indvending = (typeof INDVENDINGER)[number];

// Kun relevant at spørge til ved negative udfald - "Møde booket" har ingen
// indvending, og "Ring igen"/"Ikke kontakt" er ikke afgørende svar endnu.
export const UDFALD_MED_INDVENDING = new Set(["ikke_interesseret", "lagde_paa"]);
