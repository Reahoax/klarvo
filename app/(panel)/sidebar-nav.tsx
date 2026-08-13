"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navGrupper } from "@/lib/nav";

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto py-4">
      {navGrupper.map((gruppe) => (
        <div key={gruppe.label} className="mb-5 px-3">
          <p className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wider text-tekst-daempet/70">
            {gruppe.label}
          </p>
          <div className="flex flex-col gap-0.5">
            {gruppe.punkter.map((punkt) => {
              const erAktiv = punkt.href !== null;
              const erValgt = erAktiv && pathname.startsWith(punkt.href!);

              if (!erAktiv) {
                return (
                  <span
                    key={punkt.bogstav}
                    aria-disabled="true"
                    title="Ikke bygget endnu"
                    className="cursor-not-allowed rounded border-l-2 border-transparent py-1.5 pl-[7px] pr-2 text-sm text-tekst-daempet/50"
                  >
                    {punkt.navn}
                  </span>
                );
              }

              return (
                <Link
                  key={punkt.bogstav}
                  href={punkt.href!}
                  className={
                    erValgt
                      ? "rounded border-l-2 border-accent bg-flade-haevet py-1.5 pl-[7px] pr-2 text-sm font-medium text-tekst transition-all duration-200 ease-out"
                      : "group rounded border-l-2 border-transparent py-1.5 pl-[7px] pr-2 text-sm text-tekst-daempet transition-all duration-200 ease-out hover:translate-x-0.5 hover:bg-flade-haevet hover:text-tekst"
                  }
                >
                  {punkt.navn}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
