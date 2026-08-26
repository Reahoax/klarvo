"use client";

import { useEffect, useRef, useState } from "react";
import { Settings, LogOut } from "lucide-react";
import { IndstillingerModal } from "./indstillinger-modal";

type Konfiguration = {
  tilladte_virksomhedsformer: string[];
  virksomhedsformer_fysiske_personer: string[];
  import_advarsel_graense: number;
  sletning_maaneder: number;
  ringetid_fra: string;
  ringetid_til: string;
  ringetid_ugedage: number[];
  osint_kontakt_email: string | null;
} | null;

type CvrForbindelse = {
  brugernavn: string | null;
  forbundet_tidspunkt: string | null;
  sidst_testet: string | null;
  sidst_test_ok: boolean | null;
  sidst_test_besked: string | null;
} | null;

export function BrugerMenu({
  email,
  rolle,
  navn,
  avatarUrl,
  konfiguration,
  cvrForbindelse,
  forbogstav,
  logUd,
}: {
  email: string | undefined;
  rolle: string;
  navn: string | null;
  avatarUrl: string | null;
  konfiguration: Konfiguration;
  cvrForbindelse: CvrForbindelse;
  forbogstav: string;
  logUd: () => void;
}) {
  const [aaben, setAaben] = useState(false);
  const [indstillingerAaben, setIndstillingerAaben] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function paaKlikUdenfor(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAaben(false);
      }
    }
    document.addEventListener("mousedown", paaKlikUdenfor);
    return () => document.removeEventListener("mousedown", paaKlikUdenfor);
  }, []);

  const visningsnavn = navn || email;

  return (
    <div ref={ref} className="relative border-t border-kant p-3">
      {aaben && (
        <div className="absolute bottom-full left-3 right-3 mb-2 overflow-hidden rounded-lg border border-kant bg-flade shadow-2xl shadow-black/40">
          <p className="truncate border-b border-kant px-3 py-2.5 text-xs text-tekst-daempet">
            {email}
          </p>
          <button
            type="button"
            onClick={() => {
              setAaben(false);
              setIndstillingerAaben(true);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-tekst transition-colors hover:bg-flade-haevet"
          >
            <Settings className="h-4 w-4 text-tekst-daempet" strokeWidth={1.75} />
            Indstillinger
          </button>
          <form action={logUd}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-spaerret transition-colors hover:bg-flade-haevet"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
              Log ud
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setAaben((v) => !v)}
        className="flex w-full items-center gap-2 rounded px-1 py-1 transition-colors hover:bg-flade-haevet"
      >
        <span className="h-7 w-7 shrink-0 overflow-hidden rounded-full ring-1 ring-transparent transition-all duration-200">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-flade-haevet text-xs font-medium text-tekst">
              {forbogstav}
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate text-xs font-medium text-tekst">{visningsnavn}</span>
          <span className="block truncate text-[11px] text-tekst-daempet">
            {rolle === "ejer" ? "Ejer" : "Operatør"}
          </span>
        </span>
        <span
          className="shrink-0 text-tekst-daempet transition-transform duration-200"
          style={{ transform: aaben ? "rotate(180deg)" : undefined }}
        >
          ⌄
        </span>
      </button>

      {indstillingerAaben && (
        <IndstillingerModal
          email={email}
          rolle={rolle}
          navn={navn}
          avatarUrl={avatarUrl}
          konfiguration={konfiguration}
          cvrForbindelse={cvrForbindelse}
          onLuk={() => setIndstillingerAaben(false)}
        />
      )}
    </div>
  );
}
