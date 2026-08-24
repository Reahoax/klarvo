import { Radar } from "lucide-react";
import { opretServerKlient } from "@/lib/supabase/server";

type SenesteKoersel = {
  navn: string;
  traeffere: number;
  sidst_koert: string;
  parametre: { antalBatches?: number; gennemloebFuldfoert?: boolean; fejl?: string | null } | null;
};

// Etape 11 — CVR-import kører helt automatisk (Vercel Cron, se vercel.json +
// app/api/cron/cvr-import) og gennemløber selv hele det filtrerede CVR-
// datasæt over flere nætter (se cvr_import_fremgang + search_after i
// lib/cvr/sog.ts). Ingen manuel knap - brugeren bad eksplicit om at leads
// "bare skal være der" uden at nogen selv henter dem, og CSV-import (den
// oprindelige, manuelle vej ind) er derfor fjernet helt (2026-08-24). Denne
// side viser bare status - se README "Automatisk CVR-import" for detaljer.
export default async function ImporterSide() {
  const supabase = await opretServerKlient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = user
    ? await supabase.from("profiler").select("rolle").eq("id", user.id).single()
    : { data: null };
  const erEjer = profil?.rolle === "ejer";

  const { data: konfiguration } = await supabase
    .from("konfiguration")
    .select("tilladte_virksomhedsformer")
    .eq("id", true)
    .single();

  const [{ data: senesteKoersel }, { data: fremgang }] = erEjer
    ? await Promise.all([
        supabase
          .from("soegninger")
          .select("navn, traeffere, sidst_koert, parametre")
          .contains("parametre", { kilde: "cvr_api" })
          .order("sidst_koert", { ascending: false })
          .limit(1)
          .maybeSingle()
          .returns<SenesteKoersel>(),
        supabase
          .from("cvr_import_fremgang")
          .select("samlet_gennemloeb, sidste_cvr_nummer")
          .eq("id", true)
          .single(),
      ])
    : [{ data: null }, { data: null }];

  return (
    <div className="max-w-2xl p-6">
      <h1 className="flex items-center gap-2 text-lg font-semibold text-tekst">
        <Radar className="h-5 w-5 text-tekst-daempet" strokeWidth={1.75} />
        Leads fra CVR
      </h1>
      <p className="mb-6 text-sm text-tekst-daempet">
        Leads hentes automatisk hver nat direkte fra Erhvervsstyrelsens CVR-adgang — ingen skal
        importere noget manuelt. Filtreret til jeres tilladte virksomhedsformer og aktive
        virksomheder.
      </p>

      {!erEjer && (
        <p className="rounded-lg border border-kant bg-flade px-4 py-6 text-center text-sm text-tekst-daempet">
          Status for den automatiske import er kun synlig for ejere.
        </p>
      )}

      {erEjer && (
        <div className="flex flex-col gap-4 rounded-lg border border-kant bg-flade p-4">
          <p className="text-xs text-tekst-daempet">
            Tilladte virksomhedsformer lige nu:{" "}
            {(konfiguration?.tilladte_virksomhedsformer ?? []).join(", ") || "ingen sat"}. Ændres
            i Indstillinger → Forretningsregler.
          </p>

          {senesteKoersel ? (
            <div className="flex flex-col gap-1 border-t border-kant pt-3 text-sm">
              <p className="tal text-tekst">
                Seneste kørsel: {new Date(senesteKoersel.sidst_koert).toLocaleString("da-DK")}
              </p>
              <p className="tal text-tekst-daempet">{senesteKoersel.traeffere} virksomheder importeret</p>
              {senesteKoersel.parametre?.fejl && (
                <p className="text-spaerret">Fejl i seneste kørsel: {senesteKoersel.parametre.fejl}</p>
              )}
            </div>
          ) : (
            <p className="border-t border-kant pt-3 text-sm text-tekst-daempet">
              Har endnu ikke kørt.
            </p>
          )}

          {fremgang && (
            <div className="border-t border-kant pt-3 text-xs text-tekst-daempet">
              {fremgang.samlet_gennemloeb > 0 ? (
                <p className="tal">
                  Har gennemløbet hele det filtrerede CVR-register {fremgang.samlet_gennemloeb}{" "}
                  gang{fremgang.samlet_gennemloeb === 1 ? "" : "e"} — kører nu videre for at fange
                  nye og ændrede virksomheder.
                </p>
              ) : (
                <p>
                  Første gennemløb af hele registret er i gang — fortsætter automatisk hver nat,
                  til alle virksomheder er nået igennem.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
