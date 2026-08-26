// Etape 5 (Spec.md "4C") - "Bed om ren JSON med et fast skema, og valider
// svaret mod skemaet, før noget skrives til databasen. Fejler valideringen:
// log og sæt feltet til null. Skriv aldrig ustruktureret tekst direkte ind
// i et felt." Disse funktioner er den validering - rene og testbare uden
// nogen afhængighed af selve API-kaldet.

export type ResumeSvar = { resume: string | null };
export type HypoteseSvar = { hypotese: string | null };
export type ScoreSvar = { score: number | null; begrundelse: string | null };

function erObjekt(data: unknown): data is Record<string, unknown> {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}

function erStrengEllerNull(v: unknown): v is string | null {
  return v === null || typeof v === "string";
}

export function validerResumeSvar(data: unknown): ResumeSvar | null {
  if (!erObjekt(data) || !("resume" in data) || !erStrengEllerNull(data.resume)) return null;
  return { resume: data.resume };
}

export function validerHypoteseSvar(data: unknown): HypoteseSvar | null {
  if (!erObjekt(data) || !("hypotese" in data) || !erStrengEllerNull(data.hypotese)) return null;
  return { hypotese: data.hypotese };
}

export function validerScoreSvar(data: unknown): ScoreSvar | null {
  if (!erObjekt(data) || !("score" in data) || !("begrundelse" in data)) return null;
  const { score, begrundelse } = data;
  const scoreOk =
    score === null || (typeof score === "number" && Number.isInteger(score) && score >= 1 && score <= 10);
  if (!scoreOk || !erStrengEllerNull(begrundelse)) return null;
  return { score: score as number | null, begrundelse };
}

// Claudes svar kan i sjældne tilfælde have tekst udenom JSON'en trods
// instruktionen om at svare rent - denne funktion prøver rå parse først og
// falder kun tilbage til at udtrække det første {...}-blok, hvis det fejler.
export function parseJsonSvar(tekst: string): unknown {
  try {
    return JSON.parse(tekst);
  } catch {
    const match = tekst.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}
