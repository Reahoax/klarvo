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
      {state?.ok && <p className="text-xs text-godkendt">{state.besked}</p>}
    </form>
  );
}
