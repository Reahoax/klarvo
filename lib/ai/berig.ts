import type { SupabaseClient } from "@supabase/supabase-js";
import { erAiKonfigureret, opretAiKlient } from "./klient.ts";
import { AI_MODEL, beregnPrisUsd } from "./pris.ts";
import { hashInput } from "./hash.ts";
import { byggResumePrompt, byggHypotesePrompt, byggScorePrompt, beskrivIcp, harIcpKriterier, type Prompt } from "./prompts.ts";
import { validerResumeSvar, validerHypoteseSvar, validerScoreSvar, parseJsonSvar } from "./skema.ts";
import type { Icp } from "@/lib/matching/score.ts";

// Etape 5 (Spec.md "4" og "4C") - orkestrerer de tre AI-felter for ÉT lead
// ad gangen, udløst manuelt af en operatør (samme mønster som "Hent
// signaler"-knappen, se hent-signaler-knap.tsx). Det er bevidst IKKE en
// baggrundsløkke over hele leads-tabellen - det ville modsige specens "Ét
// kald pr. lead pr. felttype. Ingen løkker der kalder API'et pr. række i en
// tabel" og ville brænde penge på leads, intet menneske nogensinde ser.
// Et fremtidigt batch-job (med kø, jf. specen) kan genbruge berigÉtFelt
// nedenfor, men er ikke bygget endnu.
const MAKS_OUTPUT_TOKENS = 1024;

type FeltType = "resume" | "hypotese" | "score";

export type BerigelseResultat = {
  ok: boolean;
  fejl?: string;
  udfoerte: FeltType[];
  sprunget_over: FeltType[];
};

async function hentSenesteSignal(
  supabase: SupabaseClient,
  leadId: string,
  type: "website" | "jobopslag"
): Promise<string | null> {
  const { data } = await supabase
    .from("signaler")
    .select("vaerdi")
    .eq("lead_id", leadId)
    .eq("type", type)
    .order("hentet_dato", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.vaerdi ?? null;
}

async function findAllerede(
  supabase: SupabaseClient,
  leadId: string,
  felttype: FeltType,
  inputHash: string
): Promise<boolean> {
  const { data } = await supabase
    .from("ai_kald")
    .select("id")
    .eq("lead_id", leadId)
    .eq("felttype", felttype)
    .eq("input_hash", inputHash)
    .eq("status", "ok")
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

// Étt AI-kald: bygger hash, tjekker cache (Spec.md "Samme input må aldrig
// kaldes to gange"), kalder Claude, validerer svaret mod skemaet og skriver
// resultatet + omkostningslog. Kaster videre ved vedvarende API-fejl, så
// berigLead kan stoppe hele jobbet (Spec.md "Ved vedvarende fejl: stop
// jobbet ... kør ikke videre og brænd penge").
async function berigÉtFelt(
  supabase: SupabaseClient,
  leadId: string,
  kundeId: string | null,
  felttype: FeltType,
  prompt: Prompt,
  skriv: (raaSvar: unknown) => Promise<boolean>
): Promise<"udfoert" | "sprunget_over"> {
  const inputHash = hashInput(`${felttype}\n${prompt.system}\n${prompt.besked}`);

  if (await findAllerede(supabase, leadId, felttype, inputHash)) {
    return "sprunget_over";
  }

  const klient = opretAiKlient();
  const response = await klient.messages.create({
    model: AI_MODEL,
    max_tokens: MAKS_OUTPUT_TOKENS,
    system: prompt.system,
    messages: [{ role: "user", content: prompt.besked }],
  });

  const tekstBlok = response.content.find((b) => b.type === "text");
  const raaTekst = tekstBlok && "text" in tekstBlok ? tekstBlok.text : "";
  const json = parseJsonSvar(raaTekst);
  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  const estimeretPris = beregnPrisUsd(inputTokens, outputTokens);

  const gyldigt = await skriv(json);

  // Fejler selve databaseskrivningen (fx en fremtidig RLS-regression), skal
  // det behandles som en vedvarende fejl på lige fod med en API-fejl - IKKE
  // rapporteres som "opdateret", når intet reelt blev gemt. Kastes videre,
  // så det fanges af berigLeads try/catch og stopper jobbet.
  const { error: ai_kald_fejl } = await supabase.from("ai_kald").insert({
    lead_id: leadId,
    kunde_id: kundeId,
    felttype,
    input_hash: inputHash,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    estimeret_pris: estimeretPris,
    status: gyldigt ? "ok" : "valideringsfejl",
    fejl: gyldigt ? null : "Svaret matchede ikke det forventede JSON-skema - feltet er sat til null.",
  });
  if (ai_kald_fejl) {
    throw new Error(`Kunne ikke skrive omkostningslog for "${felttype}": ${ai_kald_fejl.message}`);
  }

  return "udfoert";
}

export async function berigLead(supabase: SupabaseClient, leadId: string): Promise<BerigelseResultat> {
  if (!erAiKonfigureret()) {
    return {
      ok: false,
      fejl: "ANTHROPIC_API_KEY er ikke sat endnu - AI-berigelse er ikke konfigureret i produktion.",
      udfoerte: [],
      sprunget_over: [],
    };
  }

  const { data: lead } = await supabase.from("leads").select("kunde_id").eq("id", leadId).maybeSingle();
  if (!lead) {
    return { ok: false, fejl: "Leadet blev ikke fundet.", udfoerte: [], sprunget_over: [] };
  }

  const websiteMateriale = await hentSenesteSignal(supabase, leadId, "website");
  if (!websiteMateriale) {
    return {
      ok: false,
      fejl: "Ingen website-signal fundet for dette lead. Hent signaler først, før AI-berigelse kan køre.",
      udfoerte: [],
      sprunget_over: [],
    };
  }
  const jobopslagMateriale = await hentSenesteSignal(supabase, leadId, "jobopslag");

  let icp: Icp | null = null;
  if (lead.kunde_id) {
    const { data: kunde } = await supabase.from("kunder").select("icp").eq("id", lead.kunde_id).maybeSingle();
    icp = (kunde?.icp as Icp | null) ?? null;
  }

  const udfoerte: FeltType[] = [];
  const sprunget_over: FeltType[] = [];

  try {
    const resumeUdfald = await berigÉtFelt(
      supabase,
      leadId,
      lead.kunde_id,
      "resume",
      byggResumePrompt(websiteMateriale),
      async (raa) => {
        const svar = validerResumeSvar(raa);
        const { error } = await supabase.from("leads").update({ ai_resume: svar?.resume ?? null }).eq("id", leadId);
        if (error) throw new Error(`Kunne ikke skrive ai_resume: ${error.message}`);
        return svar !== null;
      }
    );
    (resumeUdfald === "udfoert" ? udfoerte : sprunget_over).push("resume");

    const hypoteseMateriale = [websiteMateriale, jobopslagMateriale].filter(Boolean).join("\n\n---\n\n");
    const hypoteseUdfald = await berigÉtFelt(
      supabase,
      leadId,
      lead.kunde_id,
      "hypotese",
      byggHypotesePrompt(hypoteseMateriale),
      async (raa) => {
        const svar = validerHypoteseSvar(raa);
        const { error } = await supabase.from("leads").update({ ai_hypotese: svar?.hypotese ?? null }).eq("id", leadId);
        if (error) throw new Error(`Kunne ikke skrive ai_hypotese: ${error.message}`);
        return svar !== null;
      }
    );
    (hypoteseUdfald === "udfoert" ? udfoerte : sprunget_over).push("hypotese");

    if (icp && harIcpKriterier(icp)) {
      const scoreUdfald = await berigÉtFelt(
        supabase,
        leadId,
        lead.kunde_id,
        "score",
        byggScorePrompt(websiteMateriale, beskrivIcp(icp)),
        async (raa) => {
          const svar = validerScoreSvar(raa);
          const { error } = await supabase
            .from("leads")
            .update({ ai_score: svar?.score ?? null, ai_score_begrundelse: svar?.begrundelse ?? null })
            .eq("id", leadId);
          if (error) throw new Error(`Kunne ikke skrive ai_score: ${error.message}`);
          return svar !== null;
        }
      );
      (scoreUdfald === "udfoert" ? udfoerte : sprunget_over).push("score");
    }
  } catch (fejl) {
    const besked = fejl instanceof Error ? fejl.message : "Ukendt fejl.";
    const { error: fejllogFejl } = await supabase.from("fejllog").insert({
      modul: "ai_berigelse",
      fejl: `Lead ${leadId}: ${besked}`,
    });
    if (fejllogFejl) {
      console.error("Kunne ikke skrive til fejllog (se konsollen, ikke fejlloggen):", fejllogFejl.message);
    }
    return {
      ok: false,
      fejl: `AI-kaldet fejlede vedvarende: ${besked}. Berigelsen er stoppet for at undgå at brænde penge på gentagne fejl - se fejlloggen.`,
      udfoerte,
      sprunget_over,
    };
  }

  return { ok: true, udfoerte, sprunget_over };
}
