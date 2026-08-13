import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Klarvo",
  description: "Internt lead-panel",
};

// Sætter det gemte tema på <html>, FØR siden males - ellers ville brugeren kortvarigt
// se det forkerte tema (mørkt) blinke, hver gang de har valgt lyst eller et
// brugerdefineret tema. Kan ikke gøres i React selv, fordi server-renderingen ikke
// kender til localStorage. Nøglerne her skal holdes i sync med lib/tema.ts, som ikke
// kan importeres i dette rå script-tag.
const TEMA_SCRIPT = `
try {
  var tema = localStorage.getItem('klarvo-tema');
  if (tema === 'lys') document.documentElement.setAttribute('data-tema', 'lys');
  if (tema === 'brugerdefineret') {
    var raa = localStorage.getItem('klarvo-brugertema');
    if (raa) {
      var t = JSON.parse(raa);
      var noegler = ['baggrund','flade','flade-haevet','kant','tekst','tekst-daempet','accent','accent-tekst','spaerret','advarsel','advarsel-baggrund','godkendt'];
      for (var i = 0; i < noegler.length; i++) {
        var hex = (t.farver && t.farver[noegler[i]]) || '';
        var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
        if (m) {
          document.documentElement.style.setProperty(
            '--farve-' + noegler[i],
            parseInt(m[1], 16) + ' ' + parseInt(m[2], 16) + ' ' + parseInt(m[3], 16)
          );
        }
      }
      if (typeof t.panelAlpha === 'number') {
        document.documentElement.style.setProperty('--panel-alpha', String(t.panelAlpha));
      }
      if (t.baggrundsbillede) document.documentElement.setAttribute('data-brugerbaggrund', 'til');
    }
  }
} catch (e) {}
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning: TEMA_SCRIPT bevidst ændrer attributter/inline-style på
    // <html> før React overtager (se kommentar ovenfor) - uden denne flagger React det
    // fejlagtigt som en hydration-fejl i dev, selvom det er tilsigtet og harmløst
    // (samme mønster som fx next-themes bruger til at undgå tema-blink).
    <html lang="da" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
