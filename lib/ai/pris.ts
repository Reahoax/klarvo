// Etape 5 (Spec.md "4C") - Claude Haiku 4.5 er den billigste nuværende
// model, der kan løse de tre simple AI-felter (se README for begrundelsen).
// Priser slået op i Anthropics dokumentation, ikke gættet fra hukommelsen -
// opdatér disse tal, hvis Anthropic ændrer prisen, i stedet for at antage.
export const AI_MODEL = "claude-haiku-4-5";
const INPUT_USD_PR_TOKEN = 1 / 1_000_000;
const OUTPUT_USD_PR_TOKEN = 5 / 1_000_000;

export function beregnPrisUsd(inputTokens: number, outputTokens: number): number {
  return inputTokens * INPUT_USD_PR_TOKEN + outputTokens * OUTPUT_USD_PR_TOKEN;
}
