"use server";

import { revalidatePath } from "next/cache";
import { opretServerKlient } from "@/lib/supabase/server";

// Spec.md "Fejllog og alarm" (Etape 5) - "Fejl fra baggrundsjobs samles ét
// sted og vises på forsiden. Ingen tavse fejl." Markering som løst er den
// eneste handling en operatør skal kunne foretage her - selve fejlen
// rettes i koden, ikke i UI'et.
export async function markerFejlLoest(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await opretServerKlient();
  await supabase.from("fejllog").update({ loest: new Date().toISOString() }).eq("id", id);

  revalidatePath("/dashboard");
}
