// Delt mellem den før-maling-scriptet i app/layout.tsx (som ikke kan importere
// dette - se TEMA_SCRIPT der) og Udseende-editoren i Indstillinger. Holder styr
// på de CSS-variabler, der udgør et "brugerdefineret" tema (Etape: 100% brugerstyret
// udseende, forberedt i app/globals.css siden 2026-08-13).

export const CSS_VARIABEL_NOEGLER = [
  "baggrund",
  "flade",
  "flade-haevet",
  "kant",
  "tekst",
  "tekst-daempet",
  "accent",
  "accent-tekst",
  "spaerret",
  "advarsel",
  "advarsel-baggrund",
  "godkendt",
] as const;

export type CssVariabelNoegle = (typeof CSS_VARIABEL_NOEGLER)[number];

export const FARVE_LABEL: Record<CssVariabelNoegle, string> = {
  baggrund: "Baggrund",
  flade: "Paneler",
  "flade-haevet": "Hævede paneler",
  kant: "Kant/rammer",
  tekst: "Tekst",
  "tekst-daempet": "Dæmpet tekst",
  accent: "Accent (knapper, links)",
  "accent-tekst": "Tekst på accentfarve",
  spaerret: "Spærret/fejl",
  advarsel: "Advarsel",
  "advarsel-baggrund": "Advarsel-baggrund",
  godkendt: "Godkendt/succes",
};

export type BrugerTema = {
  farver: Record<CssVariabelNoegle, string>; // hex, fx "#0b0b0c"
  panelAlpha: number; // 0-1
  baggrundsbillede: string | null; // offentlig URL fra Supabase Storage
};

export const LOKAL_LAGER_NOEGLE = "klarvo-brugertema";

const MOERK_STANDARD: Record<CssVariabelNoegle, string> = {
  baggrund: "#0b0b0c",
  flade: "#161617",
  "flade-haevet": "#1e1e20",
  kant: "#2a2a2d",
  tekst: "#f2f2f0",
  "tekst-daempet": "#8f8f93",
  accent: "#e0603c",
  "accent-tekst": "#ffffff",
  spaerret: "#e05a4e",
  advarsel: "#e0a83c",
  "advarsel-baggrund": "#2b230f",
  godkendt: "#4caf7d",
};

const LYS_STANDARD: Record<CssVariabelNoegle, string> = {
  baggrund: "#f7f7f5",
  flade: "#ffffff",
  "flade-haevet": "#f1f1ef",
  kant: "#e3e2de",
  tekst: "#1c1c1a",
  "tekst-daempet": "#6b6a65",
  accent: "#e0603c",
  "accent-tekst": "#ffffff",
  spaerret: "#b3261e",
  advarsel: "#8a5a00",
  "advarsel-baggrund": "#fbf0d9",
  godkendt: "#1e6b3c",
};

export function standardFarver(udgangspunkt: "moerk" | "lys"): Record<CssVariabelNoegle, string> {
  return { ...(udgangspunkt === "lys" ? LYS_STANDARD : MOERK_STANDARD) };
}

export function tomtBrugerTema(udgangspunkt: "moerk" | "lys"): BrugerTema {
  return { farver: standardFarver(udgangspunkt), panelAlpha: 1, baggrundsbillede: null };
}

export function hexTilRgbTriple(hex: string): string {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) return "0 0 0";
  return [m[1], m[2], m[3]].map((h) => Number.parseInt(h, 16)).join(" ");
}

// Sætter alle CSS-variabler + baggrundsbillede + paneltransparens på <html>.
// Kaldes både ved indlæsning (fra den gemte tilstand) og live mens brugeren
// justerer farver i editoren.
export function anvendBrugerTema(tema: BrugerTema | null) {
  const html = document.documentElement;

  if (!tema) {
    html.removeAttribute("data-brugerbaggrund");
    html.style.removeProperty("--panel-alpha");
    for (const noegle of CSS_VARIABEL_NOEGLER) {
      html.style.removeProperty(`--farve-${noegle}`);
    }
    document.body.style.backgroundImage = "";
    return;
  }

  for (const noegle of CSS_VARIABEL_NOEGLER) {
    html.style.setProperty(`--farve-${noegle}`, hexTilRgbTriple(tema.farver[noegle]));
  }
  html.style.setProperty("--panel-alpha", String(tema.panelAlpha));

  if (tema.baggrundsbillede) {
    html.setAttribute("data-brugerbaggrund", "til");
    document.body.style.backgroundImage = `url(${JSON.stringify(tema.baggrundsbillede)})`;
  } else {
    html.removeAttribute("data-brugerbaggrund");
    document.body.style.backgroundImage = "";
  }
}

export function gemBrugerTema(tema: BrugerTema) {
  localStorage.setItem(LOKAL_LAGER_NOEGLE, JSON.stringify(tema));
}

export function laesGemtBrugerTema(): BrugerTema | null {
  try {
    const raa = localStorage.getItem(LOKAL_LAGER_NOEGLE);
    if (!raa) return null;
    return JSON.parse(raa) as BrugerTema;
  } catch {
    return null;
  }
}

export function ryddBrugerTema() {
  localStorage.removeItem(LOKAL_LAGER_NOEGLE);
}
