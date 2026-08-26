"use client";

import { useActionState } from "react";
import { sletForaeldetLead } from "./actions";

// Spec.md siger "kan slettes med ét klik" - men sletning er permanent, så
// et window.confirm() foran selve klikket er en rimelig ekstra sikring,
// samme princip som saldo-i-minus-bekræftelsen i Ringeliste.
export function SletKnap({ leadId, virksomhedsnavn }: { leadId: string; virksomhedsnavn: string }) {
  const [state, action] = useActionState(sletForaeldetLead, null);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Slet "${virksomhedsnavn}" permanent? Dette kan ikke fortrydes.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="leadId" value={leadId} />
      <button
        type="submit"
        className="rounded-md border border-spaerret/40 px-2.5 py-1 text-xs text-spaerret transition-colors hover:bg-spaerret/10"
      >
        Slet
      </button>
      {state?.fejl && <p className="mt-1 text-xs text-spaerret">{state.fejl}</p>}
    </form>
  );
}
