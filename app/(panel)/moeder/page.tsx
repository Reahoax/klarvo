import { CalendarCheck } from "lucide-react";
import { opretServerKlient } from "@/lib/supabase/server";
import { MoedeRaekke, type Moede } from "./moede-raekke";

type MoedeRaa = Moede & {
  kunde_id: string;
  leads: { virksomhedsnavn: string } | null;
  kunder: { navn: string } | null;
};

type SaldoRaekke = { kunde_id: string; saldo: number };

const STATUS_LABEL: Record<string, string> = {
  afholdt: "Afholdt",
  afvist_af_kunde: "Afvist af kunde",
  no_show: "No-show",
  aflyst: "Aflyst",
};

const STATUS_FARVE: Record<string, string> = {
  afholdt: "text-godkendt",
  afvist_af_kunde: "text-spaerret",
  no_show: "text-advarsel",
  aflyst: "text-tekst-daempet",
};

export default async function MoederSide() {
  const supabase = await opretServerKlient();

  const [{ data: moeder, error }, { data: saldi }] = await Promise.all([
    supabase
      .from("moeder")
      .select(
        "id, kunde_id, dato_tid, form, deltager_navn, deltager_titel, kontekstnote, status, beslutningstager_bekraeftet, icp_bekraeftet, tid_bekraeftet, interesse_bekraeftet, afvisningsgrund, leads(virksomhedsnavn), kunder(navn)"
      )
      .order("dato_tid", { ascending: true })
      .returns<MoedeRaa[]>(),
    supabase.from("kunde_saldo").select("kunde_id, saldo").returns<SaldoRaekke[]>(),
  ]);

  const saldoPrKunde = new Map((saldi ?? []).map((s) => [s.kunde_id, s.saldo]));
  const alleMoeder = moeder ?? [];
  const planlagte = alleMoeder.filter((m) => m.status === "planlagt");
  const historik = alleMoeder
    .filter((m) => m.status !== "planlagt")
    .sort((a, b) => (b.dato_tid ?? "").localeCompare(a.dato_tid ?? ""));

  return (
    <div>
      <div className="border-b border-kant px-6 py-3 text-xs text-tekst-daempet">
        <span className="text-accent">Pipeline</span>
        <span className="mx-1.5">/</span>
        <span>Møder</span>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-6">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-tekst">
          <CalendarCheck className="h-5 w-5 text-tekst-daempet" strokeWidth={1.75} />
          Møder
        </h1>
        <p className="mb-6 mt-1 text-sm text-tekst-daempet">
          Booket via Ringeliste. Et møde tæller først fra kundens saldo, når det er markeret
          afholdt, og alle fire kvalitetstjek er bekræftet.
        </p>

        {error && (
          <p className="rounded border border-spaerret/30 bg-spaerret/10 px-3 py-2 text-sm text-spaerret">
            Kunne ikke hente møder: {error.message}
          </p>
        )}

        {!error && (
          <>
            <h2 className="mb-3 text-sm font-semibold text-tekst">
              Planlagte ({planlagte.length})
            </h2>
            {planlagte.length === 0 ? (
              <div className="rounded-lg border border-kant bg-flade px-6 py-8 text-center">
                <p className="text-sm text-tekst">Ingen planlagte møder.</p>
                <p className="mt-1 text-sm text-tekst-daempet">
                  Book et møde fra Ringeliste for at se det her.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {planlagte.map((m) => (
                  <MoedeRaekke
                    key={m.id}
                    moede={m}
                    virksomhedsnavn={m.leads?.virksomhedsnavn ?? "Ukendt lead"}
                    kundeNavn={m.kunder?.navn ?? "Ukendt kunde"}
                    kundeSaldo={saldoPrKunde.get(m.kunde_id) ?? 0}
                  />
                ))}
              </div>
            )}

            {historik.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-3 text-sm font-semibold text-tekst">Historik</h2>
                <div className="overflow-x-auto rounded-lg border border-kant bg-flade">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-kant text-[11px] uppercase tracking-wide text-tekst-daempet">
                      <tr>
                        <th className="px-4 py-2.5 font-medium">Virksomhed</th>
                        <th className="px-4 py-2.5 font-medium">Kunde</th>
                        <th className="px-4 py-2.5 font-medium">Dato</th>
                        <th className="px-4 py-2.5 font-medium">Status</th>
                        <th className="px-4 py-2.5 font-medium">Begrundelse</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historik.map((m) => (
                        <tr key={m.id} className="border-b border-kant last:border-0">
                          <td className="px-4 py-2.5 text-tekst">
                            {m.leads?.virksomhedsnavn ?? "—"}
                          </td>
                          <td className="px-4 py-2.5 text-tekst-daempet">{m.kunder?.navn ?? "—"}</td>
                          <td className="tal px-4 py-2.5 text-tekst-daempet">
                            {m.dato_tid
                              ? new Date(m.dato_tid).toLocaleDateString("da-DK")
                              : "—"}
                          </td>
                          <td className={`px-4 py-2.5 font-medium ${STATUS_FARVE[m.status] ?? "text-tekst"}`}>
                            {STATUS_LABEL[m.status] ?? m.status}
                          </td>
                          <td className="px-4 py-2.5 text-tekst-daempet">
                            {m.afvisningsgrund ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
