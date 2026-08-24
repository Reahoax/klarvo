export type Icp = {
  branchekoder?: string[];
  virksomhedsformer?: string[];
  postnumre?: string[];
  ansatte_fra?: number | null;
  ansatte_til?: number | null;
};

export type LeadTilMatching = {
  branchekode: string | null;
  antal_ansatte: number | null;
  postnr: string | null;
  virksomhedsform: string;
  maa_kontaktes: boolean;
};

export type MatchResultat = {
  matcher: boolean;
  begrundelse: string;
};

// Etape 9 — regelbaseret matching (Spec.md "G. Matching"): "Regelbaseret
// (hårde kriterier — giver nul point hvis de fejler): branchekode inden for
// kundens ICP, antal ansatte inden for interval, geografi inden for område,
// virksomhedsform tilladt, ikke spærret." Signalbaseret vægtning (OSINT,
// Etape 8, ikke bygget) ville graduere en score - indtil da er dette kun
// ja/nej med en begrundelse i klartekst, ikke et tal.
//
// Et ikke-sat kriterie (tomt felt på kundens ICP) begrænser ikke matchet -
// kun kriterier kunden faktisk har angivet, tælles med. Har kunden slet
// ingen kriterier sat, er der intet at matche imod, og leadet foreslås ikke.
export function matchLeadModIcp(lead: LeadTilMatching, icp: Icp): MatchResultat {
  if (!lead.maa_kontaktes) {
    return { matcher: false, begrundelse: "Leadet er spærret og må ikke kontaktes." };
  }

  const begrundelser: string[] = [];

  if (icp.virksomhedsformer && icp.virksomhedsformer.length > 0) {
    // Case-insensitivt - CVR-importen gemmer fx "APS" (se lib/cvr/mapning.ts),
    // mens ICP-formularens placeholder ("fx ApS, A/S") lokker brugeren til at
    // skrive blandet case. Uden dette ville et rigtigt match aldrig ske.
    const tilladteFormer = icp.virksomhedsformer.map((v) => v.toUpperCase());
    if (!tilladteFormer.includes(lead.virksomhedsform.toUpperCase())) {
      return {
        matcher: false,
        begrundelse: `Virksomhedsform ${lead.virksomhedsform} er ikke blandt kundens tilladte former.`,
      };
    }
    begrundelser.push(`virksomhedsform ${lead.virksomhedsform} er tilladt`);
  }

  if (icp.branchekoder && icp.branchekoder.length > 0) {
    if (!lead.branchekode || !icp.branchekoder.includes(lead.branchekode)) {
      return {
        matcher: false,
        begrundelse: `Branchekode ${lead.branchekode ?? "(mangler)"} matcher ikke kundens ICP.`,
      };
    }
    begrundelser.push(`branchekode ${lead.branchekode} matcher`);
  }

  if (icp.ansatte_fra != null || icp.ansatte_til != null) {
    if (lead.antal_ansatte == null) {
      return {
        matcher: false,
        begrundelse: "Antal ansatte er ukendt og kan derfor ikke matches mod kundens interval.",
      };
    }
    if (icp.ansatte_fra != null && lead.antal_ansatte < icp.ansatte_fra) {
      return {
        matcher: false,
        begrundelse: `${lead.antal_ansatte} ansatte er under kundens minimum (${icp.ansatte_fra}).`,
      };
    }
    if (icp.ansatte_til != null && lead.antal_ansatte > icp.ansatte_til) {
      return {
        matcher: false,
        begrundelse: `${lead.antal_ansatte} ansatte er over kundens maksimum (${icp.ansatte_til}).`,
      };
    }
    begrundelser.push(`${lead.antal_ansatte} ansatte er inden for intervallet`);
  }

  if (icp.postnumre && icp.postnumre.length > 0) {
    if (!lead.postnr || !icp.postnumre.includes(lead.postnr)) {
      return {
        matcher: false,
        begrundelse: `Postnummer ${lead.postnr ?? "(mangler)"} er uden for kundens geografiske område.`,
      };
    }
    begrundelser.push(`postnummer ${lead.postnr} matcher`);
  }

  if (begrundelser.length === 0) {
    return {
      matcher: false,
      begrundelse: "Kunden har ingen ICP-kriterier sat endnu - intet at matche imod.",
    };
  }

  return {
    matcher: true,
    begrundelse: begrundelser.join("; ") + ".",
  };
}
