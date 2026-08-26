import { createHash } from "node:crypto";

// Etape 5 (Spec.md "4C") - "Samme input må aldrig kaldes to gange. Gem et
// hash af inputtet sammen med svaret." Bruges til at slå op i ai_kald, før
// et nyt Claude-kald sendes for et lead+felttype.
export function hashInput(tekst: string): string {
  return createHash("sha256").update(tekst, "utf8").digest("hex");
}
