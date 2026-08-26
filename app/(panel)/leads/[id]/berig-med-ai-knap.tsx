"use client";

import { useActionState } from "react";
import { berigLeadMedAi } from "./actions";
import { KnapStatusLinje, KnapSpinner, KNAP_CLASSNAME } from "./knap-status";

export function BerigMedAiKnap({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState(berigLeadMedAi, null);

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="leadId" value={leadId} />
      <button type="submit" disabled={pending} className={KNAP_CLASSNAME}>
        {pending && <KnapSpinner />}
        {pending ? "Beriger…" : "Berig med AI"}
      </button>
      {state?.fejl && <KnapStatusLinje ok={false} tekst={state.fejl} />}
      {state?.besked && <KnapStatusLinje ok={true} tekst={state.besked} />}
    </form>
  );
}
