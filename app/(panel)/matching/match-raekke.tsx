"use client";

import { useState } from "react";
import { tildelKunde } from "../leads/[id]/actions";

// "Afvis" har ingen egen tabel og huskes derfor ikke mellem sideindlæsninger
// (se README "Etablerede mønstre") - den fjerner kun forslaget fra den
// aktuelle visning. Genindlæses siden, dukker det op igen, indtil leadet
// enten er tildelt eller ikke længere matcher (fx fordi ICP'en er ændret).
export function MatchRaekke({
  leadId,
  kundeId,
  virksomhedsnavn,
  cvrNummer,
  kundeNavn,
  begrundelse,
  dpaMangler,
}: {
  leadId: string;
  kundeId: string;
  virksomhedsnavn: string;
  cvrNummer: string;
  kundeNavn: string;
  begrundelse: string;
  dpaMangler: boolean;
}) {
  const [afvist, setAfvist] = useState(false);
  if (afvist) return null;

  return (
    <div className="kort-hover flex flex-col gap-2 rounded-lg border border-kant bg-flade p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-tekst">
          {virksomhedsnavn} <span className="tal text-tekst-daempet">({cvrNummer})</span>
        </p>
        <p className="mt-0.5 text-sm text-tekst-daempet">
          → <span className="text-tekst">{kundeNavn}</span>
          {dpaMangler && (
            <span className="ml-2 rounded-full border border-advarsel/40 bg-advarsel/10 px-2 py-0.5 text-[11px] text-advarsel">
              DPA mangler
            </span>
          )}
        </p>
        <p className="mt-1 text-xs text-tekst-daempet">{begrundelse}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <form action={tildelKunde}>
          <input type="hidden" name="leadId" value={leadId} />
          <input type="hidden" name="kundeId" value={kundeId} />
          <button
            type="submit"
            className="glow-accent rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-tekst"
          >
            Tildel
          </button>
        </form>
        <button
          type="button"
          onClick={() => setAfvist(true)}
          className="rounded-md border border-kant px-3 py-1.5 text-sm text-tekst-daempet transition-colors hover:border-accent hover:text-tekst"
        >
          Afvis
        </button>
      </div>
    </div>
  );
}
