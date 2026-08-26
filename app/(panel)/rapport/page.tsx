import { FileBarChart2, Download } from "lucide-react";
import { opretServerKlient } from "@/lib/supabase/server";
import { hentRapportData } from "@/lib/rapport/hentRapportData.ts";
import { beregnFunnel } from "@/lib/rapport/funnel.ts";

// Etape 10B (Spec.md "F. Rapport" og "Målinger der faktisk betyder noget").
function formatDato(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function standardPeriode(): { fra: string; til: string } {
  const til = new Date();
  const fra = new Date();
  fra.setDate(fra.getDate() - 30);
  return { fra: formatDato(fra), til: formatDato(til) };
}

function pct(v: number | null): string {
  return v === null ? "—" : `${v}%`;
}

export default async function RapportSide({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const standard = standardPeriode();
  const fra = typeof sp.fra === "string" && sp.fra ? sp.fra : standard.fra;
  const til = typeof sp.til === "string" && sp.til ? sp.til : standard.til;

  const supabase = await opretServerKlient();
  const data = await hentRapportData(supabase, fra, til);

  const totalRaa = data.perKunde.reduce(
    (acc, k) => ({
      researchet: acc.researchet + k.funnel.researchet,
      kvalificeret: acc.kvalificeret + k.funnel.kvalificeret,
      ringet: acc.ringet + k.funnel.ringet,
      kontaktOpnaaet: acc.kontaktOpnaaet + k.funnel.kontaktOpnaaet,
      moederBooket: acc.moederBooket + k.funnel.moederBooket,
    }),
    { researchet: 0, kvalificeret: 0, ringet: 0, kontaktOpnaaet: 0, moederBooket: 0 }
  );
  const total = beregnFunnel(totalRaa);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="flex items-center gap-2 text-lg font-semibold text-tekst">
        <FileBarChart2 className="h-5 w-5 text-tekst-daempet" strokeWidth={1.75} />
        Rapport
      </h1>
      <p className="mb-6 text-sm text-tekst-daempet">
        Pr. kunde: antal leads researchet, kvalificeret, ringet, kontakt opnået og møder booket,
        med konverteringsrate mellem hvert trin. "Researchet" er leads, der aktuelt er tilknyttet
        kunden (et øjebliksbillede) - de øvrige trin er afgrænset til den valgte periode.
      </p>

      <form className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-kant bg-flade p-4">
        <label className="flex flex-col gap-1 text-xs text-tekst-daempet">
          Fra
          <input
            type="date"
            name="fra"
            defaultValue={fra}
            className="rounded border border-kant bg-flade-haevet px-2 py-1.5 text-sm text-tekst"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-tekst-daempet">
          Til
          <input
            type="date"
            name="til"
            defaultValue={til}
            className="rounded border border-kant bg-flade-haevet px-2 py-1.5 text-sm text-tekst"
          />
        </label>
        <button
          type="submit"
          className="rounded-md border border-kant px-3 py-1.5 text-sm text-tekst-daempet transition-colors hover:border-accent hover:text-tekst"
        >
          Vis periode
        </button>
        <a
          href={`/api/rapport/eksport?fra=${fra}&til=${til}`}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-kant px-3 py-1.5 text-sm text-tekst-daempet transition-colors hover:border-accent hover:text-tekst"
        >
          <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
          Download CSV
        </a>
      </form>

      <section className="mb-8 overflow-x-auto rounded-lg border border-kant bg-flade">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-kant text-[11px] uppercase tracking-wide text-tekst-daempet">
            <tr>
              <th className="px-4 py-2.5 font-medium">Kunde</th>
              <th className="px-4 py-2.5 text-right font-medium">Researchet</th>
              <th className="px-4 py-2.5 text-right font-medium">Kvalificeret</th>
              <th className="px-4 py-2.5 text-right font-medium">Ringet</th>
              <th className="px-4 py-2.5 text-right font-medium">Kontakt</th>
              <th className="px-4 py-2.5 text-right font-medium">Møder</th>
              <th className="px-4 py-2.5 text-right font-medium" title="Researchet → kvalificeret">
                R→K
              </th>
              <th className="px-4 py-2.5 text-right font-medium" title="Kvalificeret → ringet">
                K→R
              </th>
              <th className="px-4 py-2.5 text-right font-medium" title="Ringet → kontakt opnået">
                R→K
              </th>
              <th className="px-4 py-2.5 text-right font-medium" title="Kontakt opnået → møde booket">
                K→M
              </th>
            </tr>
          </thead>
          <tbody>
            {data.perKunde.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-sm text-tekst-daempet">
                  Ingen kunder oprettet endnu.
                </td>
              </tr>
            )}
            {data.perKunde.map((k) => (
              <tr key={k.kundeId} className="border-b border-kant last:border-0">
                <td className="px-4 py-2.5 text-tekst">{k.navn}</td>
                <td className="tal px-4 py-2.5 text-right text-tekst">{k.funnel.researchet}</td>
                <td className="tal px-4 py-2.5 text-right text-tekst">{k.funnel.kvalificeret}</td>
                <td className="tal px-4 py-2.5 text-right text-tekst">{k.funnel.ringet}</td>
                <td className="tal px-4 py-2.5 text-right text-tekst">{k.funnel.kontaktOpnaaet}</td>
                <td className="tal px-4 py-2.5 text-right text-tekst">{k.funnel.moederBooket}</td>
                <td className="tal px-4 py-2.5 text-right text-tekst-daempet">
                  {pct(k.funnel.konvertering.researchetTilKvalificeret)}
                </td>
                <td className="tal px-4 py-2.5 text-right text-tekst-daempet">
                  {pct(k.funnel.konvertering.kvalificeretTilRinget)}
                </td>
                <td className="tal px-4 py-2.5 text-right text-tekst-daempet">
                  {pct(k.funnel.konvertering.ringetTilKontakt)}
                </td>
                <td className="tal px-4 py-2.5 text-right text-tekst-daempet">
                  {pct(k.funnel.konvertering.kontaktTilMoede)}
                </td>
              </tr>
            ))}
          </tbody>
          {data.perKunde.length > 0 && (
            <tfoot>
              <tr className="border-t border-kant bg-flade-haevet font-medium">
                <td className="px-4 py-2.5 text-tekst">Total</td>
                <td className="tal px-4 py-2.5 text-right text-tekst">{total.researchet}</td>
                <td className="tal px-4 py-2.5 text-right text-tekst">{total.kvalificeret}</td>
                <td className="tal px-4 py-2.5 text-right text-tekst">{total.ringet}</td>
                <td className="tal px-4 py-2.5 text-right text-tekst">{total.kontaktOpnaaet}</td>
                <td className="tal px-4 py-2.5 text-right text-tekst">{total.moederBooket}</td>
                <td className="tal px-4 py-2.5 text-right text-tekst-daempet">
                  {pct(total.konvertering.researchetTilKvalificeret)}
                </td>
                <td className="tal px-4 py-2.5 text-right text-tekst-daempet">
                  {pct(total.konvertering.kvalificeretTilRinget)}
                </td>
                <td className="tal px-4 py-2.5 text-right text-tekst-daempet">
                  {pct(total.konvertering.ringetTilKontakt)}
                </td>
                <td className="tal px-4 py-2.5 text-right text-tekst-daempet">
                  {pct(total.konvertering.kontaktTilMoede)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </section>

      <div className="mb-8 grid gap-6 sm:grid-cols-2">
        <section className="rounded-lg border border-kant bg-flade p-4">
          <h2 className="mb-1 text-sm font-semibold text-tekst">Afvisningsgrunde</h2>
          <p className="mb-3 text-xs text-tekst-daempet">
            Hvorfor kunder afviser booket møder, i perioden. Besvarer "hvor mange møder bliver
            afvist, og af hvilken grund".
          </p>
          {data.afvisningsgrunde.length === 0 ? (
            <p className="text-sm text-tekst-daempet">Ingen afviste møder i perioden.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {data.afvisningsgrunde.map((a) => (
                <li key={a.grund} className="flex items-center justify-between text-sm">
                  <span className="text-tekst">{a.grund}</span>
                  <span className="tal text-tekst-daempet">{a.antal}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-kant bg-flade p-4">
          <h2 className="mb-1 text-sm font-semibold text-tekst">Kontaktperson-titel</h2>
          <p className="mb-3 text-xs text-tekst-daempet">
            Andel af kontaktede leads pr. titel, der endte med et booket møde. Besvarer "hvilken
            titel siger oftest ja".
          </p>
          {data.kontaktTitler.length === 0 ? (
            <p className="text-sm text-tekst-daempet">Ingen kontaktede leads med registreret titel i perioden.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {data.kontaktTitler.map((t) => (
                <li key={t.titel} className="flex items-center justify-between text-sm">
                  <span className="text-tekst">{t.titel}</span>
                  <span className="text-tekst-daempet">
                    <span className="tal">{t.moederBooket}</span>/<span className="tal">{t.kontaktet}</span>{" "}
                    ({pct(t.vinderrate)})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="rounded-lg border border-kant bg-flade px-4 py-3 text-xs text-tekst-daempet">
        Spec.md kræver, at rapporten kan svare på fem spørgsmål. Denne side dækker "opkald pr.
        møde" (kan udledes af Ringet/Møder ovenfor, endnu ikke opdelt pr. segment), afvisningsgrunde
        og kontakttitel. "Hvilket timingsignal giver højest mødrate" afventer flere OSINT-signaler
        (Etape 8). "Hvad tjener vi pr. arbejdstime, pr. kunde" kræver tidsregistrering pr. kunde,
        som ikke er bygget endnu - se README.
      </p>
    </div>
  );
}
