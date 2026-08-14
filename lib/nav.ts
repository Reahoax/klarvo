import {
  LayoutDashboard,
  Building2,
  ClipboardCheck,
  PhoneCall,
  CalendarCheck,
  Handshake,
  Shuffle,
  Target,
  Wallet,
  FileBarChart2,
  type LucideIcon,
} from "lucide-react";

// De ni skærmbilleder fra Spec.md afsnit 2, grupperet efter arbejdsgang i venstremenuen.
// "href: null" gør et punkt synligt, men ikke klikbart, så det aldrig er skjult for
// brugeren, hvad systemet i sidste ende skal kunne.
export type NavPunkt = {
  bogstav: string;
  navn: string;
  href: string | null;
  Ikon: LucideIcon;
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
    punkter: [{ bogstav: "A", navn: "Dashboard", href: "/dashboard", Ikon: LayoutDashboard }],
  },
  {
    label: "Pipeline",
    punkter: [
      { bogstav: "B", navn: "Leads", href: "/leads", Ikon: Building2 },
      { bogstav: "C", navn: "Kvalificering", href: "/kvalificering", Ikon: ClipboardCheck },
      { bogstav: "D", navn: "Ringeliste", href: "/ringeliste", Ikon: PhoneCall },
      { bogstav: "H", navn: "Møder", href: "/moeder", Ikon: CalendarCheck },
    ],
  },
  {
    label: "Kunder",
    punkter: [
      { bogstav: "E", navn: "Kunder", href: "/kunder", Ikon: Handshake },
      { bogstav: "G", navn: "Matching", href: null, Ikon: Shuffle },
      { bogstav: "I", navn: "Kundeprofil (ICP) og segmenter", href: null, Ikon: Target },
    ],
  },
  {
    label: "Overblik",
    punkter: [
      // "Økonomi" er saldo-halvdelen af skærmbillede H (Spec.md 2A) - selve
      // mødebooking-flowet (Ringeliste -> "Møde booket", kvalitetstjek,
      // mødestatus) er stadig ikke bygget (Etape 10).
      { bogstav: "H", navn: "Økonomi", href: "/okonomi", Ikon: Wallet },
      { bogstav: "F", navn: "Rapport", href: null, Ikon: FileBarChart2 },
    ],
  },
];

export const navPunkter: NavPunkt[] = navGrupper.flatMap((g) => g.punkter);
