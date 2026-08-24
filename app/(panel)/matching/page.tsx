import { Shuffle } from "lucide-react";
import { opretServerKlient } from "@/lib/supabase/server";
import { matchLeadModIcp, type Icp } from "@/lib/matching/score.ts";
import { MatchRaekke } from "./match-raekke";

// Etape 9 — regelbaseret matching (Spec.md "G. Matching"). Signalbaseret
// vægtning (OSINT, Etape 8) er ikke bygget, så dette er kun de hårde
// kriterier fra kundens ICP - se lib/matching/score.ts. Begrænset til de
// nyeste 300 ukoblede, kontaktbare leads for at holde beregningen (leads ×
// aktive kunder) billig, efterhånden som CVR-importen vokser datasættet.
const MAKS_LEADS = 300;

type Kunde = {
  id: string;
  navn: string;
  icp: Icp | null;
  dpa_underskrevet: boolean;
};

type Lead = {
  id: string;
  virksomhedsnavn: string;
  cvr_nummer: string;
  branchekode: string | null;
  antal_ansatte: number | null;
  postnr: string | null;
  virksomhedsform: string;
  maa_kontaktes: boolean;
};

export default async function MatchingSide() {
  const supabase = await opretServerKlient();

  const [{ data: kunder }, { data: leads }] = await Promise.all([
    supabase
      .from("kunder")
      .select("id, navn, icp, dpa_underskrevet")
      .eq("aktive", true)
      .returns<Kunde[]>(),
    supabase
      .from("leads")
      .select("id, virksomhedsnavn, cvr_nummer, branchekode, antal_ansatte, postnr, virksomhedsform, maa_kontaktes")
      .is("kunde_id", null)
      .eq("maa_kontaktes", true)
      .order("oprettet", { ascending: false })
      .limit(MAKS_LEADS)
      .returns<Lead[]>(),
  ]);

  const forslag = (leads ?? []).flatMap((lead) =>
    (kunder ?? [])
      .map((kunde) => ({ lead, kunde, resultat: matchLeadModIcp(lead, kunde.icp ?? {}) }))
      .filter((f) => f.resultat.matcher)
  );

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="flex items-center gap-2 text-lg font-semibold text-tekst">
        <Shuffle className="h-5 w-5 text-tekst-daempet" strokeWidth={1.75} />
        Matching
      </h1>
      <p className="mb-6 text-sm text-tekst-daempet">
        Regelbaseret forslag: ukoblede leads matchet mod jeres aktive kunders kundeprofil (ICP).
        Systemet tildeler aldrig selv - I trykker Tildel eller Afvis. Signalbaseret vægtning
        (jobopslag, vækst m.v.) er ikke bygget endnu (Etape 8), så forslagene er kun ja/nej på
        de hårde kriterier, ikke en gradueret score.
      </p>

      {(!kunder || kunder.length === 0) && (
        <p className="rounded-lg border border-kant bg-flade px-4 py-6 text-center text-sm text-tekst-daempet">
          Ingen aktive kunder endnu.
        </p>
      )}

      {kunder && kunder.length > 0 && forslag.length === 0 && (
        <p className="rounded-lg border border-kant bg-flade px-4 py-6 text-center text-sm text-tekst-daempet">
          Ingen forslag lige nu. Enten er der ingen ukoblede leads, eller også har jeres kunder
          endnu ikke sat en kundeprofil (ICP) i Kunder → kundedetaljer.
        </p>
      )}

      {forslag.length > 0 && (
        <div className="flex flex-col gap-3">
          {forslag.map(({ lead, kunde, resultat }) => (
            <MatchRaekke
              key={`${lead.id}:${kunde.id}`}
              leadId={lead.id}
              kundeId={kunde.id}
              virksomhedsnavn={lead.virksomhedsnavn}
              cvrNummer={lead.cvr_nummer}
              kundeNavn={kunde.navn}
              begrundelse={resultat.begrundelse}
              dpaMangler={!kunde.dpa_underskrevet}
            />
          ))}
        </div>
      )}
    </div>
  );
}
