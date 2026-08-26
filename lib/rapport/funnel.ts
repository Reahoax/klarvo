// Etape 10B (Spec.md "F. Rapport") - "Pr. kunde og periode: antal leads
// researchet, antal kvalificerede, antal ringet, antal kontakt opnået,
// antal møder booket, konverteringsrater mellem hvert trin."
//
// "Researchet" er bevidst IKKE periode-afgrænset som resten af trinene -
// leads.kunde_id har ingen egen "tildelt dato"-kolonne (kun den nuværende
// tilstand), så "researchet" her betyder "aktuelt tilknyttet kunden", et
// øjebliksbillede. Ringet/kontakt/møder derimod har rigtige tidsstempler
// (aktiviteter.oprettet, moeder.oprettet) og kan derfor periode-afgrænses
// præcist - det er dem, en "periode"-rapport reelt handler om.
export type FunnelTal = {
  researchet: number;
  kvalificeret: number;
  ringet: number;
  kontaktOpnaaet: number;
  moederBooket: number;
};

export type Konverteringsrater = {
  researchetTilKvalificeret: number | null;
  kvalificeretTilRinget: number | null;
  ringetTilKontakt: number | null;
  kontaktTilMoede: number | null;
};

export type FunnelResultat = FunnelTal & { konvertering: Konverteringsrater };

// Procent afrundet til én decimal - null hvis nævneren er 0 (ingen
// division-med-0-fejl, og "0%" ville ellers vise en falsk 0-rate frem for
// "intet at måle endnu").
function rate(taeller: number, naevner: number): number | null {
  if (naevner === 0) return null;
  return Math.round((taeller / naevner) * 1000) / 10;
}

export function beregnFunnel(tal: FunnelTal): FunnelResultat {
  return {
    ...tal,
    konvertering: {
      researchetTilKvalificeret: rate(tal.kvalificeret, tal.researchet),
      kvalificeretTilRinget: rate(tal.ringet, tal.kvalificeret),
      ringetTilKontakt: rate(tal.kontaktOpnaaet, tal.ringet),
      kontaktTilMoede: rate(tal.moederBooket, tal.kontaktOpnaaet),
    },
  };
}
