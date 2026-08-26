import Link from "next/link";
import { Search, Download } from "lucide-react";
import { opretServerKlient } from "@/lib/supabase/server";

// Spec.md modulkatalog, "Indsigtsanmodning" (Etape 12): "Søg på navn,
// telefon eller CVR og eksportér alt vi har om vedkommende. Kræves ved en
// GDPR-indsigtsbegæring. Skal kunne besvares inden for en måned." Ejer-only
// (samme mønster som Sletterutine/Økonomi) - genbruger den eksisterende
// leaddetaljeside (/leads/[id]) til selve visningen, i stedet for at
// duplikere al den visningslogik her. Denne side er kun søgningen.
type LeadTraeffer = {
  id: string;
  virksomhedsnavn: string;
  cvr_nummer: string;
  kontaktperson_navn: string | null;
  telefon: string | null;
};

export default async function IndsigtSide({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await opretServerKlient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = user
    ? await supabase.from("profiler").select("rolle").eq("id", user.id).single()
    : { data: null };

  if (profil?.rolle !== "ejer") {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <p className="rounded-lg border border-kant bg-flade px-4 py-6 text-center text-sm text-tekst-daempet">
          Kun ejere har adgang til indsigts- og sletteanmodninger.
        </p>
      </div>
    );
  }

  const sp = await searchParams;
  const navn = typeof sp.navn === "string" ? sp.navn.trim() : "";
  const telefon = typeof sp.telefon === "string" ? sp.telefon.trim() : "";
  const cvr = typeof sp.cvr === "string" ? sp.cvr.trim() : "";
  const harSoegt = Boolean(navn || telefon || cvr);

  let traeffere: LeadTraeffer[] = [];
  if (harSoegt) {
    let query = supabase
      .from("leads")
      .select("id, virksomhedsnavn, cvr_nummer, kontaktperson_navn, telefon");
    if (cvr) query = query.eq("cvr_nummer", cvr);
    if (telefon) query = query.ilike("telefon", `%${telefon}%`);
    if (navn) query = query.or(`kontaktperson_navn.ilike.%${navn}%,virksomhedsnavn.ilike.%${navn}%`);
    const { data } = await query.limit(50).returns<LeadTraeffer[]>();
    traeffere = data ?? [];
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="flex items-center gap-2 text-lg font-semibold text-tekst">
        <Search className="h-5 w-5 text-tekst-daempet" strokeWidth={1.75} />
        Indsigt og sletteanmodning
      </h1>
      <p className="mb-6 text-sm text-tekst-daempet">
        Søg på navn, telefon eller CVR-nummer for at besvare en GDPR-indsigts- eller
        sletteanmodning. Åbn et lead for at eksportere alt data om det, eller slette og spærre
        det permanent.
      </p>

      <form className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-kant bg-flade p-4">
        <label className="flex flex-col gap-1 text-xs text-tekst-daempet">
          Navn
          <input
            type="text"
            name="navn"
            defaultValue={navn}
            placeholder="Kontaktperson eller virksomhed"
            className="w-56 rounded border border-kant bg-flade-haevet px-2 py-1.5 text-sm text-tekst"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-tekst-daempet">
          Telefon
          <input
            type="text"
            name="telefon"
            defaultValue={telefon}
            className="w-40 rounded border border-kant bg-flade-haevet px-2 py-1.5 text-sm text-tekst"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-tekst-daempet">
          CVR-nummer
          <input
            type="text"
            name="cvr"
            defaultValue={cvr}
            className="w-32 rounded border border-kant bg-flade-haevet px-2 py-1.5 text-sm text-tekst"
          />
        </label>
        <button
          type="submit"
          className="rounded-md border border-kant px-3 py-1.5 text-sm text-tekst-daempet transition-colors hover:border-accent hover:text-tekst"
        >
          Søg
        </button>
      </form>

      {harSoegt && traeffere.length === 0 && (
        <p className="rounded-lg border border-kant bg-flade px-4 py-6 text-center text-sm text-tekst-daempet">
          Ingen leads matcher søgningen.
        </p>
      )}

      {traeffere.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-kant bg-flade">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-kant text-[11px] uppercase tracking-wide text-tekst-daempet">
              <tr>
                <th className="px-4 py-2.5 font-medium">Virksomhed</th>
                <th className="px-4 py-2.5 font-medium">CVR-nummer</th>
                <th className="px-4 py-2.5 font-medium">Kontaktperson</th>
                <th className="px-4 py-2.5 font-medium">Telefon</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {traeffere.map((t) => (
                <tr key={t.id} className="border-b border-kant last:border-0">
                  <td className="px-4 py-2.5">
                    <Link href={`/leads/${t.id}`} className="text-tekst hover:text-accent">
                      {t.virksomhedsnavn}
                    </Link>
                  </td>
                  <td className="tal px-4 py-2.5 text-tekst-daempet">{t.cvr_nummer}</td>
                  <td className="px-4 py-2.5 text-tekst-daempet">{t.kontaktperson_navn ?? "—"}</td>
                  <td className="px-4 py-2.5 text-tekst-daempet">{t.telefon ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <a
                      href={`/api/leads/${t.id}/eksport`}
                      className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
                    >
                      <Download className="h-3 w-3" strokeWidth={1.75} />
                      Eksportér
                    </a>
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
