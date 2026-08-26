import { NextResponse } from "next/server";
import { opretServerKlient } from "@/lib/supabase/server";

// Spec.md "Indsigtsanmodning" (Etape 12): "eksportér alt vi har om
// vedkommende." Ejer-only (som resten af /indsigt), håndhævet her og ikke
// kun i UI'et, da dette er et direkte URL-endpoint. Beskyttet af den
// almindelige session-middleware.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await opretServerKlient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = user
    ? await supabase.from("profiler").select("rolle").eq("id", user.id).single()
    : { data: null };
  if (profil?.rolle !== "ejer") {
    return NextResponse.json({ fejl: "Kun ejere kan eksportere data." }, { status: 403 });
  }

  const { data: lead } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (!lead) {
    return NextResponse.json({ fejl: "Leadet blev ikke fundet." }, { status: 404 });
  }

  const [{ data: aktiviteter }, { data: moeder }, { data: signaler }, { data: aiKald }, { data: activityLog }] =
    await Promise.all([
      supabase.from("aktiviteter").select("*").eq("lead_id", id),
      supabase.from("moeder").select("*").eq("lead_id", id),
      supabase.from("signaler").select("*").eq("lead_id", id),
      supabase.from("ai_kald").select("*").eq("lead_id", id),
      supabase.from("activity_log").select("*").eq("lead_id", id),
    ]);

  const eksport = {
    genereret: new Date().toISOString(),
    formaal: "GDPR-indsigtsanmodning (Spec.md, Etape 12)",
    lead,
    aktiviteter: aktiviteter ?? [],
    moeder: moeder ?? [],
    signaler: signaler ?? [],
    ai_kald: aiKald ?? [],
    historik: activityLog ?? [],
  };

  return new NextResponse(JSON.stringify(eksport, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="klarvo-indsigt_${lead.cvr_nummer}.json"`,
    },
  });
}
