"use server";

import { redirect } from "next/navigation";
import { opretServerKlient } from "@/lib/supabase/server";

export async function logInd(_forrigeState: string | null, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const adgangskode = String(formData.get("adgangskode") ?? "");

  const supabase = await opretServerKlient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: adgangskode,
  });

  if (error) {
    return "E-mail eller adgangskode er forkert. Prøv igen.";
  }

  redirect("/dashboard");
}
