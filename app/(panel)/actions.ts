"use server";

import { redirect } from "next/navigation";
import { opretServerKlient } from "@/lib/supabase/server";

export async function logUd() {
  const supabase = await opretServerKlient();
  await supabase.auth.signOut();
  redirect("/login");
}
