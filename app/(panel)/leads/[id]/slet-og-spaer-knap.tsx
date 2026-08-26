"use client";

import { useActionState } from "react";
import { sletOgSpaerLead } from "../../indsigt/actions";
import { KnapStatusLinje } from "./knap-status";

// GDPR-sletteanmodning (Spec.md, Etape 12) - adskilt fra R7-sletterutinens
// "Slet"-knap ved at bekræftelsesteksten er tydelig om, at dette OGSÅ
// spærrer virksomheden permanent (opt_out_register), ikke kun sletter data.
export function SletOgSpaerKnap({ leadId, virksomhedsnavn }: { leadId: string; virksomhedsnavn: string }) {
  const [state, action] = useActionState(sletOgSpaerLead, null);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `Slet "${virksomhedsnavn}" permanent og spær virksomheden fra fremtidig kontakt (GDPR-sletteanmodning)? Dette kan ikke fortrydes.`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="leadId" value={leadId} />
      <button
        type="submit"
        className="rounded-md border border-spaerret/40 px-3 py-1.5 text-sm text-spaerret transition-colors hover:bg-spaerret/10"
      >
        Slet og spær (GDPR)
      </button>
      {state?.fejl && <div className="mt-1"><KnapStatusLinje ok={false} tekst={state.fejl} /></div>}
    </form>
  );
}
