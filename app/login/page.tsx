"use client";

import { useActionState } from "react";
import { logInd } from "./actions";

// Ingen selvbetjent oprettelse af konto her med vilje - "ét delt login" i specen betyder
// at de to konti oprettes manuelt (Supabase-dashboard), ikke via en offentlig formular.
export default function LoginSide() {
  const [fejl, formAction, indsenderNu] = useActionState(logInd, null);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-baggrund px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[120px]"
      />
      <div className="relative w-full max-w-sm rounded-xl border border-kant bg-flade p-8 shadow-2xl shadow-black/40">
        <h1 className="mb-1 text-lg font-semibold text-tekst">Klarvo</h1>
        <p className="mb-6 text-sm text-tekst-daempet">
          Log ind for at åbne lead-panelet.
        </p>

        <form action={formAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-tekst">E-mail</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="rounded border border-kant bg-flade px-3 py-2 text-tekst outline-none transition-colors focus-visible:border-accent"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-tekst">Adgangskode</span>
            <input
              type="password"
              name="adgangskode"
              required
              autoComplete="current-password"
              className="rounded border border-kant bg-flade px-3 py-2 text-tekst outline-none transition-colors focus-visible:border-accent"
            />
          </label>

          {fejl && (
            <p className="rounded border border-spaerret/30 bg-spaerret/5 px-3 py-2 text-sm text-spaerret">
              {fejl}
            </p>
          )}

          <button
            type="submit"
            disabled={indsenderNu}
            className="glow-accent mt-2 rounded bg-accent px-4 py-2 text-sm font-medium text-accent-tekst disabled:opacity-60 disabled:shadow-none"
          >
            {indsenderNu ? "Logger ind…" : "Log ind"}
          </button>
        </form>
      </div>
    </main>
  );
}
