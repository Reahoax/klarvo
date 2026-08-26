"use client";

import { useActionState } from "react";
import { hentLeadSignaler } from "./actions";
import { KnapStatusLinje, KnapSpinner, KNAP_CLASSNAME } from "./knap-status";

export function HentSignalerKnap({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState(hentLeadSignaler, null);

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="leadId" value={leadId} />
      <button type="submit" disabled={pending} className={KNAP_CLASSNAME}>
        {pending && <KnapSpinner />}
        {pending ? "Henter…" : "Hent signaler"}
      </button>
      {state?.fejl && <KnapStatusLinje ok={false} tekst={state.fejl} />}
      {state?.website && <KnapStatusLinje ok={state.website.ok} tekst={`Hjemmeside: ${state.website.besked}`} />}
      {state?.jobopslag && <KnapStatusLinje ok={state.jobopslag.ok} tekst={`Jobopslag: ${state.jobopslag.besked}`} />}
    </form>
  );
}
