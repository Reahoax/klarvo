// De ni skærmbilleder fra Spec.md afsnit 2, grupperet efter arbejdsgang i venstremenuen.
// "href: null" gør et punkt synligt, men ikke klikbart, så det aldrig er skjult for
// brugeren, hvad systemet i sidste ende skal kunne.
export type NavPunkt = {
  bogstav: string;
  navn: string;
  href: string | null;
};

export type NavGruppe = {
  label: string;
  punkter: NavPunkt[];
};

export const navGrupper: NavGruppe[] = [
  {
    // "A" for Dashboard er uden for Spec.md's skærmbillede-bogstaver (B-J) -
    // siden findes ikke i specen, men er tilføjet som ny forside 2026-08-13.
    label: "Hjem",
    punkter: [{ bogstav: "A", navn: "Dashboard", href: "/dashboard" }],
  },
  {
    label: "Pipeline",
    punkter: [
      { bogstav: "B", navn: "Leads", href: "/leads" },
      { bogstav: "C", navn: "Kvalificering", href: "/kvalificering" },
      { bogstav: "D", navn: "Ringeliste", href: "/ringeliste" },
    ],
  },
  {
    label: "Kunder",
    punkter: [
      { bogstav: "E", navn: "Kunder", href: "/kunder" },
      { bogstav: "G", navn: "Matching", href: null },
      { bogstav: "I", navn: "Kundeprofil (ICP) og segmenter", href: null },
    ],
  },
  {
    label: "Overblik",
    punkter: [
      // "Økonomi" er saldo-halvdelen af skærmbillede H (Spec.md 2A) - selve
      // mødebooking-flowet (Ringeliste -> "Møde booket", kvalitetstjek,
      // mødestatus) er stadig ikke bygget (Etape 10).
      { bogstav: "H", navn: "Økonomi", href: "/okonomi" },
      { bogstav: "F", navn: "Rapport", href: null },
    ],
  },
];

export const navPunkter: NavPunkt[] = navGrupper.flatMap((g) => g.punkter);
