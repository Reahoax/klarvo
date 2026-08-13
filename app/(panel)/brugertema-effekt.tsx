"use client";

import { useEffect } from "react";
import { laesGemtBrugerTema } from "@/lib/tema";

// Sætter baggrundsbilledet på <body>, som ikke findes endnu når TEMA_SCRIPT i
// app/layout.tsx kører i <head> (den sætter kun farver + data-brugerbaggrund,
// før første maling). Selve billedet kan først sættes, når body er i DOM'en.
export function BrugerTemaEffekt() {
  useEffect(() => {
    const gemt = localStorage.getItem("klarvo-tema");
    if (gemt !== "brugerdefineret") return;
    const tema = laesGemtBrugerTema();
    if (tema?.baggrundsbillede) {
      document.body.style.backgroundImage = `url(${JSON.stringify(tema.baggrundsbillede)})`;
    }
  }, []);

  return null;
}
