import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

// Delt visuel byggesten for de tre "hent/berig"-knapper på leaddetaljer
// (HentSignalerKnap, HentCvrAendringKnap, BerigMedAiKnap) - rent
// præsentationslag, ingen forretningslogik. Erstatter almindelig, ufarvet
// tekst med et ikon + farve, så succes/fejl kan skimmes uden at læse ordene.
export function KnapStatusLinje({ ok, tekst }: { ok: boolean; tekst: string }) {
  return (
    <p className={`flex items-center gap-1.5 text-xs ${ok ? "text-godkendt" : "text-spaerret"}`}>
      {ok ? (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
      ) : (
        <XCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
      )}
      {tekst}
    </p>
  );
}

export function KnapSpinner() {
  return <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" strokeWidth={2} />;
}

// Fælles knap-styling for de tre "hent/berig"-knapper - border-stil (ikke
// glow-accent/bg-accent), da de er dataopdaterende hjælpehandlinger, ikke
// pipeline-ændrende kernehandlinger som "Godkend"/"Tildel". active:scale
// giver et lille "tryk"-feedback ved klik.
export const KNAP_CLASSNAME =
  "inline-flex w-fit items-center gap-1.5 rounded-md border border-kant px-3 py-1.5 text-sm text-tekst-daempet transition-all duration-150 hover:border-accent hover:text-tekst active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100";
