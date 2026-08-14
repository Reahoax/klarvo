"use client";

import { useActionState, useState } from "react";
import { CalendarCheck, Copy, Check } from "lucide-react";
import { bookMoede } from "./actions";

const MOEDEFORMER: { vaerdi: "fysisk" | "online" | "telefon"; label: string }[] = [
  { vaerdi: "fysisk", label: "Fysisk" },
  { vaerdi: "online", label: "Online" },
  { vaerdi: "telefon", label: "Telefon" },
];

// Etape 10 — Bookingflow. Kontrolleret udefra (KandidatListe): åben/luk og
// hvilket lead det gælder, ejes af en forælder der ikke afmonteres, når
// leadet forsvinder fra ringelisten efter en vellykket booking - se
// kommentaren i kandidat-liste.tsx for hvorfor det er nødvendigt.
export function MoedeBookingModal({
  leadId,
  kundeId,
  virksomhedsnavn,
  deltagerNavnStandard,
  deltagerTitelStandard,
  onLuk,
}: {
  leadId: string;
  kundeId: string;
  virksomhedsnavn: string;
  deltagerNavnStandard: string;
  deltagerTitelStandard: string;
  onLuk: () => void;
}) {
  const [state, action, pending] = useActionState(bookMoede, null);
  const [kopieret, setKopieret] = useState(false);

  async function kopierTekst() {
    if (!state?.bekraeftelsestekst) return;
    await navigator.clipboard.writeText(state.bekraeftelsestekst);
    setKopieret(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !state?.ok && onLuk()}
        aria-hidden
      />
      <div className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-kant bg-flade shadow-2xl shadow-black/50">
        <div className="flex items-center gap-2 border-b border-kant px-5 py-4">
          <CalendarCheck className="h-5 w-5 text-tekst-daempet" strokeWidth={1.75} />
          <h2 className="text-base font-semibold text-tekst">Book møde — {virksomhedsnavn}</h2>
        </div>

        {!state?.ok && (
          <form action={action} className="flex flex-col gap-3 overflow-y-auto px-5 py-4">
            <input type="hidden" name="leadId" value={leadId} />
            <input type="hidden" name="kundeId" value={kundeId} />
            <input type="hidden" name="virksomhedsnavn" value={virksomhedsnavn} />

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-tekst-daempet">Dato og tid</span>
              <input
                type="datetime-local"
                name="dato_tid"
                required
                className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-tekst-daempet">Mødeform</span>
              <select
                name="form"
                required
                defaultValue=""
                className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
              >
                <option value="" disabled>
                  Vælg mødeform
                </option>
                {MOEDEFORMER.map((f) => (
                  <option key={f.vaerdi} value={f.vaerdi}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex gap-3">
              <label className="flex flex-1 flex-col gap-1 text-sm">
                <span className="text-tekst-daempet">Deltagerens navn</span>
                <input
                  type="text"
                  name="deltager_navn"
                  defaultValue={deltagerNavnStandard}
                  className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-sm">
                <span className="text-tekst-daempet">Titel</span>
                <input
                  type="text"
                  name="deltager_titel"
                  defaultValue={deltagerTitelStandard}
                  className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-tekst-daempet">Kontekstnote (valgfri, inkluderes i bekræftelsen)</span>
              <textarea
                name="kontekstnote"
                rows={3}
                className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
              />
            </label>

            {state?.fejl && <p className="text-xs text-spaerret">{state.fejl}</p>}

            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onLuk}
                className="rounded-md border border-kant px-3 py-1.5 text-sm text-tekst-daempet transition-colors hover:border-accent hover:text-tekst"
              >
                Annullér
              </button>
              <button
                type="submit"
                disabled={pending}
                className="glow-accent rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-tekst disabled:opacity-60"
              >
                {pending ? "Booker…" : "Book møde"}
              </button>
            </div>
          </form>
        )}

        {state?.ok && (
          <div className="flex flex-col gap-3 overflow-y-auto px-5 py-4">
            <p className="text-sm text-godkendt">
              Mødet er booket og lagt ind som "planlagt". Kopiér bekræftelsen nedenfor og send
              den selv — systemet sender ikke noget automatisk.
            </p>
            <pre className="whitespace-pre-wrap rounded-md border border-kant bg-baggrund p-3 text-sm text-tekst">
              {state.bekraeftelsestekst}
            </pre>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={kopierTekst}
                className="flex items-center gap-1.5 rounded-md border border-kant px-3 py-1.5 text-sm text-tekst transition-colors hover:border-accent"
              >
                {kopieret ? (
                  <>
                    <Check className="h-4 w-4 text-godkendt" strokeWidth={2} />
                    Kopieret
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" strokeWidth={1.75} />
                    Kopiér tekst
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onLuk}
                className="glow-accent rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-tekst"
              >
                Luk
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
