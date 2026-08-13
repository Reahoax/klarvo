"use client";

import { useActionState, useEffect, useState } from "react";
import { opdaterNavn, skiftAdgangskode, gemForretningsregler } from "./indstillinger-actions";
import { TemaVaelger } from "./tema-vaelger";

type Konfiguration = {
  tilladte_virksomhedsformer: string[];
  virksomhedsformer_fysiske_personer: string[];
  import_advarsel_graense: number;
  ringetid_fra: string;
  ringetid_til: string;
  ringetid_ugedage: number[];
} | null;

const UGEDAGE = [
  { tal: 1, label: "Man" },
  { tal: 2, label: "Tir" },
  { tal: 3, label: "Ons" },
  { tal: 4, label: "Tor" },
  { tal: 5, label: "Fre" },
  { tal: 6, label: "Lør" },
  { tal: 7, label: "Søn" },
] as const;

type Sektion = "konto" | "udseende" | "forretningsregler";

// Pop-op igen (2026-08-13): var kortvarigt en fuld side (/indstillinger), men
// brugeren ville have den tilbage som pop-op - "ligesom her i Claude". Selve
// sidebar+sektions-indholdet fra siden er bevaret uændret, kun rammen er nu
// en modal (fixed inset-0 + backdrop) i stedet for en route.
export function IndstillingerModal({
  email,
  rolle,
  navn,
  konfiguration,
  onLuk,
}: {
  email: string | undefined;
  rolle: string;
  navn: string | null;
  konfiguration: Konfiguration;
  onLuk: () => void;
}) {
  const erEjer = rolle === "ejer";
  const [sektion, setSektion] = useState<Sektion>("konto");

  useEffect(() => {
    function paaEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onLuk();
    }
    window.addEventListener("keydown", paaEscape);
    return () => window.removeEventListener("keydown", paaEscape);
  }, [onLuk]);

  const punkter: { id: Sektion; label: string }[] = [
    { id: "konto", label: "Konto" },
    { id: "udseende", label: "Udseende" },
    ...(erEjer ? ([{ id: "forretningsregler", label: "Forretningsregler" }] as const) : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onLuk} aria-hidden />

      <div className="relative flex max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-xl border border-kant bg-flade shadow-2xl shadow-black/50">
        <nav className="w-48 shrink-0 overflow-y-auto border-r border-kant bg-flade-haevet/40 p-3">
          <p className="mb-2 px-2 text-sm font-semibold text-tekst">Indstillinger</p>
          <ul className="flex flex-col gap-0.5">
            {punkter.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setSektion(p.id)}
                  className={
                    sektion === p.id
                      ? "block w-full rounded-md bg-flade-haevet px-3 py-1.5 text-left text-sm font-medium text-tekst"
                      : "block w-full rounded-md px-3 py-1.5 text-left text-sm text-tekst-daempet transition-colors hover:bg-flade-haevet hover:text-tekst"
                  }
                >
                  {p.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-end border-b border-kant px-4 py-2.5">
            <button
              type="button"
              onClick={onLuk}
              className="rounded p-1 text-tekst-daempet transition-colors hover:bg-flade-haevet hover:text-tekst"
              aria-label="Luk"
            >
              ✕
            </button>
          </div>
          <div className="min-w-0 flex-1 overflow-y-auto px-6 py-6">
            {sektion === "konto" && <KontoSektion email={email} rolle={rolle} navn={navn} />}
            {sektion === "udseende" && <UdseendeSektion />}
            {sektion === "forretningsregler" && erEjer && (
              <ForretningsreglerSektion konfiguration={konfiguration} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KontoSektion({
  email,
  rolle,
  navn,
}: {
  email: string | undefined;
  rolle: string;
  navn: string | null;
}) {
  const [navnState, navnAction, navnPending] = useActionState(opdaterNavn, null);
  const [kodeState, kodeAction, kodePending] = useActionState(skiftAdgangskode, null);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-4 text-lg font-semibold text-tekst">Konto</h1>
        <p className="text-sm text-tekst">{email}</p>
        <p className="text-xs text-tekst-daempet">{rolle === "ejer" ? "Ejer" : "Operatør"}</p>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-tekst-daempet">
          Navn
        </h2>
        <form action={navnAction} className="flex gap-2">
          <input
            type="text"
            name="navn"
            defaultValue={navn ?? ""}
            placeholder="Dit navn"
            className="flex-1 rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
          />
          <button
            type="submit"
            disabled={navnPending}
            className="glow-accent shrink-0 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-tekst disabled:opacity-60"
          >
            Gem
          </button>
        </form>
        {navnState?.fejl && <p className="mt-1.5 text-xs text-spaerret">{navnState.fejl}</p>}
        {navnState?.ok && <p className="mt-1.5 text-xs text-godkendt">Gemt.</p>}
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-tekst-daempet">
          Adgangskode
        </h2>
        <form action={kodeAction} className="flex flex-col gap-2 sm:max-w-xs">
          <input
            type="password"
            name="ny_adgangskode"
            placeholder="Ny adgangskode (min. 8 tegn)"
            autoComplete="new-password"
            className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
          />
          <input
            type="password"
            name="gentag_adgangskode"
            placeholder="Gentag ny adgangskode"
            autoComplete="new-password"
            className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
          />
          <button
            type="submit"
            disabled={kodePending}
            className="w-fit rounded-md border border-kant px-3 py-1.5 text-sm text-tekst transition-colors hover:border-accent disabled:opacity-60"
          >
            Skift adgangskode
          </button>
        </form>
        {kodeState?.fejl && <p className="mt-1.5 text-xs text-spaerret">{kodeState.fejl}</p>}
        {kodeState?.ok && <p className="mt-1.5 text-xs text-godkendt">Adgangskode skiftet.</p>}
      </section>
    </div>
  );
}

function UdseendeSektion() {
  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-tekst">Udseende</h1>
      <TemaVaelger />
    </div>
  );
}

function ForretningsreglerSektion({ konfiguration }: { konfiguration: Konfiguration }) {
  const [state, action, pending] = useActionState(gemForretningsregler, null);

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-tekst">Forretningsregler</h1>
      <p className="mb-4 text-sm text-tekst-daempet">
        Styrer R4-filteret ved CSV-import (Leads → Importér leads). Kun synlig for ejere.
      </p>

      <form action={action} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-tekst-daempet">
            Tilladte virksomhedsformer (kommasepareret)
          </label>
          <input
            type="text"
            name="tilladte_virksomhedsformer"
            defaultValue={(konfiguration?.tilladte_virksomhedsformer ?? []).join(", ")}
            placeholder="Fx: ApS, A/S"
            className="w-full rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-tekst-daempet">
            Virksomhedsformer for fysiske personer (kommasepareret)
          </label>
          <input
            type="text"
            name="virksomhedsformer_fysiske_personer"
            defaultValue={(konfiguration?.virksomhedsformer_fysiske_personer ?? []).join(", ")}
            placeholder="Fx: Enkeltmandsvirksomhed"
            className="w-full rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
          />
          <p className="mt-1 text-xs text-tekst-daempet">
            Tilføjes en af disse til listen ovenfor, viser importsiden en advarsel om
            Robinsonliste-tjek.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-tekst-daempet">
            Import-advarselsgrænse
          </label>
          <input
            type="number"
            name="import_advarsel_graense"
            min={0}
            defaultValue={konfiguration?.import_advarsel_graense ?? undefined}
            className="w-32 rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
          />
          <p className="mt-1 text-xs text-tekst-daempet">
            Advarer ved import, hvis det samlede antal leads efter importen overstiger dette tal.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-tekst-daempet">
            Ringetidsvindue
          </label>
          <p className="mb-2 text-xs text-tekst-daempet">
            Ringelisten skjules automatisk uden for disse tidspunkter og ugedage.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="time"
              name="ringetid_fra"
              defaultValue={konfiguration?.ringetid_fra?.slice(0, 5)}
              className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none focus-visible:border-accent"
            />
            <span className="text-sm text-tekst-daempet">til</span>
            <input
              type="time"
              name="ringetid_til"
              defaultValue={konfiguration?.ringetid_til?.slice(0, 5)}
              className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none focus-visible:border-accent"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-3">
            {UGEDAGE.map((d) => (
              <label key={d.tal} className="flex items-center gap-1.5 text-xs text-tekst">
                <input
                  type="checkbox"
                  name="ringetid_ugedage"
                  value={d.tal}
                  defaultChecked={(konfiguration?.ringetid_ugedage ?? [1, 2, 3, 4, 5]).includes(
                    d.tal
                  )}
                />
                {d.label}
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="glow-accent w-fit rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-tekst disabled:opacity-60"
        >
          Gem forretningsregler
        </button>
        {state?.fejl && <p className="text-xs text-spaerret">{state.fejl}</p>}
        {state?.ok && <p className="text-xs text-godkendt">Gemt.</p>}
      </form>
    </div>
  );
}
