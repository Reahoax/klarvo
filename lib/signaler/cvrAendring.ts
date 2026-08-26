import type { Periode, RaaVirksomhedHistorik } from "@/lib/cvr/historikOpslag.ts";

// Etape 8 (Spec.md "4B. OSINT", kildetypen "cvr_aendring") - "Nyregistreret,
// ejerskifte, adresseflytning, ny branchekode" - "Forandring = behov". Ren
// udledning fra CVR'ets fulde tidsserie-arrays, ingen netværksadgang her
// (den ligger i lib/cvr/historikOpslag.ts) - så logikken kan testes uden en
// rigtig forbindelse.
export type AendringsPost = { type: string; beskrivelse: string; dato: string | null };

function sorterKronologisk<T extends { periode: Periode }>(liste: T[] | undefined): T[] {
  return [...(liste ?? [])].sort((a, b) => (a.periode?.gyldigFra ?? "").localeCompare(b.periode?.gyldigFra ?? ""));
}

// Sammenligner hvert par af på-hinanden-følgende perioder i en tidsserie og
// laver ét "X → Y"-ændringspost pr. skift - den FØRSTE post i en tidsserie
// er ikke i sig selv en ændring (der var intet at skifte fra), så løkken
// starter bevidst ved index 1.
function udledSkift<T extends { periode: Periode }>(
  liste: T[] | undefined,
  type: string,
  visning: (post: T) => string
): AendringsPost[] {
  const sorteret = sorterKronologisk(liste);
  const resultat: AendringsPost[] = [];
  for (let i = 1; i < sorteret.length; i++) {
    const foer = visning(sorteret[i - 1]);
    const efter = visning(sorteret[i]);
    // Springer over, hvis to på-hinanden-følgende perioder reelt har samme
    // værdi (fx en administrativ periode-opdatering uden en indholdsændring)
    // - ellers ville et "X → X" blive vist som en falsk ændring.
    if (foer === efter) continue;
    resultat.push({
      type,
      beskrivelse: `${foer} → ${efter}`,
      dato: sorteret[i].periode?.gyldigFra ?? null,
    });
  }
  return resultat;
}

function visAdresse(a: NonNullable<RaaVirksomhedHistorik["beliggenhedsadresse"]>[number]): string {
  const husnummer = [a.husnummerFra, a.bogstavFra].filter(Boolean).join("");
  const dele = [[a.vejnavn, husnummer].filter(Boolean).join(" "), a.postnummer, a.postdistrikt].filter(Boolean);
  return dele.length > 0 ? dele.join(", ") : "(ukendt adresse)";
}

export function udledCvrAendringer(raa: RaaVirksomhedHistorik): AendringsPost[] {
  const aendringer: AendringsPost[] = [
    ...udledSkift(raa.navne, "Navneskift", (p) => p.navn),
    ...udledSkift(raa.beliggenhedsadresse, "Adresseflytning", visAdresse),
    ...udledSkift(raa.hovedbranche, "Branchekodeskift", (p) => `${p.branchekode} ${p.branchetekst}`),
    ...udledSkift(raa.virksomhedsstatus, "Statusskift", (p) => p.status),
  ];

  const foersteLivsforloeb = sorterKronologisk(raa.livsforloeb)[0];
  if (foersteLivsforloeb?.periode?.gyldigFra) {
    aendringer.push({
      type: "Stiftelse",
      beskrivelse: "Virksomheden blev registreret",
      dato: foersteLivsforloeb.periode.gyldigFra,
    });
  }

  return aendringer.sort((a, b) => (b.dato ?? "").localeCompare(a.dato ?? ""));
}

export function formaterCvrAendringerTilTekst(aendringer: AendringsPost[], maksAntal = 5): string {
  if (aendringer.length === 0) return "Ingen registrerede ændringer i CVR's historik.";
  return aendringer
    .slice(0, maksAntal)
    .map((a) => `${a.dato ? `${a.dato}: ` : ""}${a.type} — ${a.beskrivelse}`)
    .join("\n");
}
