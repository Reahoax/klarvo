import { Upload, Radar } from "lucide-react";
import { opretServerKlient } from "@/lib/supabase/server";
import { ImporterForm } from "./importer-form";

export default async function ImporterSide() {
  const supabase = await opretServerKlient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = user
    ? await supabase.from("profiler").select("rolle").eq("id", user.id).single()
    : { data: null };

  // Etape 11 — CVR-import kører nu helt automatisk (Vercel Cron, se
  // vercel.json + app/api/cron/cvr-import) i stedet for en manuel knap her -
  // brugeren bad eksplicit om at leads "bare skal være der" uden at nogen
  // selv skal hente dem. Denne sektion viser bare status for seneste kørsel.
  const { data: senesteCvrImport } = profil?.rolle === "ejer"
    ? await supabase
        .from("soegninger")
        .select("navn, traeffere, sidst_koert")
        .contains("parametre", { kilde: "cvr_api" })
        .order("sidst_koert", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const { data: konfiguration } = await supabase
    .from("konfiguration")
    .select("tilladte_virksomhedsformer, virksomhedsformer_fysiske_personer")
    .single();

  const kraeverRobinsonlisteTjek = (konfiguration?.tilladte_virksomhedsformer ?? []).some(
    (form: string) =>
      (konfiguration?.virksomhedsformer_fysiske_personer ?? []).includes(form)
  );

  return (
    <div className="max-w-2xl p-6">
      <h1 className="flex items-center gap-2 text-lg font-semibold text-tekst">
        <Upload className="h-5 w-5 text-tekst-daempet" strokeWidth={1.75} />
        Importér leads
      </h1>
      <p className="mb-6 text-sm text-tekst-daempet">
        Upload en CSV-udtræksfil fra cvr.dk. Importen er bred inden for filen - hvilke leads I
        faktisk arbejder videre med, vælges bagefter i leadtabellen.
      </p>

      <p className="mb-6 text-xs text-tekst-daempet">
        Tilladte virksomhedsformer lige nu:{" "}
        {(konfiguration?.tilladte_virksomhedsformer ?? []).join(", ") || "ingen sat"}. Ændres i
        databasens <code>konfiguration</code>-tabel.
      </p>

      {kraeverRobinsonlisteTjek && (
        <p className="mb-6 rounded border border-advarsel/40 bg-advarsel-baggrund px-4 py-3 text-sm text-advarsel">
          Den tilladte liste over virksomhedsformer indeholder former, der dækker fysiske
          personer. Robinsonliste-tjek er påkrævet, før der ringes til disse leads.
        </p>
      )}

      {profil?.rolle === "ejer" && (
        <div className="mb-6 flex flex-col gap-2 rounded border border-kant bg-flade p-4">
          <div className="flex items-center gap-2">
            <Radar className="h-4 w-4 text-tekst-daempet" strokeWidth={1.75} />
            <h2 className="text-sm font-semibold text-tekst">Automatisk CVR-import</h2>
          </div>
          <p className="text-xs text-tekst-daempet">
            Henter selv hver nat fra Erhvervsstyrelsens CVR-adgang (Indstillinger →
            Integrationer), filtreret til jeres tilladte virksomhedsformer og aktive
            virksomheder. Ingen manuel handling nødvendig.
          </p>
          {senesteCvrImport ? (
            <p className="tal text-xs text-tekst-daempet">
              Seneste kørsel: {new Date(senesteCvrImport.sidst_koert).toLocaleString("da-DK")} —{" "}
              {senesteCvrImport.traeffere} virksomheder
            </p>
          ) : (
            <p className="text-xs text-tekst-daempet">Har endnu ikke kørt.</p>
          )}
        </div>
      )}

      <ImporterForm />
    </div>
  );
}
