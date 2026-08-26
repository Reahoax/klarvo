// Etape 10B (Spec.md "Målinger der faktisk betyder noget") - spørgsmål 2
// ("Hvor mange møder bliver afvist af kunden, og af hvilken grund?") og 3
// ("Hvilken titel siger oftest ja?"). Rene, testede funktioner - selve
// databaseopslaget ligger i hentRapportData.ts.

export type AfvisningsPost = { grund: string; antal: number };

const INGEN_GRUND_LABEL = "Ingen grund angivet";

// Grupperer afviste møders begrundelser og sorterer efter hyppighed - den
// oftest brugte afvisningsgrund først, så den er umiddelbart synlig.
export function analyserAfvisningsgrunde(afvisningsgrunde: (string | null)[]): AfvisningsPost[] {
  const taeller = new Map<string, number>();
  for (const raa of afvisningsgrunde) {
    const grund = raa?.trim() || INGEN_GRUND_LABEL;
    taeller.set(grund, (taeller.get(grund) ?? 0) + 1);
  }
  return [...taeller.entries()]
    .map(([grund, antal]) => ({ grund, antal }))
    .sort((a, b) => b.antal - a.antal);
}

export type KontaktTitelRaekke = { titel: string | null; moedeBooket: boolean };
export type KontaktTitelResultat = { titel: string; kontaktet: number; moederBooket: number; vinderrate: number | null };

const INGEN_TITEL_LABEL = "Titel ikke registreret";

// "Vinderrate" = andelen af kontaktede leads med denne titel, der endte
// med et booket møde - kun titler der reelt er blevet ringet til giver
// mening at sammenligne (en titel, ingen nogensinde har talt med, har ikke
// "sagt nej", den er bare ikke afprøvet). Sorteret højeste vinderrate
// først; titler uden nogen kontakter (vinderrate: null) placeres sidst.
export function analyserKontaktTitel(raekker: KontaktTitelRaekke[]): KontaktTitelResultat[] {
  const taeller = new Map<string, { kontaktet: number; moederBooket: number }>();
  for (const r of raekker) {
    const titel = r.titel?.trim() || INGEN_TITEL_LABEL;
    const eksisterende = taeller.get(titel) ?? { kontaktet: 0, moederBooket: 0 };
    eksisterende.kontaktet += 1;
    if (r.moedeBooket) eksisterende.moederBooket += 1;
    taeller.set(titel, eksisterende);
  }
  return [...taeller.entries()]
    .map(([titel, t]) => ({
      titel,
      kontaktet: t.kontaktet,
      moederBooket: t.moederBooket,
      vinderrate: t.kontaktet === 0 ? null : Math.round((t.moederBooket / t.kontaktet) * 1000) / 10,
    }))
    .sort((a, b) => (b.vinderrate ?? -1) - (a.vinderrate ?? -1));
}
