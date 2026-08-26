export type SideUddrag = {
  titel: string | null;
  beskrivelse: string | null;
};

// Etape 8 (Spec.md "4B. OSINT"): bevidst en simpel regex-udtrækning, ikke en
// fuld HTML-parser - vi skal kun bruge <title> og meta-beskrivelsen som et
// kort, dokumenterbart signal ("hvad de sælger, hvem de sælger til"), ikke
// gengive eller gemme hele sidens indhold.
export function uddragTitelOgBeskrivelse(html: string): SideUddrag {
  const titelMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const titel = titelMatch ? rensTekst(titelMatch[1]) : null;

  const metaMatch =
    html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([\s\S]*?)["'][^>]*>/i) ??
    html.match(/<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']description["'][^>]*>/i);
  const beskrivelse = metaMatch ? rensTekst(metaMatch[1]) : null;

  return { titel, beskrivelse };
}

function rensTekst(raa: string): string | null {
  const renset = raa
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return renset.length > 0 ? renset.slice(0, 500) : null;
}
