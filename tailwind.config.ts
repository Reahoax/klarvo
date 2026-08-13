import type { Config } from "tailwindcss";

// 2026-08-12: skiftet fra det lyse fagsystem-look (Spec.md afsnit 6B) til en mørk
// SaaS-dashboard-stil på eksplicit brugerønske (reference: skærmbillede af "Lawfirm"-CRM).
// Farverne herunder er hentet som mønster derfra, ikke som en 1:1-kopi af det produkt.
//
// 2026-08-13: farverne er lagt om til CSS-variabler (defineret i app/globals.css),
// i stedet for faste hex-koder her. Det er forberedelse til brugerindstillinger, hvor
// baggrund/farver/UI skal kunne ændres 100% af brugeren uden at bygge appen om igen -
// en fremtidig indstillingsside kan sætte disse variabler direkte på <html>.
function medCssVariabel(navn: string) {
  return `rgb(var(${navn}) / <alpha-value>)`;
}

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        baggrund: medCssVariabel("--farve-baggrund"),
        flade: medCssVariabel("--farve-flade"),
        "flade-haevet": medCssVariabel("--farve-flade-haevet"),
        kant: medCssVariabel("--farve-kant"),
        tekst: medCssVariabel("--farve-tekst"),
        "tekst-daempet": medCssVariabel("--farve-tekst-daempet"),
        accent: medCssVariabel("--farve-accent"),
        "accent-tekst": medCssVariabel("--farve-accent-tekst"),
        spaerret: medCssVariabel("--farve-spaerret"),
        advarsel: medCssVariabel("--farve-advarsel"),
        "advarsel-baggrund": medCssVariabel("--farve-advarsel-baggrund"),
        godkendt: medCssVariabel("--farve-godkendt"),
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
