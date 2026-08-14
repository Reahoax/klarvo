"use client";

import { useState } from "react";
import Link from "next/link";
import { INDVENDINGER } from "@/lib/leads/indvendinger.ts";
import { gemAktivitet } from "./actions";
import { MoedeBookingModal } from "./moede-booking-modal";

export type Kandidat = {
  id: string;
  virksomhedsnavn: string;
  cvr_nummer: string;
  kontaktperson_navn: string | null;
  kontaktperson_titel: string | null;
  telefon: string | null;
  branchetekst: string | null;
  by: string | null;
  kunde_id: string | null;
  antal_forsoeg: number;
  manuskript: { id: string; version: number; indhold: string } | null;
};

const UDFALD_KNAPPER: { udfald: string; label: string; klasse: string }[] = [
  {
    udfald: "ring_igen",
    label: "Ring igen",
    klasse: "bg-advarsel text-accent-tekst hover:opacity-90",
  },
  {
    udfald: "lagde_paa",
    label: "Lagde på",
    klasse: "border border-kant text-tekst-daempet hover:border-tekst-daempet hover:text-tekst",
  },
  {
    udfald: "ikke_kontakt",
    label: "Ikke kontakt",
    klasse: "border border-kant text-tekst-daempet hover:border-tekst-daempet hover:text-tekst",
  },
  {
    udfald: "ikke_interesseret",
    label: "Ikke interesseret",
    klasse: "bg-spaerret text-accent-tekst hover:opacity-90",
  },
];

type AabenBooking = {
  leadId: string;
  kundeId: string;
  virksomhedsnavn: string;
  deltagerNavnStandard: string;
  deltagerTitelStandard: string;
};

// Ejer selv booking-modal-tilstanden (i stedet for at hvert kandidatkort gør
// det), fordi en vellykket booking lukker leadet og fjerner det fra
// `kandidater` ved næste server-genhentning - havde modalen ligget inde i
// kortet, ville den (og bekræftelsesteksten, brugeren skal nå at kopiere)
// forsvinde midt i det hele, fordi kortet selv bliver afmonteret. Denne
// wrapper overlever, fordi listens overordnede struktur består, selvom
// indholdet af `kandidater` ændrer sig.
export function KandidatListe({ kandidater }: { kandidater: Kandidat[] }) {
  const [aabenBooking, setAabenBooking] = useState<AabenBooking | null>(null);

  if (kandidater.length === 0) {
    return (
      <>
        <div className="rounded-lg border border-kant bg-flade px-6 py-10 text-center">
          <p className="text-sm text-tekst">Ringelisten er tom.</p>
          <p className="mt-1 text-sm text-tekst-daempet">
            Godkend kvalificerede leads fra deres detaljeside for at lægge dem i køen.
          </p>
        </div>
        {aabenBooking && (
          <MoedeBookingModal {...aabenBooking} onLuk={() => setAabenBooking(null)} />
        )}
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {kandidater.map((k) => {
          const kontekst =
            [k.branchetekst, k.by].filter(Boolean).join(" · ") || "Ingen yderligere kontekst";
          const kanBookeMoede = k.kunde_id !== null;
          const ringFormId = `ringform-${k.id}`;

          return (
            <div key={k.id} className="kort-hover rounded-lg border border-kant bg-flade p-5">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/leads/${k.id}`}
                    className="text-base font-semibold text-tekst hover:text-accent"
                  >
                    {k.virksomhedsnavn}
                  </Link>
                  <p className="mt-0.5 text-sm text-tekst-daempet">
                    {k.kontaktperson_navn ?? "Ingen kontaktperson registreret"}
                    {k.kontaktperson_titel ? ` · ${k.kontaktperson_titel}` : ""}
                  </p>
                  <p className="tal mt-0.5 text-sm text-tekst-daempet">
                    {k.telefon ?? "Intet telefonnummer"}
                  </p>
                  <p className="mt-1 text-xs text-tekst-daempet">{kontekst}</p>
                </div>
                {k.antal_forsoeg > 0 && (
                  <span className="tal shrink-0 rounded-full border border-advarsel/40 bg-advarsel-baggrund px-2.5 py-1 text-xs text-advarsel">
                    Forsøg {k.antal_forsoeg + 1} af 4
                  </span>
                )}
              </div>

              {k.manuskript && (
                <div className="mb-3 rounded-md border border-kant bg-baggrund px-3 py-2">
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-tekst-daempet">
                    Manuskript v{k.manuskript.version}
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-tekst-daempet">
                    {k.manuskript.indhold}
                  </p>
                </div>
              )}

              <form
                id={ringFormId}
                action={gemAktivitet}
                className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center"
              >
                <input type="hidden" name="leadId" value={k.id} />
                <input type="hidden" name="kundeId" value={k.kunde_id ?? ""} />
                <input type="hidden" name="manuskriptId" value={k.manuskript?.id ?? ""} />
                <input
                  type="text"
                  name="note"
                  placeholder="Notat (valgfrit)"
                  className="flex-1 rounded border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none focus-visible:border-accent"
                />
                <input
                  type="date"
                  name="ring_igen_dato"
                  title="Ring igen-dato (bruges kun ved udfaldet 'Ring igen'; ellers +2 dage som standard)"
                  className="rounded border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none focus-visible:border-accent"
                />
                <select
                  name="indvending"
                  title="Indvending (bruges kun ved 'Lagde på'/'Ikke interesseret')"
                  defaultValue=""
                  className="rounded border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none focus-visible:border-accent"
                >
                  <option value="">Indvending (valgfrit)</option>
                  {INDVENDINGER.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </form>

              <div className="flex flex-wrap gap-2">
                {kanBookeMoede ? (
                  <button
                    type="button"
                    onClick={() =>
                      setAabenBooking({
                        leadId: k.id,
                        kundeId: k.kunde_id!,
                        virksomhedsnavn: k.virksomhedsnavn,
                        deltagerNavnStandard: k.kontaktperson_navn ?? "",
                        deltagerTitelStandard: k.kontaktperson_titel ?? "",
                      })
                    }
                    className="rounded-md bg-godkendt px-3 py-1.5 text-sm font-medium text-accent-tekst transition-colors hover:opacity-90"
                  >
                    Møde booket
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    title="Kræver at leadet er tildelt en kunde (Kunder/Matching er ikke bygget endnu)"
                    className="cursor-not-allowed rounded-md border border-kant px-3 py-1.5 text-sm text-tekst-daempet/40"
                  >
                    Møde booket
                  </button>
                )}
                {UDFALD_KNAPPER.map((k2) => (
                  <button
                    key={k2.udfald}
                    type="submit"
                    form={ringFormId}
                    name="udfald"
                    value={k2.udfald}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${k2.klasse}`}
                  >
                    {k2.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {aabenBooking && (
        <MoedeBookingModal {...aabenBooking} onLuk={() => setAabenBooking(null)} />
      )}
    </>
  );
}
