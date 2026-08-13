import { redirect } from "next/navigation";
import { opretServerKlient } from "@/lib/supabase/server";
import { IndstillingerSide } from "./indstillinger-side";

export default async function IndstillingerRoute() {
  const supabase = await opretServerKlient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profil } = await supabase
    .from("profiler")
    .select("rolle, navn")
    .eq("id", user.id)
    .single();

  const erEjer = profil?.rolle === "ejer";

  const { data: konfiguration } = erEjer
    ? await supabase
        .from("konfiguration")
        .select("tilladte_virksomhedsformer, virksomhedsformer_fysiske_personer, import_advarsel_graense")
        .eq("id", true)
        .single()
    : { data: null };

  return (
    <IndstillingerSide
      email={user.email}
      rolle={profil?.rolle ?? "operator"}
      navn={profil?.navn ?? null}
      konfiguration={konfiguration}
    />
  );
}
