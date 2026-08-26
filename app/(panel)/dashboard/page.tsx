import Link from "next/link";
import {
  Building2,
  ClipboardCheck,
  PhoneCall,
  Handshake,
  ListChecks,
  GitBranch,
  PhoneForwarded,
  Users,
  Activity,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { opretServerKlient } from "@/lib/supabase/server";
import { PIPELINE_FARVE, PIPELINE_LABEL, PIPELINE_STADIER } from "@/lib/leads/pipeline.ts";
import { markerFejlLoest } from "./actions";

type LeadRaekke = {
  id: string;
  virksomhedsnavn: string;
  status_pipeline: string;
  kvalificeret: boolean;
  godkendt: boolean;
  oprettet: string;
};

type KundeRaekke = {
  id: string;
  navn: string;
  dpa_underskrevet: boolean;
  aktive: boolean;
  moeder_koebt: number;
};

type RingIgenRaekke = {
  lead_id: string;
  ring_igen_dato: string | null;
  leads: { virksomhedsnavn: string } | null;
};

type AktivitetsRaekke = {
  id: string;
  sket: string;
  felt: string;
  bruger_id: string | null;
  leads: { virksomhedsnavn: string } | null;
};

type FejlRaekke = {
  id: string;
  modul: string;
  fejl: string;
  oprettet: string;
};

function Hilsen(): string {
  const time = new Date().getHours();
  if (time < 10) return "God morgen";
  if (time < 18) return "God eftermiddag";
  return "God aften";
}

function StatKort({
  label,
  vaerdi,
  undertekst,
  Ikon,
  fremhaevet = false,
}: {
  label: string;
  vaerdi: string | number;
  undertekst?: string;
  Ikon: LucideIcon;
  fremhaevet?: boolean;
}) {
  return (
    <div
      className={
        fremhaevet
          ? "kort-hover glow-accent-blod rounded-lg bg-accent p-4 text-accent-tekst"
          : "kort-hover rounded-lg border border-kant bg-flade p-4"
      }
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={
            fremhaevet
              ? "text-[11px] uppercase tracking-wide text-accent-tekst/80"
              : "text-[11px] uppercase tracking-wide text-tekst-daempet"
          }
        >
          {label}
        </p>
        <Ikon
          className={fremhaevet ? "h-4 w-4 shrink-0 text-accent-tekst/70" : "h-4 w-4 shrink-0 text-tekst-daempet/60"}
          strokeWidth={1.75}
        />
      </div>
      <p className="tal mt-1 text-2xl font-semibold">{vaerdi}</p>
      {undertekst && (
        <p
          className={
            fremhaevet ? "mt-0.5 text-xs text-accent-tekst/70" : "mt-0.5 text-xs text-tekst-daempet"
          }
        >
          {undertekst}
        </p>
      )}
    </div>
  );
}

export default async function DashboardSide() {
  const supabase = await opretServerKlient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profil } = user
    ? await supabase.from("profiler").select("navn").eq("id", user.id).single()
    : { data: null };

  const [{ data: leads }, { data: kunder }, { data: ringIgen }, { data: aktivitet }, { data: fejl }] =
    await Promise.all([
      supabase
        .from("leads")
        .select("id, virksomhedsnavn, status_pipeline, kvalificeret, godkendt, oprettet")
        .eq("maa_kontaktes", true)
        .returns<LeadRaekke[]>(),
      supabase
        .from("kunder")
        .select("id, navn, dpa_underskrevet, aktive, moeder_koebt")
        .eq("aktive", true)
        .returns<KundeRaekke[]>(),
      supabase
        .from("aktiviteter")
        .select("lead_id, ring_igen_dato, leads(virksomhedsnavn)")
        .eq("udfald", "ring_igen")
        .lte("ring_igen_dato", new Date().toISOString())
        .order("ring_igen_dato", { ascending: true })
        .returns<RingIgenRaekke[]>(),
      supabase
        .from("activity_log")
        .select("id, sket, felt, bruger_id, leads(virksomhedsnavn)")
        .order("sket", { ascending: false })
        .limit(6)
        .returns<AktivitetsRaekke[]>(),
      supabase
        .from("fejllog")
        .select("id, modul, fejl, oprettet")
        .is("loest", null)
        .order("oprettet", { ascending: false })
        .returns<FejlRaekke[]>(),
    ]);

  const alleLeads = leads ?? [];
  const kundeListe = kunder ?? [];
  const ringIgenListe = ringIgen ?? [];
  const aktivitetsListe = aktivitet ?? [];
  const uloesteFejl = fejl ?? [];

  // profiler har ingen direkte fremmednøgle fra activity_log (begge peger på
  // auth.users), så PostgREST kan ikke embedde den automatisk - hentes separat
  // og slås sammen i JS.
  const brugerIds = [...new Set(aktivitetsListe.map((a) => a.bruger_id).filter(Boolean))];
  const { data: brugerProfiler } =
    brugerIds.length > 0
      ? await supabase.from("profiler").select("id, navn").in("id", brugerIds)
      : { data: [] as { id: string; navn: string | null }[] };
  const navnPrBrugerId = new Map((brugerProfiler ?? []).map((p) => [p.id, p.navn]));

  const antalPrStadie = Object.fromEntries(
    PIPELINE_STADIER.map((s) => [s, alleLeads.filter((l) => l.status_pipeline === s).length])
  ) as Record<string, number>;
  const leadsIAlt = alleLeads.length;
  const kvalificerede = alleLeads.filter((l) => l.kvalificeret).length;
  const godkendteTilRingeliste = alleLeads.filter((l) => l.godkendt).length;
  const dpaMangler = kundeListe.filter((k) => !k.dpa_underskrevet).length;
  const samletSaldo = kundeListe.reduce((sum, k) => sum + (k.moeder_koebt ?? 0), 0);

  const enUgeSiden = new Date();
  enUgeSiden.setDate(enUgeSiden.getDate() - 7);
  const henstaaendeLaenge = alleLeads.filter(
    (l) =>
      (l.status_pipeline === "ny" || l.status_pipeline === "kvalificering") &&
      new Date(l.oprettet) < enUgeSiden
  ).length;

  const opgaver: { tekst: string; haster: "NU" | "I DAG" | "SNART"; href: string }[] = [];
  if (ringIgenListe.length > 0) {
    opgaver.push({
      tekst: `${ringIgenListe.length} genringning${ringIgenListe.length === 1 ? "" : "er"} er forfaldne`,
      haster: "NU",
      href: "/ringeliste",
    });
  }
  if (godkendteTilRingeliste > 0) {
    opgaver.push({
      tekst: `${godkendteTilRingeliste} godkendt${godkendteTilRingeliste === 1 ? "" : "e"} lead${godkendteTilRingeliste === 1 ? "" : "s"} venter i ringelisten`,
      haster: "I DAG",
      href: "/ringeliste",
    });
  }
  if (dpaMangler > 0) {
    opgaver.push({
      tekst: `${dpaMangler} aktiv${dpaMangler === 1 ? "" : "e"} kunde${dpaMangler === 1 ? "" : "r"} mangler underskrevet DPA`,
      haster: "SNART",
      href: "/kunder",
    });
  }
  if (henstaaendeLaenge > 0) {
    opgaver.push({
      tekst: `${henstaaendeLaenge} lead${henstaaendeLaenge === 1 ? "" : "s"} har ventet over en uge uden kvalificering`,
      haster: "SNART",
      href: "/kvalificering",
    });
  }

  const HASTER_FARVE: Record<string, string> = {
    NU: "text-spaerret",
    "I DAG": "text-advarsel",
    SNART: "text-tekst-daempet",
  };

  return (
    <div>
      <div className="border-b border-kant px-6 py-3 text-xs text-tekst-daempet">
        <span className="text-accent">Dashboard</span>
      </div>

      <div className="flex flex-col gap-6 px-6 py-6">
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl font-semibold text-tekst">
            {Hilsen()}, {profil?.navn || user?.email}
          </h1>
          <p className="text-xs text-tekst-daempet">
            {new Date().toLocaleDateString("da-DK", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>

        <div className="kort-hover rounded-lg border border-kant bg-flade p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-tekst-daempet">
              <ListChecks className="h-3.5 w-3.5" strokeWidth={1.75} />
              Dagens overblik
            </p>
          </div>
          {opgaver.length === 0 ? (
            <p className="text-sm text-tekst-daempet">
              Intet der kræver akut opmærksomhed lige nu.
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {opgaver.map((o, i) => (
                <li key={i}>
                  <Link
                    href={o.href}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-flade-haevet"
                  >
                    <span className="text-sm text-tekst">{o.tekst}</span>
                    <span className={`shrink-0 text-[11px] font-semibold ${HASTER_FARVE[o.haster]}`}>
                      {o.haster}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-tekst-daempet">
            Regelbaseret overblik ud fra jeres egne tal — ikke AI-genereret (AI-berigelse er
            bygget, men kræver ANTHROPIC_API_KEY, som endnu ikke er sat).
          </p>
        </div>

        <div className="kort-hover rounded-lg border border-kant bg-flade p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-tekst-daempet">
              <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.75} />
              Fejllog
            </p>
            {uloesteFejl.length > 0 && (
              <span className="rounded-full bg-spaerret/15 px-2 py-0.5 text-[11px] font-semibold text-spaerret">
                {uloesteFejl.length}
              </span>
            )}
          </div>
          {uloesteFejl.length === 0 ? (
            <p className="text-sm text-tekst-daempet">Ingen uløste fejl fra baggrundsjobs.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {uloesteFejl.map((f) => (
                <li
                  key={f.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-spaerret/20 bg-spaerret/5 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-tekst-daempet">
                      {f.modul}
                      <span className="normal-case">
                        {new Date(f.oprettet).toLocaleString("da-DK")}
                      </span>
                    </p>
                    <p className="mt-0.5 break-words text-sm text-tekst">{f.fejl}</p>
                  </div>
                  <form action={markerFejlLoest} className="shrink-0">
                    <input type="hidden" name="id" value={f.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-kant px-2 py-1 text-xs text-tekst-daempet transition-colors hover:border-godkendt hover:text-godkendt"
                    >
                      Markér løst
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatKort
            label="Leads i alt"
            vaerdi={leadsIAlt}
            undertekst={`${antalPrStadie.ny ?? 0} nye siden import`}
            Ikon={Building2}
          />
          <StatKort
            label="Kvalificerede"
            vaerdi={kvalificerede}
            undertekst={
              leadsIAlt > 0 ? `${Math.round((kvalificerede / leadsIAlt) * 100)}% af alle leads` : "Ingen leads endnu"
            }
            Ikon={ClipboardCheck}
          />
          <StatKort
            label="Godkendt til ringeliste"
            vaerdi={godkendteTilRingeliste}
            undertekst={`${ringIgenListe.length} venter på genringning`}
            Ikon={PhoneCall}
            fremhaevet
          />
          <StatKort
            label="Aktive kunder"
            vaerdi={kundeListe.length}
            undertekst={dpaMangler > 0 ? `${dpaMangler} mangler DPA` : "Alle har underskrevet DPA"}
            Ikon={Handshake}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="kort-hover rounded-lg border border-kant bg-flade p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-tekst">
                <GitBranch className="h-4 w-4 text-tekst-daempet" strokeWidth={1.75} />
                Pipeline-status
              </h2>
              <Link href="/leads" className="text-xs text-accent hover:underline">
                Se alle leads →
              </Link>
            </div>
            <ul className="flex flex-col gap-3">
              {PIPELINE_STADIER.map((stadie) => {
                const antal = antalPrStadie[stadie] ?? 0;
                const pct = leadsIAlt > 0 ? Math.round((antal / leadsIAlt) * 100) : 0;
                const link =
                  stadie === "ny" || stadie === "kvalificering"
                    ? "/kvalificering"
                    : stadie === "godkendt" || stadie === "ringeliste"
                      ? "/ringeliste"
                      : "/leads";
                return (
                  <li key={stadie}>
                    <Link href={link} className="block">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-tekst">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${PIPELINE_FARVE[stadie]}`} />
                          {PIPELINE_LABEL[stadie]}
                        </span>
                        <span className="tal text-tekst-daempet">
                          {antal} <span className="text-tekst-daempet/60">· {pct}%</span>
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-baggrund">
                        <div
                          className={`h-full rounded-full ${PIPELINE_FARVE[stadie]}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="kort-hover rounded-lg border border-kant bg-flade p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-tekst">
                <PhoneForwarded className="h-4 w-4 text-tekst-daempet" strokeWidth={1.75} />
                Ring igen i dag
              </h2>
              <Link href="/ringeliste" className="text-xs text-accent hover:underline">
                Åbn ringeliste →
              </Link>
            </div>
            {ringIgenListe.length === 0 ? (
              <p className="text-sm text-tekst-daempet">Ingen forfaldne genringninger.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {ringIgenListe.slice(0, 6).map((r) => (
                  <li key={r.lead_id}>
                    <Link
                      href={`/leads/${r.lead_id}`}
                      className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-flade-haevet"
                    >
                      <span className="min-w-0 truncate text-tekst">
                        {r.leads?.virksomhedsnavn ?? "Ukendt lead"}
                      </span>
                      <span className="tal shrink-0 text-xs text-tekst-daempet">
                        {r.ring_igen_dato &&
                          new Date(r.ring_igen_dato).toLocaleDateString("da-DK", {
                            day: "numeric",
                            month: "short",
                          })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="kort-hover rounded-lg border border-kant bg-flade p-4">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-tekst">
              <Users className="h-4 w-4 text-tekst-daempet" strokeWidth={1.75} />
              Kunde-snapshot
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-tekst-daempet">
                  Aktive kunder
                </p>
                <p className="tal text-lg font-semibold text-tekst">{kundeListe.length}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-tekst-daempet">
                  Møder i saldo
                </p>
                <p className="tal text-lg font-semibold text-tekst">{samletSaldo}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-tekst-daempet">
                  DPA mangler
                </p>
                <p className={`tal text-lg font-semibold ${dpaMangler > 0 ? "text-spaerret" : "text-tekst"}`}>
                  {dpaMangler}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-tekst-daempet">
                  Ventet &gt; 7 dage
                </p>
                <p className="tal text-lg font-semibold text-tekst">{henstaaendeLaenge}</p>
              </div>
            </div>
          </section>

          <section className="kort-hover rounded-lg border border-kant bg-flade p-4">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-tekst">
              <Activity className="h-4 w-4 text-tekst-daempet" strokeWidth={1.75} />
              Seneste aktivitet
            </h2>
            {aktivitetsListe.length === 0 ? (
              <p className="text-sm text-tekst-daempet">Ingen aktivitet endnu.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {aktivitetsListe.map((a) => (
                  <li key={a.id} className="text-sm">
                    <p className="text-tekst">
                      <span className="font-medium">
                        {(a.bruger_id && navnPrBrugerId.get(a.bruger_id)) || "System"}
                      </span>{" "}
                      <span className="text-tekst-daempet">ændrede {a.felt} på</span>{" "}
                      {a.leads?.virksomhedsnavn ?? "et lead"}
                    </p>
                    <p className="tal text-xs text-tekst-daempet">
                      {new Date(a.sket).toLocaleString("da-DK")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
