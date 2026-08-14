"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, Circle } from "lucide-react";
import { opdaterKvalitetstjek, skiftMoedeStatus, type Kvalitetstjekfelt } from "./actions";
import { AFVISNINGSGRUNDE } from "@/lib/moeder/afvisningsgrunde.ts";

type MoedeForm = "fysisk" | "online" | "telefon";

export type Moede = {
  id: string;
  dato_tid: string | null;
  form: MoedeForm | null;
  deltager_navn: string | null;
  deltager_titel: string | null;
  kontekstnote: string | null;
  status: string;
  beslutningstager_bekraeftet: boolean;
  icp_bekraeftet: boolean;
  tid_bekraeftet: boolean;
  interesse_bekraeftet: boolean;
  afvisningsgrund: string | null;
};

const FORM_LABEL: Record<MoedeForm, string> = {
  fysisk: "Fysisk",
  online: "Online",
  telefon: "Telefon",
};

const KVALITETSTJEK: { felt: Kvalitetstjekfelt; label: string }[] = [
  { felt: "beslutningstager_bekraeftet", label: "Beslutningstager" },
  { felt: "icp_bekraeftet", label: "Opfylder ICP" },
  { felt: "tid_bekraeftet", label: "Tid/dato bekræftet" },
  { felt: "interesse_bekraeftet", label: "Interesse udtrykt" },
];

function beregnLeveret(status: string, flueben: Record<Kvalitetstjekfelt, boolean>): boolean {
  return status === "afholdt" && KVALITETSTJEK.every((k) => flueben[k.felt]);
}

// Etape 10 — én række pr. planlagt møde: kvalitetstjek (fire flueben, jf.
// Spec.md's krav om at et møde ikke kan blive fakturerbart uden alle fire)
// og statusskift. Saldo-beskyttelsen ("må aldrig gå i minus uden en
// bekræftelsesdialog") sidder her, klient-side, fordi det er her vi kender
// den handling, der reelt gør mødet fakturerbart - enten sidste flueben
// eller selve "marker afholdt", alt efter rækkefølgen brugeren klikker i.
export function MoedeRaekke({
  moede,
  virksomhedsnavn,
  kundeNavn,
  kundeSaldo,
}: {
  moede: Moede;
  virksomhedsnavn: string;
  kundeNavn: string;
  kundeSaldo: number;
}) {
  const [flueben, setFlueben] = useState<Record<Kvalitetstjekfelt, boolean>>({
    beslutningstager_bekraeftet: moede.beslutningstager_bekraeftet,
    icp_bekraeftet: moede.icp_bekraeftet,
    tid_bekraeftet: moede.tid_bekraeftet,
    interesse_bekraeftet: moede.interesse_bekraeftet,
  });
  const [status, setStatus] = useState(moede.status);
  const [visBegrundelse, setVisBegrundelse] = useState(false);
  const [begrundelse, setBegrundelse] = useState("");
  const [fejl, setFejl] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function toggleFelt(felt: Kvalitetstjekfelt) {
    const nyVaerdi = !flueben[felt];
    const nyeFlueben = { ...flueben, [felt]: nyVaerdi };

    const blevLeveretFoer = beregnLeveret(status, flueben);
    const blevLeveretEfter = beregnLeveret(status, nyeFlueben);
    if (!blevLeveretFoer && blevLeveretEfter && kundeSaldo <= 0) {
      const ok = window.confirm(
        `${kundeNavn} har ${kundeSaldo} møder tilbage i saldo. Dette møde vil gøre saldoen negativ. Fortsæt?`
      );
      if (!ok) return;
    }

    setFlueben(nyeFlueben);
    setFejl(null);
    const resultat = await opdaterKvalitetstjek(moede.id, felt, nyVaerdi);
    if (resultat.fejl) {
      setFlueben(flueben);
      setFejl(resultat.fejl);
      return;
    }
    router.refresh();
  }

  async function markerStatus(nyStatus: string, grund?: string) {
    if (nyStatus === "afholdt") {
      const blevLeveretFoer = beregnLeveret(status, flueben);
      const blevLeveretEfter = beregnLeveret(nyStatus, flueben);
      if (!blevLeveretFoer && blevLeveretEfter && kundeSaldo <= 0) {
        const ok = window.confirm(
          `${kundeNavn} har ${kundeSaldo} møder tilbage i saldo. Dette møde vil gøre saldoen negativ. Fortsæt?`
        );
        if (!ok) return;
      }
    }

    setPending(true);
    setFejl(null);
    const resultat = await skiftMoedeStatus(moede.id, nyStatus, grund);
    setPending(false);
    if (resultat.fejl) {
      setFejl(resultat.fejl);
      return;
    }
    setStatus(nyStatus);
    setVisBegrundelse(false);
    router.refresh();
  }

  if (status !== "planlagt") return null;

  return (
    <div className="kort-hover rounded-lg border border-kant bg-flade p-4">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-tekst">
            {virksomhedsnavn} <span className="font-normal text-tekst-daempet">— {kundeNavn}</span>
          </p>
          <p className="tal mt-0.5 text-sm text-tekst-daempet">
            {moede.dato_tid
              ? new Date(moede.dato_tid).toLocaleString("da-DK", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Intet tidspunkt sat"}
            {moede.form && ` · ${FORM_LABEL[moede.form]}`}
          </p>
          {(moede.deltager_navn || moede.deltager_titel) && (
            <p className="mt-0.5 text-xs text-tekst-daempet">
              {[moede.deltager_navn, moede.deltager_titel].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <span className="tal shrink-0 rounded-full border border-kant px-2.5 py-1 text-xs text-tekst-daempet">
          Saldo: {kundeSaldo}
        </span>
      </div>

      {moede.kontekstnote && (
        <p className="mb-3 rounded-md border border-kant bg-baggrund px-3 py-2 text-sm text-tekst-daempet">
          {moede.kontekstnote}
        </p>
      )}

      <div className="mb-3 flex flex-wrap gap-3">
        {KVALITETSTJEK.map((k) => (
          <button
            key={k.felt}
            type="button"
            onClick={() => toggleFelt(k.felt)}
            className="flex items-center gap-1.5 text-sm text-tekst-daempet transition-colors hover:text-tekst"
          >
            {flueben[k.felt] ? (
              <CircleCheck className="h-4 w-4 text-godkendt" strokeWidth={1.75} />
            ) : (
              <Circle className="h-4 w-4" strokeWidth={1.75} />
            )}
            {k.label}
          </button>
        ))}
      </div>

      {fejl && <p className="mb-2 text-xs text-spaerret">{fejl}</p>}

      {!visBegrundelse ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => markerStatus("afholdt")}
            className="glow-accent rounded-md bg-godkendt px-3 py-1.5 text-sm font-medium text-accent-tekst disabled:opacity-60"
          >
            Marker afholdt
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setVisBegrundelse(true)}
            className="rounded-md border border-kant px-3 py-1.5 text-sm text-tekst-daempet transition-colors hover:border-spaerret hover:text-spaerret"
          >
            Afvist af kunde
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => markerStatus("no_show")}
            className="rounded-md border border-kant px-3 py-1.5 text-sm text-tekst-daempet transition-colors hover:border-advarsel hover:text-advarsel"
          >
            No-show
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => markerStatus("aflyst")}
            className="rounded-md border border-kant px-3 py-1.5 text-sm text-tekst-daempet transition-colors hover:border-tekst-daempet hover:text-tekst"
          >
            Aflys
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={begrundelse}
            onChange={(e) => setBegrundelse(e.target.value)}
            className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none focus-visible:border-accent"
          >
            <option value="">Vælg begrundelse…</option>
            {AFVISNINGSGRUNDE.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={pending || !begrundelse}
            onClick={() => markerStatus("afvist_af_kunde", begrundelse)}
            className="rounded-md bg-spaerret px-3 py-1.5 text-sm font-medium text-accent-tekst disabled:opacity-60"
          >
            Bekræft afvisning
          </button>
          <button
            type="button"
            onClick={() => setVisBegrundelse(false)}
            className="text-sm text-tekst-daempet hover:text-tekst"
          >
            Annullér
          </button>
        </div>
      )}
    </div>
  );
}
