"use client";

import { useEffect, useState } from "react";
import { opretKunde } from "./actions";

export function NyKundeKnap() {
  const [aaben, setAaben] = useState(false);

  useEffect(() => {
    function paaEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setAaben(false);
    }
    window.addEventListener("keydown", paaEscape);
    return () => window.removeEventListener("keydown", paaEscape);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setAaben(true)}
        className="glow-accent shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-tekst"
      >
        Ny kunde
      </button>

      {aaben && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setAaben(false)}
            aria-hidden
          />
          <div className="relative w-full max-w-md rounded-xl border border-kant bg-flade shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between border-b border-kant px-5 py-4">
              <h2 className="text-base font-semibold text-tekst">Ny kunde</h2>
              <button
                type="button"
                onClick={() => setAaben(false)}
                className="rounded p-1 text-tekst-daempet transition-colors hover:bg-flade-haevet hover:text-tekst"
                aria-label="Luk"
              >
                ✕
              </button>
            </div>

            <form action={opretKunde} className="flex flex-col gap-3 px-5 py-5">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-tekst">Navn</span>
                <input
                  type="text"
                  name="navn"
                  required
                  autoFocus
                  className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-tekst">Kontaktperson</span>
                <input
                  type="text"
                  name="kontaktperson"
                  className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-tekst">Aftalt pris pr. møde (kr.)</span>
                <input
                  type="number"
                  name="pris_pr_moede"
                  min={0}
                  className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
                />
              </label>
              <div className="flex gap-3">
                <label className="flex flex-1 flex-col gap-1 text-sm">
                  <span className="text-tekst">Startdato</span>
                  <input
                    type="date"
                    name="startdato"
                    className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1 text-sm">
                  <span className="text-tekst">Pilot slutter</span>
                  <input
                    type="date"
                    name="pilot_slutdato"
                    className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="glow-accent mt-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-tekst"
              >
                Opret kunde
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
