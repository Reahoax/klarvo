import Link from "next/link";
import { Handshake } from "lucide-react";
import { opretServerKlient } from "@/lib/supabase/server";
import { NyKundeKnap } from "./ny-kunde-modal";

type Kunde = {
  id: string;
  navn: string;
  kontaktperson: string | null;
  pris_pr_moede: number | null;
  dpa_underskrevet: boolean;
  aktive: boolean;
};

type Saldo = {
  kunde_id: string;
  moeder_koebt: number;
  moeder_leveret: number;
  saldo: number;
};

export default async function KunderSide() {
  const supabase = await opretServerKlient();

  const [{ data: kunder, error }, { data: saldi }] = await Promise.all([
    supabase
      .from("kunder")
      .select("id, navn, kontaktperson, pris_pr_moede, dpa_underskrevet, aktive")
      .order("navn", { ascending: true })
      .returns<Kunde[]>(),
    supabase.from("kunde_saldo").select("kunde_id, moeder_koebt, moeder_leveret, saldo").returns<Saldo[]>(),
  ]);

  const saldoMap = new Map((saldi ?? []).map((s) => [s.kunde_id, s]));

  return (
    <div>
      <div className="border-b border-kant px-6 py-3 text-xs text-tekst-daempet">
        <span>Kunder</span>
      </div>

      <div className="px-6 py-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-tekst">
              <Handshake className="h-5 w-5 text-tekst-daempet" strokeWidth={1.75} />
              Kunder
            </h1>
            <p className="mt-1 text-sm text-tekst-daempet">
              Jeres egne kunder, kundeprofil (ICP), aftalt pris pr. møde og saldo på
              forudbetalte møder.
            </p>
          </div>
          <NyKundeKnap />
        </div>

        {error && (
          <p className="rounded border border-spaerret/30 bg-spaerret/10 px-3 py-2 text-sm text-spaerret">
            Kunne ikke hente kunder: {error.message}
          </p>
        )}

        {!error && (!kunder || kunder.length === 0) && (
          <div className="max-w-xl rounded-lg border border-kant bg-flade px-6 py-10 text-center">
            <p className="text-sm text-tekst">Der er endnu ingen kunder.</p>
            <p className="mt-1 text-sm text-tekst-daempet">
              Opret jeres første kunde for at komme i gang.
            </p>
          </div>
        )}

        {!error && kunder && kunder.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-kant bg-flade">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-kant text-[11px] uppercase tracking-wide text-tekst-daempet">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Navn</th>
                  <th className="px-4 py-2.5 font-medium">Kontaktperson</th>
                  <th className="px-4 py-2.5 font-medium">Pris/møde</th>
                  <th className="px-4 py-2.5 font-medium">Saldo</th>
                  <th className="px-4 py-2.5 font-medium">DPA</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {kunder.map((k) => {
                  const saldo = saldoMap.get(k.id);
                  const saldoLav = saldo && saldo.saldo < 2;
                  return (
                    <tr
                      key={k.id}
                      className="border-b border-kant last:border-0 transition-colors hover:bg-flade-haevet/50"
                    >
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/kunder/${k.id}`}
                          className="text-tekst hover:text-accent"
                        >
                          {k.navn}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-tekst-daempet">
                        {k.kontaktperson ?? "—"}
                      </td>
                      <td className="tal px-4 py-2.5 text-tekst-daempet">
                        {k.pris_pr_moede !== null ? `${k.pris_pr_moede} kr.` : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        {saldo ? (
                          <span className={saldoLav ? "tal text-advarsel" : "tal text-tekst-daempet"}>
                            {saldo.saldo} af {saldo.moeder_koebt}
                          </span>
                        ) : (
                          <span className="text-tekst-daempet">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {k.dpa_underskrevet ? (
                          <span className="text-godkendt">Underskrevet</span>
                        ) : (
                          <span className="text-spaerret">Mangler</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {k.aktive ? (
                          <span className="text-tekst-daempet">Aktiv</span>
                        ) : (
                          <span className="text-tekst-daempet/50">Inaktiv</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
