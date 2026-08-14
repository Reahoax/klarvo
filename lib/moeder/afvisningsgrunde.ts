// Etape 10 — Mødestatus (Spec.md 2A, skærmbillede H): "Ved 'afvist af kunde'
// skal en begrundelse vælges (hvilket kriterium fejlede) - det er vores
// vigtigste læringsdata." Listen matcher bevidst de fire kvalitetstjek-felter
// på moeder-tabellen (beslutningstager/icp/tid/interesse), plus "Andet" -
// samme fast-liste-mønster som lib/leads/indvendinger.ts, af samme grund:
// konsistente værdier er hele pointen med at kunne sammenligne senere.
export const AFVISNINGSGRUNDE = [
  "Deltager var ikke beslutningstager",
  "Virksomheden opfylder ikke ICP",
  "Tid/dato var ikke reelt bekræftet",
  "Ingen reel interesse fra kunden",
  "Andet",
] as const;

export type Afvisningsgrund = (typeof AFVISNINGSGRUNDE)[number];
