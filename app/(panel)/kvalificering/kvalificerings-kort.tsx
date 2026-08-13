"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { gemKvalificeringsFelt, type KvalificeringsFelt } from "./actions";

type Lead = {
  id: string;
  virksomhedsnavn: string;
  cvr_nummer: string;
  website: string | null;
  by: string | null;
  ai_resume: string | null;
  fit: "J" | "N" | null;
  behov: "J" | "N" | null;
  oekonomi: "J" | "N" | null;
  person: "J" | "N" | null;
};

const FELTER: { felt: KvalificeringsFelt; label: string; tastJ: string; tastN: string }[] = [
  { felt: "fit", label: "Fit", tastJ: "1", tastN: "2" },
  { felt: "behov", label: "Behov", tastJ: "3", tastN: "4" },
  { felt: "oekonomi", label: "Økonomi", tastJ: "5", tastN: "6" },
  { felt: "person", label: "Person", tastJ: "7", tastN: "8" },
];

// Svarene opdateres lokalt med det samme (optimistisk), og gemmes i baggrunden.
// Uden det ville et hurtigt tastetryk nummer to kunne ramme siden, mens svar
// nummer ét stadig venter på serveren - og enten blive tabt eller forsinket.
// Det er stik imod kravet om, at 50 leads skal kunne gennemgås hurtigt.
export function KvalificeringsKort({ lead }: { lead: Lead }) {
  const router = useRouter();
  const [svar, setSvar] = useState({
    fit: lead.fit,
    behov: lead.behov,
    oekonomi: lead.oekonomi,
    person: lead.person,
  });
  const [fejl, setFejl] = useState<string | null>(null);
  const [visGenveje, setVisGenveje] = useState(false);
  const skifterLead = useRef(false);

  // Nyt lead fra serveren (efter vi er gået videre) - nulstil lokal state til det.
  useEffect(() => {
    setSvar({ fit: lead.fit, behov: lead.behov, oekonomi: lead.oekonomi, person: lead.person });
    skifterLead.current = false;
  }, [lead.id]);

  function gem(felt: KvalificeringsFelt, vaerdi: "J" | "N") {
    if (skifterLead.current) return;
    setFejl(null);

    const naesteSvar = { ...svar, [felt]: vaerdi };
    setSvar(naesteSvar);

    gemKvalificeringsFelt(lead.id, felt, vaerdi).then((resultat) => {
      if (resultat.fejl) {
        setFejl(resultat.fejl);
        return;
      }
      const alleBesvaret = FELTER.every((f) => naesteSvar[f.felt] !== null);
      if (alleBesvaret && !skifterLead.current) {
        skifterLead.current = true;
        router.refresh();
      }
    });
  }

  useEffect(() => {
    function paaTastetryk(e: KeyboardEvent) {
      if (e.key === "?") {
        setVisGenveje((v) => !v);
        return;
      }
      for (const f of FELTER) {
        if (e.key === f.tastJ) gem(f.felt, "J");
        if (e.key === f.tastN) gem(f.felt, "N");
      }
    }
    window.addEventListener("keydown", paaTastetryk);
    return () => window.removeEventListener("keydown", paaTastetryk);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id, svar]);

  const besvaret = FELTER.filter((f) => svar[f.felt] !== null).length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-xs text-tekst-daempet">
        <span>{besvaret} af 4 besvaret</span>
        <button
          type="button"
          onClick={() => setVisGenveje((v) => !v)}
          className="rounded border border-kant px-2 py-1 hover:border-accent hover:text-tekst"
        >
          Tastaturgenveje (?)
        </button>
      </div>

      {visGenveje && (
        <div className="mb-4 rounded-lg border border-kant bg-flade p-3 text-xs text-tekst-daempet">
          {FELTER.map((f) => (
            <p key={f.felt}>
              <span className="tal text-tekst">{f.tastJ}</span> = {f.label} Ja ·{" "}
              <span className="tal text-tekst">{f.tastN}</span> = {f.label} Nej
            </p>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-kant bg-flade p-6">
        <h2 className="text-lg font-semibold text-tekst">{lead.virksomhedsnavn}</h2>
        <p className="mt-1 text-sm text-tekst-daempet">
          CVR {lead.cvr_nummer}
          {lead.by ? ` · ${lead.by}` : ""}
        </p>
        {lead.website ? (
          <a
            href={
              lead.website.startsWith("http") ? lead.website : `https://${lead.website}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-sm text-accent hover:underline"
          >
            Besøg hjemmeside ↗
          </a>
        ) : (
          <p className="mt-1 text-sm text-tekst-daempet">Ingen hjemmeside registreret</p>
        )}

        <div className="mt-4 rounded border border-kant bg-baggrund p-3">
          <p className="mb-1 text-[11px] uppercase tracking-wide text-tekst-daempet">
            AI-resumé <span className="normal-case">— ikke verificeret</span>
          </p>
          <p className="text-sm text-tekst-daempet">
            {lead.ai_resume ?? "Ikke genereret endnu — AI-berigelse kommer i Etape 5."}
          </p>
        </div>

        {fejl && (
          <p className="mt-4 rounded border border-spaerret/30 bg-spaerret/10 px-3 py-2 text-sm text-spaerret">
            Kunne ikke gemme: {fejl}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {FELTER.map((f) => (
            <div key={f.felt} className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-tekst">{f.label}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => gem(f.felt, "J")}
                  className={
                    svar[f.felt] === "J"
                      ? "glow-accent-blod rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-accent-tekst"
                      : "rounded-md border border-kant px-4 py-1.5 text-sm text-tekst-daempet transition-colors hover:border-accent hover:text-tekst"
                  }
                >
                  Ja <span className="tal text-xs opacity-60">({f.tastJ})</span>
                </button>
                <button
                  type="button"
                  onClick={() => gem(f.felt, "N")}
                  className={
                    svar[f.felt] === "N"
                      ? "rounded-md bg-spaerret px-4 py-1.5 text-sm font-medium text-accent-tekst"
                      : "rounded-md border border-kant px-4 py-1.5 text-sm text-tekst-daempet transition-colors hover:border-spaerret hover:text-tekst"
                  }
                >
                  Nej <span className="tal text-xs opacity-60">({f.tastN})</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
