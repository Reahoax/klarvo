import { ClipboardCheck } from "lucide-react";
import { opretServerKlient } from "@/lib/supabase/server";
import { KvalificeringsKort } from "./kvalificerings-kort";

type Lead = {
  id: string;
  virksomhedsnavn: string;
  cvr_nummer: string;
  website: string | null;
  by: string | null;
  ai_resume: string | null;
  fit: "J" | "N" | null;
  behov: "J" | "N" | null;
  oekonomi: "J" | "N" | null;
  person: "J" | "N" | null;
};

export default async function KvalificeringSide() {
  const supabase = await opretServerKlient();

  // Køen: leads der mangler mindst ét af de fire kvalificeringsfelter, og som må
  // kontaktes (at vurdere et spærret lead er spildt arbejde). Ældste først.
  const ufuldstaendige = supabase
    .from("leads")
    .select("id, virksomhedsnavn, cvr_nummer, website, by, ai_resume, fit, behov, oekonomi, person", {
      count: "exact",
    })
    .eq("maa_kontaktes", true)
    .or("fit.is.null,behov.is.null,oekonomi.is.null,person.is.null")
    // Sekundær sortering på id: flere leads fra samme import kan have identisk
    // "oprettet" (now() er ens for alle rækker i én batch-insert), så oprettet alene
    // giver ingen stabil rækkefølge - uden id ville køen kunne "hoppe" mellem leads.
    .order("oprettet", { ascending: true })
    .order("id", { ascending: true })
    .limit(1);

  const { data, count, error } = await ufuldstaendige.returns<Lead[]>();
  const lead = data?.[0] ?? null;

  return (
    <div>
      <div className="border-b border-kant px-6 py-3 text-xs text-tekst-daempet">
        <span className="text-accent">Pipeline</span>
        <span className="mx-1.5">/</span>
        <span>Kvalificering</span>
      </div>

      <div className="mx-auto max-w-xl px-6 py-6">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-tekst">
          <ClipboardCheck className="h-5 w-5 text-tekst-daempet" strokeWidth={1.75} />
          Kvalificering
        </h1>
        <p className="mb-6 mt-1 text-sm text-tekst-daempet">
          Her afgør du, om et lead er kvalificeret. Besvar Fit, Behov, Økonomi og Person for
          hvert lead — kvalificeret beregnes automatisk, kun hvis alle fire er Ja.
        </p>

        {error && (
          <p className="rounded border border-spaerret/30 bg-spaerret/10 px-3 py-2 text-sm text-spaerret">
            Kunne ikke hente kø: {error.message}
          </p>
        )}

        {!error && !lead && (
          <div className="rounded-lg border border-kant bg-flade px-6 py-10 text-center">
            <p className="text-sm text-tekst">Køen er tom.</p>
            <p className="mt-1 text-sm text-tekst-daempet">
              Alle leads, der må kontaktes, er blevet vurderet på alle fire felter.
            </p>
          </div>
        )}

        {!error && lead && (
          <>
            <p className="mb-3 text-center text-xs text-tekst-daempet">
              {(count ?? 1)} lead{(count ?? 1) === 1 ? "" : "s"} tilbage i køen
            </p>
            <KvalificeringsKort lead={lead} />
          </>
        )}
      </div>
    </div>
  );
}
