"use client";

import { useActionState, useState } from "react";
import { opretOekonomiPost } from "./actions";

export function OekonomiFormular() {
  const [aaben, setAaben] = useState(false);
  const [type, setType] = useState<"indtaegt" | "omkostning">("omkostning");
  const [state, action, pending] = useActionState(opretOekonomiPost, null);

  if (!aaben) {
    return (
      <button
        type="button"
        onClick={() => setAaben(true)}
        className="glow-accent w-fit rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-tekst"
      >
        + Log post
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg border border-kant bg-flade p-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setType("omkostning")}
          className={
            type === "omkostning"
              ? "rounded-full bg-spaerret px-3 py-1 text-xs font-medium text-accent-tekst"
              : "rounded-full border border-kant px-3 py-1 text-xs text-tekst-daempet"
          }
        >
          Omkostning
        </button>
        <button
          type="button"
          onClick={() => setType("indtaegt")}
          className={
            type === "indtaegt"
              ? "rounded-full bg-godkendt px-3 py-1 text-xs font-medium text-accent-tekst"
              : "rounded-full border border-kant px-3 py-1 text-xs text-tekst-daempet"
          }
        >
          Indtægt
        </button>
        <input type="hidden" name="type" value={type} />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          type="text"
          name="navn"
          placeholder="Fx: Domæne klarvo.dk, Vercel, Supabase"
          required
          className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none focus-visible:border-accent"
        />
        <input
          type="text"
          name="beloeb"
          inputMode="decimal"
          placeholder="Beløb (kr.)"
          required
          className="tal rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none focus-visible:border-accent"
        />
        <input
          type="text"
          name="kategori"
          placeholder="Kategori (valgfrit, fx Hosting)"
          className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none focus-visible:border-accent"
        />
        <select
          name="gentagelse"
          defaultValue="maanedligt"
          className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none focus-visible:border-accent"
        >
          <option value="engangs">Engangsbeløb</option>
          <option value="maanedligt">Månedligt tilbagevendende</option>
          <option value="aarligt">Årligt tilbagevendende</option>
        </select>
        <input
          type="date"
          name="dato"
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none focus-visible:border-accent"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="glow-accent w-fit rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-tekst disabled:opacity-60"
        >
          Gem
        </button>
        <button
          type="button"
          onClick={() => setAaben(false)}
          className="text-sm text-tekst-daempet hover:text-tekst"
        >
          Annullér
        </button>
        {state?.fejl && <p className="text-xs text-spaerret">{state.fejl}</p>}
        {state?.ok && <p className="text-xs text-godkendt">Gemt.</p>}
      </div>
    </form>
  );
}
