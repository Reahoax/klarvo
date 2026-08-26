"use client";

import { useActionState } from "react";
import { hentCvrAendring } from "./actions";

export function HentCvrAendringKnap({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState(hentCvrAendring, null);

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="leadId" value={leadId} />
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md border border-kant px-3 py-1.5 text-sm text-tekst-daempet transition-colors hover:border-accent hover:text-tekst disabled:opacity-60"
      >
        {pending ? "Henter…" : "Hent CVR-historik"}
      </button>
      {state?.fejl && <p className="text-xs text-spaerret">{state.fejl}</p>}
      {state?.besked && <p className="text-xs text-godkendt">{state.besked}</p>}
    </form>
  );
}
