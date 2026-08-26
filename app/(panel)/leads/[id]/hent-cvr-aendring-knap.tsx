"use client";

import { useActionState } from "react";
import { hentCvrAendring } from "./actions";
import { KnapStatusLinje, KnapSpinner, KNAP_CLASSNAME } from "./knap-status";

export function HentCvrAendringKnap({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState(hentCvrAendring, null);

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="leadId" value={leadId} />
      <button type="submit" disabled={pending} className={KNAP_CLASSNAME}>
        {pending && <KnapSpinner />}
        {pending ? "Henter…" : "Hent CVR-historik"}
      </button>
      {state?.fejl && <KnapStatusLinje ok={false} tekst={state.fejl} />}
      {state?.besked && <KnapStatusLinje ok={true} tekst={state.besked} />}
    </form>
  );
}
