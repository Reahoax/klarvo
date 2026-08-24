import { NextResponse } from "next/server";
import { opretServiceKlient } from "@/lib/supabase/service.ts";
import { koerCvrImport } from "@/lib/cvr/importer.ts";

// Etape 11 — automatisk, planlagt CVR-import (Vercel Cron, se vercel.json).
// Brugeren bad eksplicit om at det skulle køre af sig selv: "Man skal ikke
// selv hente den. De skal bare være der lige fra start af." Kører derfor
// UDEN nogen indlogget bruger - autoriseres af CRON_SECRET (Vercel sætter
// automatisk Authorization: Bearer $CRON_SECRET på planlagte kald), ikke af
// en ejer-rolle. Se README "CVR system-til-system-adgang" for de to
// miljøvariabler, denne route kræver.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ fejl: "Uautoriseret." }, { status: 401 });
  }

  try {
    const supabase = opretServiceKlient();
    const rapport = await koerCvrImport(supabase, 200);

    if (rapport.fejl) {
      console.error("Automatisk CVR-import fejlede:", rapport.fejl);
      return NextResponse.json(rapport, { status: 500 });
    }

    return NextResponse.json(rapport);
  } catch (fejl) {
    const besked = fejl instanceof Error ? fejl.message : "Ukendt fejl.";
    console.error("Automatisk CVR-import fejlede:", besked);
    return NextResponse.json({ fejl: besked }, { status: 500 });
  }
}
