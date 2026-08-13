import Link from "next/link";
import { notFound } from "next/navigation";
import { opretServerKlient } from "@/lib/supabase/server";
import {
  opdaterDpa,
  opdaterIcp,
  opdaterKunde,
  opdaterMoederKoebt,
  opretManuskript,
  skiftAktivStatus,
} from "../actions";

type Kunde = {
  id: string;
  navn: string;
  kontaktperson: string | null;
  icp: {
    branchekoder?: string[];
    virksomhedsformer?: string[];
    postnumre?: string[];
    ansatte_fra?: number | null;
    ansatte_til?: number | null;
  } | null;
  pris_pr_moede: number | null;
  startdato: string | null;
  pilot_slutdato: string | null;
  dpa_underskrevet: boolean;
  dpa_dato: string | null;
  dpa_link: string | null;
  aktive: boolean;
  moeder_koebt: number;
};

type Saldo = {
  moeder_koebt: number;
  moeder_leveret: number;
  moeder_afvist: number;
  saldo: number;
};

type TilknyttetLead = {
  id: string;
  virksomhedsnavn: string;
  cvr_nummer: string;
  status_pipeline: string;
};

type Manuskript = {
  id: string;
  version: number;
  indhold: string;
  oprettet: string;
};

export default async function KundeDetaljeSide({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await opretServerKlient();

  const { data: kunde, error } = await supabase
    .from("kunder")
    .select("*")
    .eq("id", id)
    .maybeSingle<Kunde>();

  if (error || !kunde) notFound();

  const [{ data: saldo }, { data: leads }, { data: manuskripter }] = await Promise.all([
    supabase.from("kunde_saldo").select("*").eq("kunde_id", id).maybeSingle<Saldo>(),
    supabase
      .from("leads")
      .select("id, virksomhedsnavn, cvr_nummer, status_pipeline")
      .eq("kunde_id", id)
      .returns<TilknyttetLead[]>(),
    supabase
      .from("manuskripter")
      .select("id, version, indhold, oprettet")
      .eq("kunde_id", id)
      .order("version", { ascending: false })
      .returns<Manuskript[]>(),
  ]);

  const [nyesteManuskript, ...tidligereManuskripter] = manuskripter ?? [];

  const icp = kunde.icp ?? {};
  const pilotUdloebet = kunde.pilot_slutdato
    ? new Date(kunde.pilot_slutdato) < new Date()
    : false;

  return (
    <div>
      <div className="border-b border-kant px-6 py-3 text-xs text-tekst-daempet">
        <Link href="/kunder" className="text-accent hover:underline">
          Kunder
        </Link>
        <span className="mx-1.5">/</span>
        <span>{kunde.navn}</span>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-tekst">{kunde.navn}</h1>
            <p className="mt-1 text-sm text-tekst-daempet">
              {kunde.aktive ? "Aktiv kunde" : "Inaktiv"}
            </p>
          </div>
          <form action={skiftAktivStatus}>
            <input type="hidden" name="kundeId" value={kunde.id} />
            <input type="hidden" name="aktive" value={kunde.aktive ? "false" : "true"} />
            <button
              type="submit"
              className="rounded-md border border-kant px-3 py-1.5 text-sm text-tekst-daempet transition-colors hover:border-accent hover:text-tekst"
            >
              {kunde.aktive ? "Marker inaktiv" : "Marker aktiv"}
            </button>
          </form>
        </div>

        {!kunde.dpa_underskrevet && (
          <p className="mb-6 rounded-lg border border-spaerret/30 bg-spaerret/10 px-4 py-3 text-sm text-spaerret">
            Databehandleraftale (DPA) er ikke underskrevet endnu. Levering af leads/møder til
            denne kunde bør ikke ske, før den er på plads.
          </p>
        )}

        <div className="flex flex-col gap-6">
          <section>
            <h2 className="mb-2 text-sm font-semibold text-tekst">Stamdata</h2>
            <form
              action={opdaterKunde}
              className="grid grid-cols-1 gap-3 rounded-lg border border-kant bg-flade p-4 sm:grid-cols-2"
            >
              <input type="hidden" name="kundeId" value={kunde.id} />
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-tekst-daempet">Navn</span>
                <input
                  type="text"
                  name="navn"
                  defaultValue={kunde.navn}
                  required
                  className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-tekst-daempet">Kontaktperson</span>
                <input
                  type="text"
                  name="kontaktperson"
                  defaultValue={kunde.kontaktperson ?? ""}
                  className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-tekst-daempet">Aftalt pris pr. møde (kr.)</span>
                <input
                  type="number"
                  name="pris_pr_moede"
                  min={0}
                  defaultValue={kunde.pris_pr_moede ?? ""}
                  className="tal rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
                />
              </label>
              <div />
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-tekst-daempet">Startdato</span>
                <input
                  type="date"
                  name="startdato"
                  defaultValue={kunde.startdato ?? ""}
                  className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-tekst-daempet">
                  Pilot slutter {pilotUdloebet && <span className="text-advarsel">(udløbet)</span>}
                </span>
                <input
                  type="date"
                  name="pilot_slutdato"
                  defaultValue={kunde.pilot_slutdato ?? ""}
                  className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
                />
              </label>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="glow-accent rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-tekst"
                >
                  Gem
                </button>
              </div>
            </form>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-tekst">
              Saldo — forudbetalte møder
            </h2>
            <div className="grid grid-cols-3 gap-3 rounded-lg border border-kant bg-flade p-4">
              <form action={opdaterMoederKoebt} className="col-span-3 flex items-end gap-2 sm:col-span-1">
                <input type="hidden" name="kundeId" value={kunde.id} />
                <label className="flex flex-1 flex-col gap-1 text-sm">
                  <span className="text-tekst-daempet">Møder købt</span>
                  <input
                    type="number"
                    name="moeder_koebt"
                    min={0}
                    defaultValue={kunde.moeder_koebt}
                    className="tal rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-md border border-kant px-2.5 py-1.5 text-sm text-tekst-daempet transition-colors hover:border-accent hover:text-tekst"
                >
                  Gem
                </button>
              </form>
              <div>
                <p className="text-xs text-tekst-daempet">Leveret</p>
                <p className="tal text-lg text-tekst">{saldo?.moeder_leveret ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-tekst-daempet">Saldo</p>
                <p
                  className={
                    saldo && saldo.saldo < 2
                      ? "tal text-lg font-semibold text-advarsel"
                      : "tal text-lg font-semibold text-tekst"
                  }
                >
                  {saldo?.saldo ?? kunde.moeder_koebt}
                </p>
              </div>
            </div>
            {saldo && saldo.saldo < 2 && (
              <p className="mt-2 text-xs text-advarsel">
                Saldoen er under 2 møder — overvej at aftale en ny pakke med kunden.
              </p>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-tekst">
              Databehandleraftale (DPA)
            </h2>
            <form
              action={opdaterDpa}
              className="flex flex-col gap-3 rounded-lg border border-kant bg-flade p-4"
            >
              <input type="hidden" name="kundeId" value={kunde.id} />
              <label className="flex items-center gap-2 text-sm text-tekst">
                <input
                  type="checkbox"
                  name="dpa_underskrevet"
                  defaultChecked={kunde.dpa_underskrevet}
                />
                DPA er underskrevet
              </label>
              <div className="flex gap-3">
                <label className="flex flex-1 flex-col gap-1 text-sm">
                  <span className="text-tekst-daempet">Dato</span>
                  <input
                    type="date"
                    name="dpa_dato"
                    defaultValue={kunde.dpa_dato ?? ""}
                    className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1 text-sm">
                  <span className="text-tekst-daempet">Link til dokument</span>
                  <input
                    type="url"
                    name="dpa_link"
                    defaultValue={kunde.dpa_link ?? ""}
                    placeholder="https://…"
                    className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
                  />
                </label>
              </div>
              <button
                type="submit"
                className="w-fit rounded-md border border-kant px-3 py-1.5 text-sm text-tekst-daempet transition-colors hover:border-accent hover:text-tekst"
              >
                Gem
              </button>
            </form>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-tekst">
              Kundeprofil (ICP) <span className="font-normal text-tekst-daempet">— hårde kriterier til matching</span>
            </h2>
            <form
              action={opdaterIcp}
              className="flex flex-col gap-3 rounded-lg border border-kant bg-flade p-4"
            >
              <input type="hidden" name="kundeId" value={kunde.id} />
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-tekst-daempet">Branchekoder (kommasepareret)</span>
                <input
                  type="text"
                  name="branchekoder"
                  defaultValue={(icp.branchekoder ?? []).join(", ")}
                  placeholder="fx 812100, 812900"
                  className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
                />
              </label>
              <div className="flex gap-3">
                <label className="flex flex-1 flex-col gap-1 text-sm">
                  <span className="text-tekst-daempet">Antal ansatte, fra</span>
                  <input
                    type="number"
                    name="ansatte_fra"
                    min={0}
                    defaultValue={icp.ansatte_fra ?? ""}
                    className="tal rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1 text-sm">
                  <span className="text-tekst-daempet">Antal ansatte, til</span>
                  <input
                    type="number"
                    name="ansatte_til"
                    min={0}
                    defaultValue={icp.ansatte_til ?? ""}
                    className="tal rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-tekst-daempet">Tilladte virksomhedsformer (kommasepareret)</span>
                <input
                  type="text"
                  name="virksomhedsformer"
                  defaultValue={(icp.virksomhedsformer ?? []).join(", ")}
                  placeholder="fx ApS, A/S"
                  className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-tekst-daempet">Postnumre (kommasepareret)</span>
                <input
                  type="text"
                  name="postnumre"
                  defaultValue={(icp.postnumre ?? []).join(", ")}
                  placeholder="fx 2100, 8000"
                  className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
                />
              </label>
              <button
                type="submit"
                className="w-fit rounded-md border border-kant px-3 py-1.5 text-sm text-tekst-daempet transition-colors hover:border-accent hover:text-tekst"
              >
                Gem kundeprofil
              </button>
            </form>
          </section>

          <section>
            <h2 className="mb-1 text-sm font-semibold text-tekst">Opkaldsmanuskript</h2>
            <p className="mb-2 text-xs text-tekst-daempet">
              Vist i ringelisten for leads tilknyttet denne kunde. Hver gemning laver en ny
              version — tidligere versioner slettes ikke, så resultater kan spores til den
              version, der var i brug.
            </p>
            <div className="flex flex-col gap-3 rounded-lg border border-kant bg-flade p-4">
              {nyesteManuskript ? (
                <div className="rounded-md border border-kant bg-baggrund px-3 py-2">
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-tekst-daempet">
                    Nuværende — version {nyesteManuskript.version}
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-tekst">
                    {nyesteManuskript.indhold}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-tekst-daempet">Intet manuskript endnu.</p>
              )}

              <form action={opretManuskript} className="flex flex-col gap-2">
                <input type="hidden" name="kundeId" value={kunde.id} />
                <textarea
                  name="indhold"
                  rows={4}
                  placeholder="Skriv en ny version af manuskriptet…"
                  className="rounded-md border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none transition-colors focus-visible:border-accent"
                />
                <button
                  type="submit"
                  className="w-fit rounded-md border border-kant px-3 py-1.5 text-sm text-tekst-daempet transition-colors hover:border-accent hover:text-tekst"
                >
                  Gem som version {(nyesteManuskript?.version ?? 0) + 1}
                </button>
              </form>

              {tidligereManuskripter.length > 0 && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-tekst-daempet hover:text-tekst">
                    {tidligereManuskripter.length} tidligere version
                    {tidligereManuskripter.length === 1 ? "" : "er"}
                  </summary>
                  <ul className="mt-2 flex flex-col gap-2">
                    {tidligereManuskripter.map((m) => (
                      <li key={m.id} className="rounded-md border border-kant px-3 py-2">
                        <p className="mb-1 text-[11px] uppercase tracking-wide text-tekst-daempet">
                          Version {m.version} — {new Date(m.oprettet).toLocaleDateString("da-DK")}
                        </p>
                        <p className="whitespace-pre-wrap text-tekst-daempet">{m.indhold}</p>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-tekst">Tilknyttede leads</h2>
            {(!leads || leads.length === 0) && (
              <p className="text-sm text-tekst-daempet">
                Ingen leads tildelt endnu — matching (Etape 9) er ikke bygget.
              </p>
            )}
            {leads && leads.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {leads.map((l) => (
                  <Link
                    key={l.id}
                    href={`/leads/${l.id}`}
                    className="rounded-lg border border-kant bg-flade px-4 py-2.5 text-sm text-tekst transition-colors hover:border-accent"
                  >
                    {l.virksomhedsnavn}{" "}
                    <span className="tal text-tekst-daempet">({l.cvr_nummer})</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
