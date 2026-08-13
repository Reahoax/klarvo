import { opretServerKlient } from "@/lib/supabase/server";
import { SidebarNav } from "./sidebar-nav";
import { BrugerMenu } from "./bruger-menu";
import { BrugerTemaEffekt } from "./brugertema-effekt";
import { logUd } from "./actions";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await opretServerKlient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profil } = user
    ? await supabase.from("profiler").select("rolle, navn, avatar_url").eq("id", user.id).single()
    : { data: null };

  const erEjer = profil?.rolle === "ejer";
  // Kun ejere ser/kan ændre Forretningsregler i Indstillinger-pop-op'en, så
  // konfiguration hentes kun for dem - operatører behøver den aldrig.
  const { data: konfiguration } = erEjer
    ? await supabase
        .from("konfiguration")
        .select(
          "tilladte_virksomhedsformer, virksomhedsformer_fysiske_personer, import_advarsel_graense, ringetid_fra, ringetid_til, ringetid_ugedage"
        )
        .eq("id", true)
        .single()
    : { data: null };

  const forbogstav = (profil?.navn || user?.email || "?").slice(0, 1).toUpperCase();

  return (
    // h-screen + overflow-hidden på roden, så venstremenuen og indholdet ruller
    // hver for sig. Uden det stod aside og main som lige høje flex-søskende, og
    // brugermenuen nederst i sidebaren kunne blive skubbet uden for skærmen på
    // lange sider (fx et langt filterpanel), fordi hele siden blev én lang scroll.
    <div className="flex h-screen overflow-hidden bg-baggrund">
      <BrugerTemaEffekt />
      <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-kant bg-flade">
        <div className="group flex items-center gap-2 border-b border-kant px-4 py-4">
          <span className="glow-accent-blod flex h-6 w-6 items-center justify-center rounded bg-accent text-xs font-bold text-accent-tekst transition-transform duration-200 ease-out group-hover:scale-110">
            K
          </span>
          <span className="text-sm font-semibold text-tekst">Klarvo</span>
        </div>

        <SidebarNav />

        <BrugerMenu
          email={user?.email}
          rolle={profil?.rolle ?? "operator"}
          navn={profil?.navn ?? null}
          avatarUrl={profil?.avatar_url ?? null}
          konfiguration={konfiguration}
          forbogstav={forbogstav}
          logUd={logUd}
        />
      </aside>

      <main className="h-screen flex-1 overflow-y-auto overflow-x-auto">{children}</main>
    </div>
  );
}
