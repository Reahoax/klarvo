// Etape 8 (Spec.md "4B. OSINT") - de tre tidsgrænser, som al hentning skal
// overholde. Bygget FØR selve hentningen, per specens egen rækkefølge
// ("Byg rate limiting og cache FØRST, hentning bagefter").
export const MIN_MILLISEKUNDER_MELLEM_KALD = 5_000; // "maksimalt ét kald pr. domæne pr. 5 sekunder"
export const CACHE_DAGE = 30; // "Cache resultater i mindst 30 dage - hent aldrig det samme to gange"
export const SIGNAL_GAMMELT_DAGE = 180; // "Signaler ældre end 6 måneder vises nedtonet"

export function skalVente(sidstHentet: Date | null, nu: Date = new Date()): boolean {
  if (!sidstHentet) return false;
  return nu.getTime() - sidstHentet.getTime() < MIN_MILLISEKUNDER_MELLEM_KALD;
}

export function erSignalFrisk(hentetDato: Date, nu: Date = new Date()): boolean {
  return alderIDage(hentetDato, nu) < CACHE_DAGE;
}

export function erSignalGammelt(hentetDato: Date, nu: Date = new Date()): boolean {
  return alderIDage(hentetDato, nu) >= SIGNAL_GAMMELT_DAGE;
}

function alderIDage(dato: Date, nu: Date): number {
  return (nu.getTime() - dato.getTime()) / (1000 * 60 * 60 * 24);
}
