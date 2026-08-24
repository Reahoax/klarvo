"use client";

import { useState } from "react";
import { tildelKunde } from "./actions";

type Segment = { id: string; navn: string; aktiv: boolean };
type Kunde = { id: string; navn: string; aktive: boolean; segmenter: Segment[] };

// Klientkomponent, fordi segment-checkboksene skal filtreres til kun den
// valgte kundes segmenter uden en sideindlæsning - se
// app/(panel)/leads/[id]/actions.ts's tildelKunde for selve gemningen.
export function TildelKundeForm({
  leadId,
  kunder,
  initialKundeId,
  initialSegmentIds,
}: {
  leadId: string;
  kunder: Kunde[];
  initialKundeId: string | null;
  initialSegmentIds: string[];
}) {
  const [kundeId, setKundeId] = useState(initialKundeId ?? "");
  const [segmentIds, setSegmentIds] = useState<Set<string>>(new Set(initialSegmentIds));

  const valgtKunde = kunder.find((k) => k.id === kundeId);
  const aktiveSegmenter = (valgtKunde?.segmenter ?? []).filter((s) => s.aktiv);

  return (
    <form action={tildelKunde} className="flex flex-col gap-2 text-sm">
      <input type="hidden" name="leadId" value={leadId} />
      <label className="flex flex-col gap-1">
        <span className="text-tekst-daempet">Kunde</span>
        <select
          name="kundeId"
          value={kundeId}
          onChange={(e) => {
            setKundeId(e.target.value);
            setSegmentIds(new Set());
          }}
          className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
        >
          <option value="">Ingen (ukoblet)</option>
          {kunder.map((k) => (
            <option key={k.id} value={k.id}>
              {k.navn}
              {!k.aktive ? " (inaktiv)" : ""}
            </option>
          ))}
        </select>
      </label>

      {kundeId && aktiveSegmenter.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-tekst-daempet">Segmenter (valgfrit)</span>
          {aktiveSegmenter.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-tekst">
              <input
                type="checkbox"
                name="segmentIds"
                value={s.id}
                checked={segmentIds.has(s.id)}
                onChange={(e) => {
                  const nyt = new Set(segmentIds);
                  if (e.target.checked) nyt.add(s.id);
                  else nyt.delete(s.id);
                  setSegmentIds(nyt);
                }}
              />
              {s.navn}
            </label>
          ))}
        </div>
      )}
      {kundeId && aktiveSegmenter.length === 0 && (
        <p className="text-xs text-tekst-daempet">Denne kunde har ingen aktive segmenter endnu.</p>
      )}

      <button
        type="submit"
        className="w-fit rounded-md border border-kant px-3 py-1.5 text-sm text-tekst-daempet transition-colors hover:border-accent hover:text-tekst"
      >
        Gem
      </button>
    </form>
  );
}
