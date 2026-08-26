import { NextResponse } from "next/server";
import { opretServerKlient } from "@/lib/supabase/server";
import { hentRapportData } from "@/lib/rapport/hentRapportData.ts";
import { tilCsv } from "@/lib/rapport/csv.ts";

// Etape 10B (Spec.md "F. Rapport") - "Eksport til CSV." Beskyttet af
// middleware.ts som alle andre ruter (kræver session) - intet
// CRON_SECRET-tjek nødvendigt her.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fra = searchParams.get("fra");
  const til = searchParams.get("til");
  if (!fra || !til) {
    return NextResponse.json({ fejl: "Mangler fra/til-parametre." }, { status: 400 });
  }

  const supabase = await opretServerKlient();
  const data = await hentRapportData(supabase, fra, til);

  const csv = tilCsv(
    [
      "Kunde",
      "Researchet",
      "Kvalificeret",
      "Ringet",
      "Kontakt opnået",
      "Møder booket",
      "Researchet → kvalificeret (%)",
      "Kvalificeret → ringet (%)",
      "Ringet → kontakt (%)",
      "Kontakt → møde (%)",
    ],
    data.perKunde.map((k) => [
      k.navn,
      k.funnel.researchet,
      k.funnel.kvalificeret,
      k.funnel.ringet,
      k.funnel.kontaktOpnaaet,
      k.funnel.moederBooket,
      k.funnel.konvertering.researchetTilKvalificeret ?? "",
      k.funnel.konvertering.kvalificeretTilRinget ?? "",
      k.funnel.konvertering.ringetTilKontakt ?? "",
      k.funnel.konvertering.kontaktTilMoede ?? "",
    ])
  );

  // ﻿ (BOM) foran indholdet, så Excel på Windows genkender UTF-8 og
  // ikke fejlfortolker æ/ø/å - et velkendt Excel/CSV-problem uden den.
  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="klarvo-rapport_${fra}_${til}.csv"`,
    },
  });
}
