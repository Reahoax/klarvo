"use client";

import { useEffect, useRef, useState } from "react";
import { HexColorPicker, HexColorInput } from "react-colorful";

declare global {
  interface Window {
    EyeDropper?: new () => { open(): Promise<{ sRGBHex: string }> };
  }
}

// Popover-farvevælger til det brugerdefinerede tema (Indstillinger → Udseende).
// Erstatter det oprindelige native <input type="color"> med en picker der ligger
// direkte i siden, efter eksplicit ønske - se skærmbillede fra brugeren.
export function FarveVaelger({
  label,
  vaerdi,
  onAendring,
  presets,
}: {
  label: string;
  vaerdi: string;
  onAendring: (hex: string) => void;
  presets?: string[];
}) {
  const [aaben, setAaben] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const stoetterPipette = typeof window !== "undefined" && !!window.EyeDropper;

  useEffect(() => {
    function paaKlikUdenfor(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAaben(false);
    }
    document.addEventListener("mousedown", paaKlikUdenfor);
    return () => document.removeEventListener("mousedown", paaKlikUdenfor);
  }, []);

  async function brugPipette() {
    if (!window.EyeDropper) return;
    try {
      const resultat = await new window.EyeDropper().open();
      onAendring(resultat.sRGBHex);
    } catch {
      // Brugeren annullerede pipette-valget - ignorér.
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAaben((v) => !v)}
        className="flex w-full items-center gap-2 text-left text-xs text-tekst"
      >
        <span
          className="h-7 w-7 shrink-0 rounded border border-kant"
          style={{ backgroundColor: vaerdi }}
          aria-hidden
        />
        <span className="min-w-0 truncate">{label}</span>
      </button>

      {aaben && (
        <div className="absolute left-0 top-full z-20 mt-2 w-56 rounded-lg border border-kant bg-flade p-3 shadow-2xl shadow-black/50">
          <div className="mb-2 [&_.react-colorful]:w-full">
            <HexColorPicker color={vaerdi} onChange={onAendring} />
          </div>

          <div className="flex items-center gap-1.5 rounded-md border border-kant bg-baggrund px-2 py-1.5">
            <span className="text-xs text-tekst-daempet">#</span>
            <HexColorInput
              color={vaerdi}
              onChange={onAendring}
              className="tal w-full min-w-0 bg-transparent text-xs text-tekst outline-none"
            />
            {stoetterPipette && (
              <button
                type="button"
                onClick={brugPipette}
                title="Vælg farve fra skærmen"
                className="shrink-0 text-tekst-daempet transition-colors hover:text-tekst"
              >
                🎨
              </button>
            )}
          </div>

          {presets && presets.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {presets.map((hex, i) => (
                <button
                  key={`${hex}-${i}`}
                  type="button"
                  onClick={() => onAendring(hex)}
                  title={hex}
                  className="h-5 w-5 rounded border border-kant"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
