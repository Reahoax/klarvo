"use client";

import { useActionState } from "react";
import { hentLeadSignaler } from "./actions";

export function HentSignalerKnap({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState(hentLeadSignaler, null);

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="leadId" value={leadId} />
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md border border-kant px-3 py-1.5 text-sm text-tekst-daempet transition-colors hover:border-accent hover:text-tekst disabled:opacity-60"
      >
        {pending ? "Henter…" : "Hent signaler"}
      </button>
      {state?.fejl && <p className="text-xs text-spaerret">{state.fejl}</p>}
      {state?.website && (
        <p className={`text-xs ${state.website.ok ? "text-godkendt" : "text-spaerret"}`}>
          Hjemmeside: {state.website.besked}
        </p>
      )}
      {state?.jobopslag && (
        <p className={`text-xs ${state.jobopslag.ok ? "text-godkendt" : "text-spaerret"}`}>
          Jobopslag: {state.jobopslag.besked}
        </p>
      )}
    </form>
  );
}
