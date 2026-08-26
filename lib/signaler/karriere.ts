// Etape 8, anden kildetype (Spec.md "4B. OSINT" - "jobopslag" er nævnt sammen
// med "website" som de to at starte med). Udfordringen er at vi kun kender
// forsiden, ikke selve karrieresiden - derfor en heuristisk linksøgning på
// forsidens HTML, ikke en fuld sitemap-crawl. Bevidst regex-baseret, samme
// stil som uddrag.ts, ikke en fuld HTML-parser.
const KARRIERE_NOEGLEORD = [
  "job",
  "jobs",
  "karriere",
  "career",
  "careers",
  "stilling",
  "stillinger",
  "vi søger",
];

// Finder det mest sandsynlige karriere-/jobside-link på en forside. Point
// gives både for nøgleord i selve URL'en (stærkere signal - typisk /job eller
// /karriere som sti) og i linkteksten ("Se ledige stillinger"). Højeste score
// vinder ved flere kandidater. Returnerer null, hvis intet matcher.
export function findKarriereLink(html: string, baseUrl: string): string | null {
  const linkRegex = /<a\s+[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const kandidater: { href: string; score: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    const tekst = match[2].replace(/<[^>]+>/g, " ").toLowerCase();
    const hrefLower = href.toLowerCase();

    let score = 0;
    for (const noegleord of KARRIERE_NOEGLEORD) {
      const noegleordUdenMellemrum = noegleord.replace(/\s/g, "");
      if (hrefLower.includes(noegleordUdenMellemrum)) score += 2;
      if (tekst.includes(noegleord)) score += 1;
    }
    if (score > 0) kandidater.push({ href, score });
  }

  if (kandidater.length === 0) return null;
  kandidater.sort((a, b) => b.score - a.score);

  try {
    return new URL(kandidater[0].href, baseUrl).toString();
  } catch {
    return null;
  }
}
