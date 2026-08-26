import Anthropic from "@anthropic-ai/sdk";

// Etape 5 (Spec.md "4C") - "API-nøgle kun i .env. Aldrig i klienten, aldrig
// i git. Alle kald går gennem vores egen server - browseren må aldrig kalde
// Anthropic direkte." Denne fil importeres derfor kun fra server actions/
// route handlers, aldrig fra "use client"-filer.
//
// ANTHROPIC_API_KEY er endnu ikke sat i produktion (bevidst udskudt, se
// README) - erAiKonfigureret() bruges til at afbryde FØR noget forsøger at
// oprette forbindelse, så AI-berigelse fejler pænt med en tydelig besked
// i stedet for at kaste en rå fejl midt i et kald.
export function erAiKonfigureret(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// timeout/maxRetries sætter SDK'ens indbyggede eksponentielle backoff og
// 30-sekunders tidsgrænse (Spec.md-kravene "Rate limiting og retry" og
// "Timeout på 30 sekunder") - ingen grund til at genopfinde det selv.
export function opretAiKlient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY mangler som miljøvariabel - AI-berigelse er ikke konfigureret endnu.");
  }
  return new Anthropic({ apiKey, timeout: 30_000, maxRetries: 2 });
}
