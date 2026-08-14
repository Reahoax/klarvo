"use server";

import { revalidatePath } from "next/cache";
import { opretServerKlient } from "@/lib/supabase/server";
import { AFVISNINGSGRUNDE } from "@/lib/moeder/afvisningsgrunde.ts";

export type Kvalitetstjekfelt =
  | "beslutningstager_bekraeftet"
  | "icp_bekraeftet"
  | "tid_bekraeftet"
  | "interesse_bekraeftet";

const KVALITETSTJEK_FELTER = new Set<string>([
  "beslutningstager_bekraeftet",
  "icp_bekraeftet",
  "tid_bekraeftet",
  "interesse_bekraeftet",
]);

// Etape 10 — Kvalitetstjek. Ét felt ad gangen, samme mønster som
// kvalificering/actions.ts's gemKvalificeringsFelt - kaldes direkte som
// funktion fra klienten (ikke via <form action>), så et enkelt klik på et
// flueben opdaterer med det samme uden en synlig gem-knap.
export async function opdaterKvalitetstjek(
  moedeId: string,
  felt: Kvalitetstjekfelt,
  vaerdi: boolean
): Promise<{ fejl?: string }> {
  if (!KVALITETSTJEK_FELTER.has(felt)) return { fejl: "Ugyldigt felt." };

  const supabase = await opretServerKlient();
  const { error } = await supabase
    .from("moeder")
    .update({ [felt]: vaerdi })
    .eq("id", moedeId);

  if (error) return { fejl: error.message };

  revalidatePath("/moeder");
  revalidatePath("/okonomi");
  return {};
}

const GYLDIGE_STATUSSER = new Set(["afholdt", "afvist_af_kunde", "no_show", "aflyst"]);

// Etape 10 — Mødestatus: planlagt -> afholdt/afvist af kunde/no-show/aflyst.
// "Afvist af kunde" kræver en begrundelse (hvilket kriterium fejlede) - det
// er den vigtigste læringsdata ifølge Spec.md, så den håndhæves her, ikke
// kun i UI'et. Saldo-beskyttelsen ("må aldrig gå i minus uden en
// bekræftelsesdialog") håndteres klient-side (window.confirm) i
// moede-raekke.tsx, FØR denne kaldes - den beregnede kunde_saldo-visning
// (leveret = afholdt + alle fire flueben) sørger for at et fakturerbart
// møde, der ville sende saldoen i minus, aldrig sker uden brugerens
// eksplicitte bekræftelse.
export async function skiftMoedeStatus(
  moedeId: string,
  status: string,
  afvisningsgrund?: string
): Promise<{ fejl?: string }> {
  if (!GYLDIGE_STATUSSER.has(status)) return { fejl: "Ugyldig status." };
  if (
    status === "afvist_af_kunde" &&
    !(AFVISNINGSGRUNDE as readonly string[]).includes(afvisningsgrund ?? "")
  ) {
    return { fejl: "Vælg en begrundelse for afvisningen." };
  }

  const supabase = await opretServerKlient();
  const { error } = await supabase
    .from("moeder")
    .update({
      status,
      afvisningsgrund: status === "afvist_af_kunde" ? afvisningsgrund : null,
    })
    .eq("id", moedeId);

  if (error) return { fejl: error.message };

  revalidatePath("/moeder");
  revalidatePath("/okonomi");
  revalidatePath("/kunder");
  return {};
}
