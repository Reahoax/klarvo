"use client";

import { useEffect, useState } from "react";
import { opretBrowserKlient } from "@/lib/supabase/client";
import { FarveVaelger } from "./farve-vaelger";
import {
  CSS_VARIABEL_NOEGLER,
  FARVE_LABEL,
  anvendBrugerTema,
  gemBrugerTema,
  laesGemtBrugerTema,
  ryddBrugerTema,
  tomtBrugerTema,
  type BrugerTema,
} from "@/lib/tema";

type Tilstand = "moerk" | "lys" | "brugerdefineret";

const TEMA_BUCKET = "tema-baggrunde";

// Gemmer valget i localStorage (pr. browser) - ikke i databasen endnu. Mørk/Lys
// er faste forudindstillinger; "Brugerdefineret" lader brugeren style hver
// CSS-variabel i app/globals.css frit, inkl. eget baggrundsbillede - se lib/tema.ts.
export function TemaVaelger() {
  const [tilstand, setTilstand] = useState<Tilstand | null>(null);
  const [brugerTema, setBrugerTema] = useState<BrugerTema | null>(null);
  const [uploader, setUploader] = useState(false);
  const [uploadFejl, setUploadFejl] = useState<string | null>(null);

  useEffect(() => {
    const gemt = localStorage.getItem("klarvo-tema");
    const t: Tilstand = gemt === "lys" ? "lys" : gemt === "brugerdefineret" ? "brugerdefineret" : "moerk";
    setTilstand(t);
    setBrugerTema(laesGemtBrugerTema());
  }, []);

  function vaelgPreset(nyt: "moerk" | "lys") {
    setTilstand(nyt);
    localStorage.setItem("klarvo-tema", nyt);
    if (nyt === "lys") {
      document.documentElement.setAttribute("data-tema", "lys");
    } else {
      document.documentElement.removeAttribute("data-tema");
    }
    anvendBrugerTema(null);
  }

  function vaelgBrugerdefineret() {
    setTilstand("brugerdefineret");
    localStorage.setItem("klarvo-tema", "brugerdefineret");
    document.documentElement.removeAttribute("data-tema");
    const udgangspunkt = brugerTema ?? tomtBrugerTema(tilstand === "lys" ? "lys" : "moerk");
    setBrugerTema(udgangspunkt);
    gemBrugerTema(udgangspunkt);
    anvendBrugerTema(udgangspunkt);
  }

  function opdaterTema(nyt: BrugerTema) {
    setBrugerTema(nyt);
    gemBrugerTema(nyt);
    anvendBrugerTema(nyt);
  }

  function opdaterFarve(noegle: (typeof CSS_VARIABEL_NOEGLER)[number], hex: string) {
    if (!brugerTema) return;
    opdaterTema({ ...brugerTema, farver: { ...brugerTema.farver, [noegle]: hex } });
  }

  function opdaterAlpha(alpha: number) {
    if (!brugerTema) return;
    opdaterTema({ ...brugerTema, panelAlpha: alpha });
  }

  async function haandterUpload(fil: File) {
    if (!brugerTema) return;
    if (fil.size > 8 * 1024 * 1024) {
      setUploadFejl("Billedet må maks. være 8 MB.");
      return;
    }
    setUploader(true);
    setUploadFejl(null);
    try {
      const supabase = opretBrowserKlient();
      const endelse = fil.name.split(".").pop() || "jpg";
      const sti = `${crypto.randomUUID()}.${endelse}`;
      const { error: uploadError } = await supabase.storage
        .from(TEMA_BUCKET)
        .upload(sti, fil, { upsert: false });
      if (uploadError) {
        setUploadFejl(uploadError.message);
        return;
      }
      const forrigeSti = brugerTema.baggrundsbillede
        ? brugerTema.baggrundsbillede.split(`${TEMA_BUCKET}/`)[1]
        : null;
      const { data } = supabase.storage.from(TEMA_BUCKET).getPublicUrl(sti);
      opdaterTema({ ...brugerTema, baggrundsbillede: data.publicUrl });
      if (forrigeSti) {
        await supabase.storage.from(TEMA_BUCKET).remove([forrigeSti]);
      }
    } finally {
      setUploader(false);
    }
  }

  async function fjernBillede() {
    if (!brugerTema?.baggrundsbillede) return;
    const forrigeSti = brugerTema.baggrundsbillede.split(`${TEMA_BUCKET}/`)[1];
    opdaterTema({ ...brugerTema, baggrundsbillede: null });
    if (forrigeSti) {
      const supabase = opretBrowserKlient();
      await supabase.storage.from(TEMA_BUCKET).remove([forrigeSti]);
    }
  }

  function nulstil() {
    ryddBrugerTema();
    localStorage.setItem("klarvo-tema", "moerk");
    document.documentElement.removeAttribute("data-tema");
    anvendBrugerTema(null);
    setBrugerTema(null);
    setTilstand("moerk");
  }

  if (!tilstand) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => vaelgPreset("moerk")}
          className={
            tilstand === "moerk"
              ? "glow-accent rounded-lg border-2 border-accent bg-flade p-3 text-left"
              : "rounded-lg border-2 border-kant bg-flade p-3 text-left transition-colors hover:border-tekst-daempet"
          }
        >
          <div className="mb-2 h-12 rounded border border-[#2a2a2d] bg-[#0b0b0c]">
            <div className="h-3 w-2/3 rounded-t bg-[#161617]" />
          </div>
          <p className="text-sm font-medium text-tekst">Mørk</p>
          <p className="text-xs text-tekst-daempet">Standard</p>
        </button>

        <button
          type="button"
          onClick={() => vaelgPreset("lys")}
          className={
            tilstand === "lys"
              ? "glow-accent rounded-lg border-2 border-accent bg-flade p-3 text-left"
              : "rounded-lg border-2 border-kant bg-flade p-3 text-left transition-colors hover:border-tekst-daempet"
          }
        >
          <div className="mb-2 h-12 rounded border border-[#e3e2de] bg-[#f7f7f5]">
            <div className="h-3 w-2/3 rounded-t bg-white" />
          </div>
          <p className="text-sm font-medium text-tekst">Lys</p>
          <p className="text-xs text-tekst-daempet">Fagsystem-stil</p>
        </button>

        <button
          type="button"
          onClick={vaelgBrugerdefineret}
          className={
            tilstand === "brugerdefineret"
              ? "glow-accent rounded-lg border-2 border-accent bg-flade p-3 text-left"
              : "rounded-lg border-2 border-kant bg-flade p-3 text-left transition-colors hover:border-tekst-daempet"
          }
        >
          <div className="mb-2 h-12 overflow-hidden rounded border border-kant">
            <div className="grid h-full grid-cols-4">
              <div className="bg-[#e0603c]" />
              <div className="bg-[#4caf7d]" />
              <div className="bg-[#e0a83c]" />
              <div className="bg-[#e05a4e]" />
            </div>
          </div>
          <p className="text-sm font-medium text-tekst">Brugerdefineret</p>
          <p className="text-xs text-tekst-daempet">Alt kan ændres</p>
        </button>
      </div>

      {tilstand === "brugerdefineret" && brugerTema && (
        <div className="flex flex-col gap-5 rounded-lg border border-kant bg-flade p-4">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-tekst-daempet">
              Farver
            </h3>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {CSS_VARIABEL_NOEGLER.map((noegle) => (
                <FarveVaelger
                  key={noegle}
                  label={FARVE_LABEL[noegle]}
                  vaerdi={brugerTema.farver[noegle]}
                  onAendring={(hex) => opdaterFarve(noegle, hex)}
                  presets={CSS_VARIABEL_NOEGLER.filter((n) => n !== noegle).map(
                    (n) => brugerTema.farver[n]
                  )}
                />
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-tekst-daempet">
              Paneltransparens
            </h3>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={30}
                max={100}
                value={Math.round(brugerTema.panelAlpha * 100)}
                onChange={(e) => opdaterAlpha(Number(e.target.value) / 100)}
                className="flex-1"
              />
              <span className="tal w-10 shrink-0 text-right text-xs text-tekst-daempet">
                {Math.round(brugerTema.panelAlpha * 100)}%
              </span>
            </div>
            <p className="mt-1 text-xs text-tekst-daempet">
              Lavere værdi gør paneler mere gennemsigtige, så baggrundsbilledet skinner
              igennem.
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-tekst-daempet">
              Baggrundsbillede
            </h3>
            {brugerTema.baggrundsbillede ? (
              <div className="flex items-center gap-3">
                <img
                  src={brugerTema.baggrundsbillede}
                  alt="Valgt baggrund"
                  className="h-14 w-24 rounded border border-kant object-cover"
                />
                <button
                  type="button"
                  onClick={fjernBillede}
                  className="rounded-md border border-kant px-2.5 py-1.5 text-xs text-tekst transition-colors hover:border-spaerret hover:text-spaerret"
                >
                  Fjern billede
                </button>
              </div>
            ) : (
              <label className="inline-block w-fit cursor-pointer rounded-md border border-kant px-3 py-1.5 text-xs text-tekst transition-colors hover:border-accent">
                {uploader ? "Uploader…" : "Vælg billede"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  disabled={uploader}
                  onChange={(e) => {
                    const fil = e.target.files?.[0];
                    if (fil) haandterUpload(fil);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
            {uploadFejl && <p className="mt-1.5 text-xs text-spaerret">{uploadFejl}</p>}
            <p className="mt-1.5 text-xs text-tekst-daempet">
              Bedst resultat: JPG eller WebP (mindre filstørrelse end PNG, medmindre du har
              brug for gennemsigtighed), liggende format mindst 1920×1080, maks. 8 MB.
            </p>
          </div>

          <button
            type="button"
            onClick={nulstil}
            className="w-fit text-xs text-tekst-daempet underline decoration-dotted hover:text-tekst"
          >
            Nulstil til standardtema
          </button>
        </div>
      )}
    </div>
  );
}
