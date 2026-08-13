"use client";

import { useActionState } from "react";
import Link from "next/link";
import { importerLeads, type ImportRapport } from "./actions";

export function ImporterForm() {
  const [rapport, formAction, indsenderNu] = useActionState<ImportRapport | null, FormData>(
    importerLeads,
    null
  );

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-4 rounded border border-kant bg-flade p-6">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-tekst">Navn på import</span>
          <input
            type="text"
            name="soegningNavn"
            required
            placeholder="Fx: Kontorfag Nordjylland, august 2026"
            className="rounded border border-kant bg-flade px-3 py-2 text-tekst outline-none focus-visible:border-accent"
          />
          <span className="text-xs text-tekst-daempet">
            Bruges som navnet på den gemte søgning, importen knyttes til.
          </span>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-tekst">CSV-fil fra cvr.dk</span>
          <input
            type="file"
            name="fil"
            required
            accept=".csv,text/csv"
            className="rounded border border-kant bg-flade px-3 py-2 text-tekst outline-none focus-visible:border-accent"
          />
        </label>

        <button
          type="submit"
          disabled={indsenderNu}
          className="glow-accent mt-2 w-fit rounded bg-accent px-4 py-2 text-sm font-medium text-accent-tekst disabled:opacity-60 disabled:shadow-none"
        >
          {indsenderNu ? "Importerer…" : "Start import"}
        </button>
      </form>

      {rapport?.fejl && (
        <p className="rounded border border-spaerret/30 bg-spaerret/5 px-4 py-3 text-sm text-spaerret">
          {rapport.fejl}
        </p>
      )}

      {rapport && !rapport.fejl && (
        <div className="flex flex-col gap-4 rounded border border-kant bg-flade p-6">
          <h2 className="text-base font-semibold text-tekst">
            Importrapport: {rapport.soegningNavn}
          </h2>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-tekst-daempet">Rækker i filen</dt>
              <dd className="tal text-tekst">{rapport.antalRaekkerIFilen}</dd>
            </div>
            <div>
              <dt className="text-tekst-daempet">Importeret</dt>
              <dd className="tal text-tekst">{rapport.antalImporteret}</dd>
            </div>
            <div>
              <dt className="text-tekst-daempet">Spærret</dt>
              <dd className="tal text-spaerret">{rapport.antalSpaerret}</dd>
            </div>
            <div>
              <dt className="text-tekst-daempet">Frasorteret</dt>
              <dd className="tal text-tekst">{rapport.frasorteret.length}</dd>
            </div>
          </dl>

          {rapport.advarselGraenseOverskredet && (
            <p className="rounded border border-advarsel/40 bg-advarsel-baggrund px-4 py-3 text-sm text-advarsel">
              Du har nu {rapport.samletAntalLeadsEfter} leads i systemet i alt — over grænsen på{" "}
              {rapport.advarselGraense}. Leads uden aktivitet slettes efter 12 måneder. Importér
              kun det, du reelt vil arbejde med.
            </p>
          )}

          {rapport.frasorteret.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-tekst">
                Frasorterede rækker ({rapport.frasorteret.length}) — hvorfor
              </summary>
              <ul className="mt-2 flex flex-col gap-1 border-l border-kant pl-3">
                {rapport.frasorteret.map((r, i) => (
                  <li key={i} className="text-tekst-daempet">
                    Række {r.raekkenummer}
                    {r.cvr_nummer ? ` (CVR ${r.cvr_nummer})` : ""}: {r.aarsag}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {rapport.advarsler.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-tekst">
                Advarsler ({rapport.advarsler.length}) — importeret, men tjek dette
              </summary>
              <ul className="mt-2 flex flex-col gap-1 border-l border-kant pl-3">
                {rapport.advarsler.map((a, i) => (
                  <li key={i} className="text-tekst-daempet">
                    Række {a.raekkenummer} (CVR {a.cvr_nummer}): {a.besked}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {rapport.muligeDubletter.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-tekst">
                Mulige dubletter ({rapport.muligeDubletter.length}) — samme navn og postnummer,
                forskelligt CVR-nummer
              </summary>
              <ul className="mt-2 flex flex-col gap-1 border-l border-kant pl-3">
                {rapport.muligeDubletter.map((d, i) => (
                  <li key={i} className="text-tekst-daempet">
                    {d.navn} ({d.postnr}): CVR {d.cvrNumre.join(", ")}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <Link href="/leads" className="w-fit text-sm text-accent underline">
            Se leads
          </Link>
        </div>
      )}
    </div>
  );
}
