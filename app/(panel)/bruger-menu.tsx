"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export function BrugerMenu({
  email,
  rolle,
  navn,
  forbogstav,
  logUd,
}: {
  email: string | undefined;
  rolle: string;
  navn: string | null;
  forbogstav: string;
  logUd: () => void;
}) {
  const [aaben, setAaben] = useState(false);
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
          <Link
            href="/indstillinger"
            onClick={() => setAaben(false)}
            className="block w-full px-3 py-2 text-left text-sm text-tekst transition-colors hover:bg-flade-haevet"
          >
            Indstillinger
          </Link>
          <form action={logUd}>
            <button
              type="submit"
              className="block w-full px-3 py-2 text-left text-sm text-spaerret transition-colors hover:bg-flade-haevet"
            >
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
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-flade-haevet text-xs font-medium text-tekst ring-1 ring-transparent transition-all duration-200">
          {forbogstav}
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
    </div>
  );
}
