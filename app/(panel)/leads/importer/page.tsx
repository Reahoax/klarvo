import { opretServerKlient } from "@/lib/supabase/server";
import { ImporterForm } from "./importer-form";

export default async function ImporterSide() {
  const supabase = await opretServerKlient();
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
      <h1 className="text-lg font-semibold text-tekst">Importér leads</h1>
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

      <ImporterForm />
    </div>
  );
}
