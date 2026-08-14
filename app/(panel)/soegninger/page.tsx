import { Search } from "lucide-react";
import { opretServerKlient } from "@/lib/supabase/server";

type SoegningRaekke = {
  id: string;
  navn: string;
  traeffere: number;
  sidst_koert: string | null;
  oprettet: string;
};

export default async function SoegningerSide() {
  const supabase = await opretServerKlient();
  const { data: soegninger, error } = await supabase
    .from("soegninger")
    .select("id, navn, traeffere, sidst_koert, oprettet")
    .order("oprettet", { ascending: false })
    .returns<SoegningRaekke[]>();

  return (
    <div className="p-6">
      <h1 className="flex items-center gap-2 text-lg font-semibold text-tekst">
        <Search className="h-5 w-5 text-tekst-daempet" strokeWidth={1.75} />
        Søgninger
      </h1>
      <p className="mb-6 text-sm text-tekst-daempet">
        Her ser du alle gemte søgninger og hvor mange leads hver af dem gav. Hver import fra
        Etape 2 opretter automatisk en søgning her.
      </p>

      {error && (
        <p className="rounded border border-spaerret/30 bg-spaerret/5 px-3 py-2 text-sm text-spaerret">
          Kunne ikke hente søgninger: {error.message}
        </p>
      )}

      {!error && (!soegninger || soegninger.length === 0) && (
        <div className="rounded border border-kant bg-flade px-6 py-10 text-center">
          <p className="text-sm text-tekst">Der er endnu ingen søgninger.</p>
          <p className="mt-1 text-sm text-tekst-daempet">
            De oprettes automatisk, når du importerer leads.
          </p>
        </div>
      )}

      {!error && soegninger && soegninger.length > 0 && (
        <div className="overflow-x-auto rounded border border-kant bg-flade">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-kant bg-baggrund text-tekst-daempet">
              <tr>
                <th className="px-4 py-2 font-medium">Navn</th>
                <th className="px-4 py-2 font-medium">Træffere</th>
                <th className="px-4 py-2 font-medium">Sidst kørt</th>
              </tr>
            </thead>
            <tbody>
              {soegninger.map((s) => (
                <tr key={s.id} className="border-b border-kant last:border-0">
                  <td className="px-4 py-2 text-tekst">{s.navn}</td>
                  <td className="tal px-4 py-2 text-tekst">{s.traeffere}</td>
                  <td className="tal px-4 py-2 text-tekst">
                    {s.sidst_koert
                      ? new Date(s.sidst_koert).toLocaleString("da-DK")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
