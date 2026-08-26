// Etape 8 (Spec.md "4B. OSINT — signalindsamling"): domænet er nøglen, som
// rate-begrænsningen (signal_domaener) og robots.txt-tjekket holdes op imod -
// "maksimalt ét kald pr. domæne pr. 5 sekunder" gælder domænet, ikke den
// enkelte URL, så to leads på samme domæne (fx to P-enheder af samme
// virksomhed) stadig deler ét fælles tidsstempel.
export function udtraekDomaene(raaUrl: string): string | null {
  const medProtokol = /^[a-z]+:\/\//i.test(raaUrl.trim()) ? raaUrl.trim() : `https://${raaUrl.trim()}`;
  try {
    return new URL(medProtokol).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}
