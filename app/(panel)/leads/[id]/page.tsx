import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2,
  IdCard,
  UserRound,
  ClipboardCheck,
  Sparkles,
  History,
  Camera,
  Calculator,
  Handshake,
} from "lucide-react";
import { opretServerKlient } from "@/lib/supabase/server";
import { PIPELINE_LABEL, PIPELINE_STADIER } from "@/lib/leads/pipeline.ts";
import { beregnSnapshotDiff, SNAPSHOT_FELT_LABEL, type SnapshotData } from "@/lib/leads/snapshots.ts";
import { godkendLead, opdaterPipelineStatus } from "./actions";
import { TildelKundeForm } from "./tildel-kunde-form";

type Lead = {
  id: string;
  cvr_nummer: string;
  virksomhedsnavn: string;
  virksomhedsform: string;
  branchekode: string | null;
  branchetekst: string | null;
  antal_ansatte: number | null;
  status: string;
  adresse: string | null;
  postnr: string | null;
  by: string | null;
  telefon: string | null;
  website: string | null;
  reklamebeskyttelse: boolean;
  maa_kontaktes: boolean;
  kontaktperson_navn: string | null;
  kontaktperson_titel: string | null;
  fit: "J" | "N" | null;
  behov: "J" | "N" | null;
  oekonomi: "J" | "N" | null;
  person: "J" | "N" | null;
  kvalificeret: boolean;
  ai_resume: string | null;
  ai_hypotese: string | null;
  ai_score: number | null;
  godkendt: boolean;
  status_pipeline: string;
  kilde: string;
  oprettet: string;
  sidst_aendret: string;
  kunde_id: string | null;
};

type KundeMedSegmenter = {
  id: string;
  navn: string;
  aktive: boolean;
  segmenter: { id: string; navn: string; aktiv: boolean }[];
};

type LogRaekke = {
  id: string;
  sket: string;
  felt: string;
  gammel_vaerdi: unknown;
  ny_vaerdi: unknown;
};

type SnapshotRaekke = {
  id: string;
  hentet: string;
  data: SnapshotData;
};

function Felt({
  label,
  vaerdi,
  beregnet = false,
  tal = false,
}: {
  label: string;
  vaerdi: React.ReactNode;
  beregnet?: boolean;
  tal?: boolean;
}) {
  return (
    <div
      className={
        beregnet
          ? "rounded border border-kant bg-flade-haevet px-3 py-2"
          : "rounded border border-kant bg-flade px-3 py-2"
      }
      title={beregnet ? "Beregnet felt - kan ikke rettes manuelt" : undefined}
    >
      <p className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-tekst-daempet">
        {label}
        {beregnet && <span aria-hidden>🔒</span>}
      </p>
      <p className={`mt-0.5 text-sm text-tekst ${tal ? "tal" : ""}`}>{vaerdi ?? "—"}</p>
    </div>
  );
}

function formatVaerdi(v: unknown): string {
  if (v === null || v === undefined) return "(tom)";
  if (typeof v === "boolean") return v ? "sandt" : "falsk";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export default async function LeadDetaljeSide({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await opretServerKlient();

  const { data: lead, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .maybeSingle<Lead>();

  if (error || !lead) {
    notFound();
  }

  const { data: log } = await supabase
    .from("activity_log")
    .select("id, sket, felt, gammel_vaerdi, ny_vaerdi")
    .eq("lead_id", id)
    .order("sket", { ascending: false })
    .returns<LogRaekke[]>();

  const { data: snapshots } = await supabase
    .from("lead_snapshots")
    .select("id, hentet, data")
    .eq("lead_id", id)
    .order("hentet", { ascending: true })
    .returns<SnapshotRaekke[]>();

  const [{ data: kunder }, { data: tildelteSegmenter }] = await Promise.all([
    supabase
      .from("kunder")
      .select("id, navn, aktive, segmenter(id, navn, aktiv)")
      .order("navn")
      .returns<KundeMedSegmenter[]>(),
    supabase.from("lead_segmenter").select("segment_id").eq("lead_id", id),
  ]);

  // Diffs beregnes mellem hvert snapshot og det forrige - kun det, en
  // geninport fandt ændret "derude", vises. Nyeste øverst i visningen.
  const snapshotDiffs = (snapshots ?? [])
    .map((s, i) => ({
      snapshot: s,
      forrige: i > 0 ? snapshots![i - 1] : null,
      diff: i > 0 ? beregnSnapshotDiff(snapshots![i - 1].data, s.data) : null,
    }))
    .reverse();

  return (
    <div>
      <div className="border-b border-kant px-6 py-3 text-xs text-tekst-daempet">
        <Link href="/leads" className="text-accent hover:underline">
          Leads
        </Link>
        <span className="mx-1.5">/</span>
        <span>{lead.virksomhedsnavn}</span>
      </div>

      <div className="px-6 py-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1
              className={
                lead.maa_kontaktes
                  ? "flex items-center gap-2 text-xl font-semibold text-tekst"
                  : "flex items-center gap-2 text-xl font-semibold text-tekst-daempet line-through"
              }
            >
              <Building2 className="h-5 w-5 shrink-0 text-tekst-daempet" strokeWidth={1.75} />
              {lead.virksomhedsnavn}
            </h1>
            <p className="mt-1 text-sm text-tekst-daempet">
              CVR {lead.cvr_nummer} · {lead.virksomhedsform}
            </p>
          </div>
          {!lead.maa_kontaktes && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-spaerret/40 bg-spaerret/10 px-3 py-1 text-xs font-medium text-spaerret">
              🔒 Spærret — må ikke kontaktes
            </span>
          )}
        </div>

        <div className="mb-6 flex flex-wrap gap-1.5">
          {PIPELINE_STADIER.map((stadie) => {
            // "Godkendt" og "Ringeliste" må kun nås via godkend-knappen nedenfor
            // (og fremover ringeliste-udfald) - se opdaterPipelineStatus.
            const laasesStadie =
              (stadie === "godkendt" || stadie === "ringeliste") && stadie !== lead.status_pipeline;
            return (
              <form key={stadie} action={opdaterPipelineStatus}>
                <input type="hidden" name="leadId" value={lead.id} />
                <input type="hidden" name="stadie" value={stadie} />
                <button
                  type="submit"
                  disabled={stadie === lead.status_pipeline || laasesStadie}
                  title={
                    laasesStadie
                      ? "Kan ikke sættes manuelt - nås kun ved at godkende et kvalificeret lead"
                      : undefined
                  }
                  className={
                    stadie === lead.status_pipeline
                      ? "glow-accent-blod rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-tekst"
                      : laasesStadie
                        ? "cursor-not-allowed rounded-full border border-kant px-3 py-1 text-xs text-tekst-daempet/40"
                        : "rounded-full border border-kant px-3 py-1 text-xs text-tekst-daempet transition-colors hover:border-accent hover:text-tekst"
                  }
                >
                  {PIPELINE_LABEL[stadie]}
                </button>
              </form>
            );
          })}

          {lead.kvalificeret && lead.maa_kontaktes && !lead.godkendt && (
            <form action={godkendLead}>
              <input type="hidden" name="leadId" value={lead.id} />
              <button
                type="submit"
                className="glow-accent rounded-full bg-godkendt px-3 py-1 text-xs font-medium text-accent-tekst"
              >
                Godkend til ringeliste
              </button>
            </form>
          )}

          {lead.godkendt && (
            <span className="inline-flex items-center gap-1 rounded-full border border-godkendt/40 bg-godkendt/10 px-3 py-1 text-xs font-medium text-godkendt">
              ✓ Godkendt til ringeliste
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <section>
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-tekst">
                <IdCard className="h-4 w-4 text-tekst-daempet" strokeWidth={1.75} />
                Stamdata
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Felt label="Status" vaerdi={lead.status} />
                <Felt label="Branchekode" vaerdi={lead.branchekode} />
                <Felt label="Branchetekst" vaerdi={lead.branchetekst} />
                <Felt label="Antal ansatte" vaerdi={lead.antal_ansatte} tal />
                <Felt label="Adresse" vaerdi={lead.adresse} />
                <Felt label="Postnr / By" vaerdi={[lead.postnr, lead.by].filter(Boolean).join(" ")} />
                <Felt label="Telefon" vaerdi={lead.telefon} tal />
                <Felt label="Website" vaerdi={lead.website} />
                <Felt label="Kilde" vaerdi={lead.kilde} />
              </div>
            </section>

            <section>
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-tekst">
                <UserRound className="h-4 w-4 text-tekst-daempet" strokeWidth={1.75} />
                Kontaktperson
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Felt label="Navn" vaerdi={lead.kontaktperson_navn} />
                <Felt label="Titel" vaerdi={lead.kontaktperson_titel} />
              </div>
            </section>

            <section>
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-tekst">
                <ClipboardCheck className="h-4 w-4 text-tekst-daempet" strokeWidth={1.75} />
                Kvalificering
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Felt label="Fit" vaerdi={lead.fit} />
                <Felt label="Behov" vaerdi={lead.behov} />
                <Felt label="Økonomi" vaerdi={lead.oekonomi} />
                <Felt label="Person" vaerdi={lead.person} />
              </div>
              <div className="mt-2">
                <Felt
                  label="Kvalificeret"
                  vaerdi={lead.kvalificeret ? "Ja" : "Nej"}
                  beregnet
                />
              </div>
            </section>

            <section>
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-tekst">
                <Sparkles className="h-4 w-4 text-tekst-daempet" strokeWidth={1.75} />
                AI-felter <span className="text-tekst-daempet">— ikke verificeret</span>
              </h2>
              <div className="flex flex-col gap-2">
                <Felt label="AI-resumé" vaerdi={lead.ai_resume ?? "Ikke genereret endnu"} />
                <Felt label="AI-hypotese" vaerdi={lead.ai_hypotese ?? "Ikke genereret endnu"} />
                <Felt label="AI-score" vaerdi={lead.ai_score} tal />
              </div>
            </section>

            <section>
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-tekst">
                <History className="h-4 w-4 text-tekst-daempet" strokeWidth={1.75} />
                Historik
              </h2>
              {(!log || log.length === 0) && (
                <p className="text-sm text-tekst-daempet">Ingen ændringer registreret endnu.</p>
              )}
              {log && log.length > 0 && (
                <ul className="flex flex-col gap-2 border-l border-kant pl-4">
                  {log.map((r) => (
                    <li key={r.id} className="text-sm">
                      <p className="text-tekst-daempet">
                        <span className="tal">
                          {new Date(r.sket).toLocaleString("da-DK")}
                        </span>{" "}
                        — <span className="text-tekst">{r.felt}</span>
                        {r.felt !== "oprettet" && (
                          <>
                            : {formatVaerdi(r.gammel_vaerdi)} → {formatVaerdi(r.ny_vaerdi)}
                          </>
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-tekst">
                <Camera className="h-4 w-4 text-tekst-daempet" strokeWidth={1.75} />
                Snapshot-historik
              </h2>
              <p className="mb-2 text-xs text-tekst-daempet">
                Ændringer fundet ved geninport af CVR-data (adskilt fra manuelle redigeringer
                ovenfor i Historik).
              </p>
              {snapshotDiffs.length === 0 && (
                <p className="text-sm text-tekst-daempet">
                  Ingen snapshots endnu — tages automatisk ved næste import, der rammer dette
                  lead.
                </p>
              )}
              {snapshotDiffs.length > 0 && (
                <ul className="flex flex-col gap-2 border-l border-kant pl-4">
                  {snapshotDiffs.map(({ snapshot, forrige, diff }) => (
                    <li key={snapshot.id} className="text-sm">
                      <p className="tal text-tekst-daempet">
                        {new Date(snapshot.hentet).toLocaleString("da-DK")}
                      </p>
                      {!forrige && (
                        <p className="text-tekst-daempet">Første snapshot — intet at sammenligne med endnu.</p>
                      )}
                      {forrige && diff && diff.length === 0 && (
                        <p className="text-tekst-daempet">Ingen ændringer siden forrige import.</p>
                      )}
                      {forrige && diff && diff.length > 0 && (
                        <ul className="flex flex-col gap-0.5">
                          {diff.map((d) => (
                            <li key={d.felt} className="text-tekst">
                              {SNAPSHOT_FELT_LABEL[d.felt]}: {formatVaerdi(d.gammel)} → {formatVaerdi(d.ny)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="flex flex-col gap-3">
            <section>
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-tekst">
                <Handshake className="h-4 w-4 text-tekst-daempet" strokeWidth={1.75} />
                Kunde og segment
              </h2>
              <div className="kort-hover rounded-lg border border-kant bg-flade p-4">
                {/* key tvinger et nyt mount, når kunde eller segmenter ændres af
                    Gem-knappen nedenfor - ellers beholder React sin lokale
                    useState fra før serverhandlingen, og feltet klapper visuelt
                    tilbage til den gamle værdi efter gem, selvom data er gemt
                    korrekt (kun synligt ved næste rigtige sideindlæsning). */}
                <TildelKundeForm
                  key={`${lead.kunde_id ?? "ukoblet"}:${(tildelteSegmenter ?? [])
                    .map((t) => t.segment_id)
                    .sort()
                    .join(",")}`}
                  leadId={lead.id}
                  kunder={kunder ?? []}
                  initialKundeId={lead.kunde_id}
                  initialSegmentIds={(tildelteSegmenter ?? []).map((t) => t.segment_id)}
                />
              </div>
            </section>

            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-tekst">
              <Calculator className="h-4 w-4 text-tekst-daempet" strokeWidth={1.75} />
              Beregnede felter
            </h2>
            <Felt
              label="Må kontaktes"
              vaerdi={lead.maa_kontaktes ? "Ja" : "Nej, spærret"}
              beregnet
            />
            <Felt label="Reklamebeskyttelse" vaerdi={lead.reklamebeskyttelse ? "Ja" : "Nej"} />
            <Felt label="Godkendt" vaerdi={lead.godkendt ? "Ja" : "Nej"} />
            <Felt
              label="Oprettet"
              vaerdi={new Date(lead.oprettet).toLocaleString("da-DK")}
              beregnet
              tal
            />
            <Felt
              label="Sidst ændret"
              vaerdi={new Date(lead.sidst_aendret).toLocaleString("da-DK")}
              beregnet
              tal
            />
          </div>
        </div>
      </div>
    </div>
  );
}
