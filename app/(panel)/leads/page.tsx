import Link from "next/link";
import { Building2 } from "lucide-react";
import { opretServerKlient } from "@/lib/supabase/server";
import {
  anvendLeadsFiltre,
  byggFilterChips,
  medOverskrevneParametre,
  parseLeadsFiltre,
} from "@/lib/leads/filters.ts";
import { PIPELINE_FARVE, PIPELINE_LABEL, PIPELINE_STADIER } from "@/lib/leads/pipeline.ts";

type LeadRaekke = {
  id: string;
  virksomhedsnavn: string;
  cvr_nummer: string;
  virksomhedsform: string;
  status: string;
  status_pipeline: string;
  antal_ansatte: number | null;
  by: string | null;
  telefon: string | null;
  maa_kontaktes: boolean;
  kvalificeret: boolean;
};

type FacetRaekke = {
  virksomhedsform: string;
  status: string;
};

const ANSATTE_HURTIGVALG = [
  { label: "1-9", fra: 1, til: 9 },
  { label: "10-19", fra: 10, til: 19 },
  { label: "20-49", fra: 20, til: 49 },
  { label: "50-99", fra: 50, til: 99 },
  { label: "100+", fra: 100, til: null },
];

function sorterbarKolonne(params: {
  label: string;
  kolonne: string;
  filtre: ReturnType<typeof parseLeadsFiltre>;
  sp: URLSearchParams;
}) {
  const { label, kolonne, filtre, sp } = params;
  const erAktiv = filtre.sort === kolonne;
  const naesteRetning = erAktiv && filtre.retning === "asc" ? "desc" : "asc";
  const href = medOverskrevneParametre(sp, { sort: kolonne, retning: naesteRetning });
  return (
    <Link href={href} className="inline-flex items-center gap-1 hover:text-tekst">
      {label}
      {erAktiv && <span>{filtre.retning === "asc" ? "↑" : "↓"}</span>}
    </Link>
  );
}

export default async function LeadsSide({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const spRaw = await searchParams;
  const sp = new URLSearchParams();
  for (const [noegle, vaerdi] of Object.entries(spRaw)) {
    if (Array.isArray(vaerdi)) vaerdi.forEach((v) => sp.append(noegle, v));
    else if (vaerdi !== undefined) sp.set(noegle, vaerdi);
  }
  const filtre = parseLeadsFiltre(spRaw);
  const visning = spRaw.visning === "kanban" ? "kanban" : "tabel";

  const supabase = await opretServerKlient();

  const [
    { count: antalTotal },
    { count: antalKvalificeret },
    { count: antalSpaerret },
    { data: facetData },
    filtreretResultat,
  ] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("kvalificeret", true),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("maa_kontaktes", false),
    supabase.from("leads").select("virksomhedsform, status").returns<FacetRaekke[]>(),
    anvendLeadsFiltre(
      supabase
        .from("leads")
        .select(
          "id, virksomhedsnavn, cvr_nummer, virksomhedsform, status, status_pipeline, antal_ansatte, by, telefon, maa_kontaktes, kvalificeret",
          { count: "exact" }
        ),
      filtre
    ) as Promise<{
      data: LeadRaekke[] | null;
      error: { message: string } | null;
      count: number | null;
    }>,
  ]);

  const { data: leads, error, count: antalEfterFilter } = filtreretResultat;

  const antalMaaKontaktes = (antalTotal ?? 0) - (antalSpaerret ?? 0);
  const kvalificeringsrate =
    antalTotal && antalTotal > 0 ? Math.round(((antalKvalificeret ?? 0) / antalTotal) * 100) : 0;

  const formTaellinger = new Map<string, number>();
  const statusTaellinger = new Map<string, number>();
  (facetData ?? []).forEach((r) => {
    formTaellinger.set(r.virksomhedsform, (formTaellinger.get(r.virksomhedsform) ?? 0) + 1);
    statusTaellinger.set(r.status, (statusTaellinger.get(r.status) ?? 0) + 1);
  });

  const chips = byggFilterChips(filtre, sp);

  return (
    <div>
      <div className="border-b border-kant px-6 py-3 text-xs text-tekst-daempet">
        <span className="text-accent">Pipeline</span>
        <span className="mx-1.5">/</span>
        <span>Leads</span>
      </div>

      <div className="px-6 py-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-tekst">
              <Building2 className="h-5 w-5 text-tekst-daempet" strokeWidth={1.75} />
              Leads
            </h1>
            <p className="mt-1 text-sm text-tekst-daempet">
              Her filtrerer og finder du leads. Klik på et lead for at se al historik.
            </p>
          </div>
          <Link
            href="/leads/importer"
            className="glow-accent shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-tekst"
          >
            Importér leads
          </Link>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="kort-hover rounded-lg border border-kant bg-flade p-4">
            <p className="text-[11px] uppercase tracking-wide text-tekst-daempet">Leads i alt</p>
            <p className="tal mt-2 text-2xl font-semibold text-tekst">{antalTotal ?? 0}</p>
          </div>
          <div className="kort-hover rounded-lg border border-kant bg-flade p-4">
            <p className="text-[11px] uppercase tracking-wide text-tekst-daempet">Kvalificerede</p>
            <p className="tal mt-2 text-2xl font-semibold text-tekst">{antalKvalificeret ?? 0}</p>
          </div>
          <div className="kort-hover rounded-lg border border-kant bg-flade p-4">
            <p className="text-[11px] uppercase tracking-wide text-tekst-daempet">Må kontaktes</p>
            <p className="tal mt-2 text-2xl font-semibold text-tekst">{antalMaaKontaktes}</p>
          </div>
          <div className="kort-hover glow-accent-blod rounded-lg bg-accent p-4">
            <p className="text-[11px] uppercase tracking-wide text-accent-tekst/80">
              Kvalificeringsrate
            </p>
            <p className="tal mt-2 text-2xl font-semibold text-accent-tekst">
              {kvalificeringsrate}%
            </p>
          </div>
        </div>

        <div className="mb-6 flex gap-6">
          <form
            method="get"
            className="flex w-64 shrink-0 flex-col divide-y divide-kant rounded-lg border border-kant bg-flade text-sm"
          >
            <div className="p-4">
              <label className="mb-1.5 block text-xs font-medium text-tekst">Fritekst</label>
              <input
                type="text"
                name="sog"
                defaultValue={filtre.sog}
                placeholder="Navn, CVR-nummer, by"
                className="w-full rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
              />
            </div>

            <div className="p-4">
              <label className="mb-1.5 block text-xs font-medium text-tekst">Antal ansatte</label>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {ANSATTE_HURTIGVALG.map((h) => (
                  <Link
                    key={h.label}
                    href={medOverskrevneParametre(sp, {
                      ansatte_fra: String(h.fra),
                      ansatte_til: h.til === null ? null : String(h.til),
                    })}
                    className="rounded-full border border-kant px-2.5 py-0.5 text-xs text-tekst-daempet transition-colors hover:border-accent hover:text-tekst"
                  >
                    {h.label}
                  </Link>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  name="ansatte_fra"
                  min={0}
                  defaultValue={filtre.ansatteFra ?? ""}
                  placeholder="Fra"
                  className="w-full rounded-md border border-kant bg-baggrund px-2 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
                />
                <span className="text-tekst-daempet">–</span>
                <input
                  type="number"
                  name="ansatte_til"
                  min={0}
                  defaultValue={filtre.ansatteTil ?? ""}
                  placeholder="Til"
                  className="w-full rounded-md border border-kant bg-baggrund px-2 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
                />
              </div>
            </div>

            {formTaellinger.size > 0 && (
              <div className="p-4">
                <label className="mb-1.5 block text-xs font-medium text-tekst">Virksomhedsform</label>
                <div className="flex flex-col gap-0.5">
                  {[...formTaellinger.entries()].map(([form, antal]) => (
                    <label
                      key={form}
                      className="-mx-1.5 flex cursor-pointer items-center justify-between gap-2 rounded px-1.5 py-1 text-tekst-daempet transition-colors hover:bg-flade-haevet hover:text-tekst"
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="form"
                          value={form}
                          defaultChecked={filtre.former.includes(form)}
                        />
                        {form}
                      </span>
                      <span className="tal text-xs">{antal}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {statusTaellinger.size > 0 && (
              <div className="p-4">
                <label className="mb-1.5 block text-xs font-medium text-tekst">Status</label>
                <div className="flex flex-col gap-0.5">
                  {[...statusTaellinger.entries()].map(([status, antal]) => (
                    <label
                      key={status}
                      className="-mx-1.5 flex cursor-pointer items-center justify-between gap-2 rounded px-1.5 py-1 text-tekst-daempet transition-colors hover:bg-flade-haevet hover:text-tekst"
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="status"
                          value={status}
                          defaultChecked={filtre.statusser.includes(status)}
                        />
                        {status}
                      </span>
                      <span className="tal text-xs">{antal}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4">
              <label className="mb-1.5 block text-xs font-medium text-tekst">Kvalificering</label>
              <div className="flex flex-col gap-0.5 text-tekst-daempet">
                {[
                  { v: "alle", l: "Alle" },
                  { v: "kvalificerede", l: "Kvalificerede" },
                  { v: "ikke_vurderet", l: "Ikke vurderet" },
                  { v: "afvist", l: "Afvist" },
                ].map((o) => (
                  <label
                    key={o.v}
                    className="-mx-1.5 flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 transition-colors hover:bg-flade-haevet hover:text-tekst"
                  >
                    <input type="radio" name="kval" value={o.v} defaultChecked={filtre.kval === o.v} />
                    {o.l}
                  </label>
                ))}
              </div>
            </div>

            <div className="p-4">
              <label className="mb-1.5 block text-xs font-medium text-tekst">Kontaktbarhed</label>
              <div className="flex flex-col gap-0.5 text-tekst-daempet">
                {[
                  { v: "maa_kontaktes", l: "Må kontaktes" },
                  { v: "spaerret", l: "Spærret" },
                  { v: "alle", l: "Alle" },
                ].map((o) => (
                  <label
                    key={o.v}
                    className="-mx-1.5 flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 transition-colors hover:bg-flade-haevet hover:text-tekst"
                  >
                    <input
                      type="radio"
                      name="kontakt"
                      value={o.v}
                      defaultChecked={filtre.kontakt === o.v}
                    />
                    {o.l}
                  </label>
                ))}
              </div>
            </div>

            <div className="p-4">
              <label className="mb-1.5 block text-xs font-medium text-tekst">Tildeling</label>
              <div className="flex flex-col gap-0.5 text-tekst-daempet">
                {[
                  { v: "alle", l: "Alle" },
                  { v: "ukoblet", l: "Ukoblet" },
                  { v: "tildelt", l: "Tildelt kunde" },
                ].map((o) => (
                  <label
                    key={o.v}
                    className="-mx-1.5 flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 transition-colors hover:bg-flade-haevet hover:text-tekst"
                  >
                    <input
                      type="radio"
                      name="tildeling"
                      value={o.v}
                      defaultChecked={filtre.tildeling === o.v}
                    />
                    {o.l}
                  </label>
                ))}
              </div>
            </div>

            <div className="p-4">
              <button
                type="submit"
                className="glow-accent w-full rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-tekst"
              >
                Filtrér
              </button>
            </div>
          </form>

          <div className="min-w-0 flex-1">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="inline-flex rounded-md border border-kant p-0.5 text-xs">
                <Link
                  href={medOverskrevneParametre(sp, { visning: null })}
                  className={
                    visning === "tabel"
                      ? "rounded bg-flade-haevet px-3 py-1 font-medium text-tekst"
                      : "px-3 py-1 text-tekst-daempet hover:text-tekst"
                  }
                >
                  Tabel
                </Link>
                <Link
                  href={medOverskrevneParametre(sp, { visning: "kanban" })}
                  className={
                    visning === "kanban"
                      ? "rounded bg-flade-haevet px-3 py-1 font-medium text-tekst"
                      : "px-3 py-1 text-tekst-daempet hover:text-tekst"
                  }
                >
                  Kanban
                </Link>
              </div>
              {leads && leads.length > 0 && (
                <p className="text-xs text-tekst-daempet">
                  Viser {leads.length} af {antalEfterFilter ?? leads.length} leads
                  {antalTotal !== antalEfterFilter ? ` (${antalTotal ?? 0} i alt, ufiltreret)` : ""}
                </p>
              )}
            </div>

            {chips.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {chips.map((c) => (
                  <Link
                    key={c.label}
                    href={c.fjernHref}
                    className="inline-flex items-center gap-1.5 rounded-full border border-kant bg-flade px-2.5 py-1 text-xs text-tekst-daempet hover:border-spaerret hover:text-spaerret"
                  >
                    {c.label}
                    <span aria-hidden>×</span>
                  </Link>
                ))}
                <Link href="/leads" className="text-xs text-tekst-daempet underline hover:text-tekst">
                  Ryd alle
                </Link>
              </div>
            )}

            {error && (
              <p className="rounded border border-spaerret/30 bg-spaerret/10 px-3 py-2 text-sm text-spaerret">
                Kunne ikke hente leads: {error.message}
              </p>
            )}

            {!error && (!leads || leads.length === 0) && (antalTotal ?? 0) === 0 && (
              <div className="rounded-lg border border-kant bg-flade px-6 py-10 text-center">
                <p className="text-sm text-tekst">Der er endnu ingen leads.</p>
                <p className="mt-1 text-sm text-tekst-daempet">
                  Importér en CSV-fil fra cvr.dk for at komme i gang.
                </p>
                <Link
                  href="/leads/importer"
                  className="glow-accent mt-4 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-tekst"
                >
                  Importér leads
                </Link>
              </div>
            )}

            {!error && (!leads || leads.length === 0) && (antalTotal ?? 0) > 0 && (
              <div className="rounded-lg border border-kant bg-flade px-6 py-10 text-center">
                <p className="text-sm text-tekst">Ingen leads matcher de valgte filtre.</p>
                <Link href="/leads" className="mt-2 inline-block text-sm text-accent underline">
                  Ryd alle filtre
                </Link>
              </div>
            )}

            {!error && leads && leads.length > 0 && visning === "kanban" && (
              <div className="grid grid-cols-1 gap-3 overflow-x-auto sm:grid-cols-5">
                {PIPELINE_STADIER.map((stadie) => {
                  const leadsIStadie = leads.filter((l) => l.status_pipeline === stadie);
                  return (
                    <div key={stadie} className="min-w-[220px] rounded-lg border border-kant bg-flade">
                      <div className="flex items-center justify-between border-b border-kant px-3 py-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-tekst">
                          <span className={`h-1.5 w-1.5 rounded-full ${PIPELINE_FARVE[stadie]}`} />
                          {PIPELINE_LABEL[stadie]}
                        </span>
                        <span className="tal text-xs text-tekst-daempet">{leadsIStadie.length}</span>
                      </div>
                      <div className="flex flex-col gap-2 p-2">
                        {leadsIStadie.length === 0 && (
                          <p className="px-1 py-2 text-center text-xs text-tekst-daempet">Ingen</p>
                        )}
                        {leadsIStadie.map((lead) => (
                          <Link
                            key={lead.id}
                            href={`/leads/${lead.id}`}
                            className="block rounded border border-kant bg-baggrund p-2 transition-colors hover:border-accent"
                          >
                            <p
                              className={
                                lead.maa_kontaktes
                                  ? "text-sm text-tekst"
                                  : "text-sm text-tekst-daempet line-through"
                              }
                            >
                              {lead.virksomhedsnavn}
                            </p>
                            <p className="tal mt-0.5 text-xs text-tekst-daempet">
                              {lead.cvr_nummer}
                              {lead.antal_ansatte !== null ? ` · ${lead.antal_ansatte} ans.` : ""}
                            </p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!error && leads && leads.length > 0 && visning === "tabel" && (
              <>
                <div className="overflow-x-auto rounded-lg border border-kant bg-flade">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-kant text-[11px] uppercase tracking-wide text-tekst-daempet">
                      <tr>
                        <th className="px-4 py-2.5 font-medium">
                          {sorterbarKolonne({ label: "Virksomhed", kolonne: "virksomhedsnavn", filtre, sp })}
                        </th>
                        <th className="px-4 py-2.5 font-medium">
                          {sorterbarKolonne({ label: "CVR-nummer", kolonne: "cvr_nummer", filtre, sp })}
                        </th>
                        <th className="px-4 py-2.5 font-medium">Form</th>
                        <th className="px-4 py-2.5 font-medium">Pipeline</th>
                        <th className="px-4 py-2.5 font-medium">
                          {sorterbarKolonne({ label: "Ansatte", kolonne: "antal_ansatte", filtre, sp })}
                        </th>
                        <th className="px-4 py-2.5 font-medium">By</th>
                        <th className="px-4 py-2.5 font-medium">Må kontaktes</th>
                        <th className="px-4 py-2.5 font-medium">Kvalificeret</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((lead) => (
                        <tr
                          key={lead.id}
                          className="border-b border-kant last:border-0 transition-colors hover:bg-flade-haevet/50"
                        >
                          <td className="px-4 py-2.5">
                            <Link
                              href={`/leads/${lead.id}`}
                              className={
                                lead.maa_kontaktes
                                  ? "text-tekst hover:text-accent"
                                  : "text-tekst-daempet line-through hover:text-spaerret"
                              }
                            >
                              {lead.virksomhedsnavn}
                            </Link>
                          </td>
                          <td className="tal px-4 py-2.5 text-tekst-daempet">{lead.cvr_nummer}</td>
                          <td className="px-4 py-2.5 text-tekst-daempet">{lead.virksomhedsform}</td>
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center gap-1.5 text-tekst">
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${PIPELINE_FARVE[lead.status_pipeline] ?? "bg-tekst-daempet"}`}
                              />
                              {PIPELINE_LABEL[lead.status_pipeline] ?? lead.status_pipeline}
                            </span>
                          </td>
                          <td className="tal px-4 py-2.5 text-tekst-daempet">
                            {lead.antal_ansatte ?? "—"}
                          </td>
                          <td className="px-4 py-2.5 text-tekst-daempet">{lead.by ?? "—"}</td>
                          <td className="px-4 py-2.5">
                            {lead.maa_kontaktes ? (
                              <span className="text-tekst-daempet">Ja</span>
                            ) : (
                              <span className="text-spaerret">Spærret</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-tekst-daempet">
                            {lead.kvalificeret ? "Ja" : "Nej"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
