export type SegmentStatistik = {
  antalLeads: number;
  antalRinget: number;
  kontaktrate: number | null; // procent 0-100, null hvis ingen er ringet endnu
  moedrate: number | null; // procent 0-100, null hvis ingen er ringet endnu
};

type Koblingsraekke = { lead_id: string; segment_id: string };
type Aktivitetsraekke = { lead_id: string; udfald: string };
type Moederaekke = { lead_id: string };

// Etape 7C — segmenter er flere ICP-hypoteser testet parallelt pr. kunde
// (Spec.md "Det er hele pointen med segmenter - ikke at organisere, men at
// kunne sammenligne"). Beregner pr. segment: hvor mange leads er tildelt,
// hvor mange er ringet, og af dem, hvor mange blev reelt kontaktet
// (udfald forskelligt fra "ikke_kontakt") og endte i et booket møde.
export function beregnSegmentStatistik(
  segmentId: string,
  koblinger: Koblingsraekke[],
  aktiviteter: Aktivitetsraekke[],
  moeder: Moederaekke[]
): SegmentStatistik {
  const leadIds = koblinger.filter((k) => k.segment_id === segmentId).map((k) => k.lead_id);
  const leadIdSet = new Set(leadIds);

  const udfaldPrLead = new Map<string, Set<string>>();
  for (const a of aktiviteter) {
    if (!leadIdSet.has(a.lead_id)) continue;
    if (!udfaldPrLead.has(a.lead_id)) udfaldPrLead.set(a.lead_id, new Set());
    udfaldPrLead.get(a.lead_id)!.add(a.udfald);
  }

  const moedeLeadIds = new Set(moeder.filter((m) => leadIdSet.has(m.lead_id)).map((m) => m.lead_id));

  const antalLeads = leadIds.length;
  const ringetLeadIds = leadIds.filter((id) => udfaldPrLead.has(id));
  const antalRinget = ringetLeadIds.length;
  const kontaktetAntal = ringetLeadIds.filter((id) =>
    [...udfaldPrLead.get(id)!].some((u) => u !== "ikke_kontakt")
  ).length;
  const moedeAntal = leadIds.filter((id) => moedeLeadIds.has(id)).length;

  return {
    antalLeads,
    antalRinget,
    kontaktrate: antalRinget > 0 ? Math.round((kontaktetAntal / antalRinget) * 100) : null,
    moedrate: antalRinget > 0 ? Math.round((moedeAntal / antalRinget) * 100) : null,
  };
}
