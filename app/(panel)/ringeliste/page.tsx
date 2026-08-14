import Link from "next/link";
import { PhoneCall } from "lucide-react";
import { opretServerKlient } from "@/lib/supabase/server";
import { erIndenforRingetid } from "@/lib/leads/ringetid.ts";
import { INDVENDINGER } from "@/lib/leads/indvendinger.ts";
import { gemAktivitet } from "./actions";

type Kandidat = {
  id: string;
  virksomhedsnavn: string;
  cvr_nummer: string;
  kontaktperson_navn: string | null;
  kontaktperson_titel: string | null;
  telefon: string | null;
  branchetekst: string | null;
  by: string | null;
  kunde_id: string | null;
  antal_forsoeg: number;
};

const UDFALD_KNAPPER: { udfald: string; label: string; klasse: string }[] = [
  {
    udfald: "moede_booket",
    label: "Møde booket",
    klasse: "bg-godkendt text-accent-tekst hover:opacity-90",
  },
  {
    udfald: "ring_igen",
    label: "Ring igen",
    klasse: "bg-advarsel text-accent-tekst hover:opacity-90",
  },
  {
    udfald: "lagde_paa",
    label: "Lagde på",
    klasse: "border border-kant text-tekst-daempet hover:border-tekst-daempet hover:text-tekst",
  },
  {
    udfald: "ikke_kontakt",
    label: "Ikke kontakt",
    klasse: "border border-kant text-tekst-daempet hover:border-tekst-daempet hover:text-tekst",
  },
  {
    udfald: "ikke_interesseret",
    label: "Ikke interesseret",
    klasse: "bg-spaerret text-accent-tekst hover:opacity-90",
  },
];

export default async function RingelisteSide() {
  const supabase = await opretServerKlient();

  const { data: konfiguration } = await supabase
    .from("konfiguration")
    .select("ringetid_fra, ringetid_til, ringetid_ugedage")
    .eq("id", true)
    .single();

  const indenforRingetid = konfiguration ? erIndenforRingetid(konfiguration) : true;

  const { data: kandidater, error } = indenforRingetid
    ? await supabase
        .from("ringeliste_kandidater")
        .select(
          "id, virksomhedsnavn, cvr_nummer, kontaktperson_navn, kontaktperson_titel, telefon, branchetekst, by, kunde_id, antal_forsoeg"
        )
        .order("oprettet", { ascending: true })
        .returns<Kandidat[]>()
    : { data: null, error: null };

  const kundeIds = [...new Set((kandidater ?? []).map((k) => k.kunde_id).filter(Boolean))];
  const { data: manuskripter } = kundeIds.length
    ? await supabase
        .from("manuskripter")
        .select("id, kunde_id, version, indhold")
        .in("kunde_id", kundeIds)
        .order("version", { ascending: false })
    : { data: [] as { id: string; kunde_id: string; version: number; indhold: string }[] };
  // Kun den nyeste version pr. kunde er relevant her - order+ovenstående sikrer
  // at den første vi støder på pr. kunde_id i loopet er den nyeste.
  const nyesteManuskriptPrKunde = new Map<string, { id: string; version: number; indhold: string }>();
  for (const m of manuskripter ?? []) {
    if (!nyesteManuskriptPrKunde.has(m.kunde_id)) {
      nyesteManuskriptPrKunde.set(m.kunde_id, { id: m.id, version: m.version, indhold: m.indhold });
    }
  }

  if (!indenforRingetid && konfiguration) {
    const UGEDAG_LABEL: Record<number, string> = {
      1: "man",
      2: "tir",
      3: "ons",
      4: "tor",
      5: "fre",
      6: "lør",
      7: "søn",
    };
    const dage = konfiguration.ringetid_ugedage
      .slice()
      .sort((a: number, b: number) => a - b)
      .map((d: number) => UGEDAG_LABEL[d])
      .join(", ");
    return (
      <div>
        <div className="border-b border-kant px-6 py-3 text-xs text-tekst-daempet">
          <span className="text-accent">Pipeline</span>
          <span className="mx-1.5">/</span>
          <span>Ringeliste</span>
        </div>
        <div className="mx-auto max-w-2xl px-6 py-6">
          <h1 className="flex items-center gap-2 text-xl font-semibold text-tekst">
          <PhoneCall className="h-5 w-5 text-tekst-daempet" strokeWidth={1.75} />
          Ringeliste
        </h1>
          <div className="mt-6 rounded-lg border border-advarsel/40 bg-advarsel-baggrund px-6 py-10 text-center">
            <p className="text-sm text-advarsel">
              Uden for ringetid — ringelisten er skjult.
            </p>
            <p className="mt-1 text-sm text-tekst-daempet">
              Åben {dage} kl. {konfiguration.ringetid_fra.slice(0, 5)}–
              {konfiguration.ringetid_til.slice(0, 5)}. Ændres i Indstillinger →
              Forretningsregler.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="border-b border-kant px-6 py-3 text-xs text-tekst-daempet">
        <span className="text-accent">Pipeline</span>
        <span className="mx-1.5">/</span>
        <span>Ringeliste</span>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-6">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-tekst">
          <PhoneCall className="h-5 w-5 text-tekst-daempet" strokeWidth={1.75} />
          Ringeliste
        </h1>
        <p className="mb-6 mt-1 text-sm text-tekst-daempet">
          Godkendte, kvalificerede leads klar til opkald. Vælg et udfald for hvert opkald —
          leadet forlader listen, når det er afgjort, eller flyttes til den valgte dato ved
          "Ring igen". Maks 4 forsøg pr. lead.
        </p>

        {error && (
          <p className="rounded border border-spaerret/30 bg-spaerret/10 px-3 py-2 text-sm text-spaerret">
            Kunne ikke hente ringeliste: {error.message}
          </p>
        )}

        {!error && (!kandidater || kandidater.length === 0) && (
          <div className="rounded-lg border border-kant bg-flade px-6 py-10 text-center">
            <p className="text-sm text-tekst">Ringelisten er tom.</p>
            <p className="mt-1 text-sm text-tekst-daempet">
              Godkend kvalificerede leads fra deres detaljeside for at lægge dem i køen.
            </p>
          </div>
        )}

        {!error && kandidater && kandidater.length > 0 && (
          <div className="flex flex-col gap-4">
            {kandidater.map((k) => {
              const kontekst =
                [k.branchetekst, k.by].filter(Boolean).join(" · ") ||
                "Ingen yderligere kontekst";
              const kanBookeMoede = k.kunde_id !== null;
              const manuskript = k.kunde_id ? nyesteManuskriptPrKunde.get(k.kunde_id) : undefined;

              return (
                <form
                  key={k.id}
                  action={gemAktivitet}
                  className="kort-hover rounded-lg border border-kant bg-flade p-5"
                >
                  <input type="hidden" name="leadId" value={k.id} />
                  <input type="hidden" name="kundeId" value={k.kunde_id ?? ""} />
                  <input type="hidden" name="manuskriptId" value={manuskript?.id ?? ""} />

                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/leads/${k.id}`}
                        className="text-base font-semibold text-tekst hover:text-accent"
                      >
                        {k.virksomhedsnavn}
                      </Link>
                      <p className="mt-0.5 text-sm text-tekst-daempet">
                        {k.kontaktperson_navn ?? "Ingen kontaktperson registreret"}
                        {k.kontaktperson_titel ? ` · ${k.kontaktperson_titel}` : ""}
                      </p>
                      <p className="tal mt-0.5 text-sm text-tekst-daempet">
                        {k.telefon ?? "Intet telefonnummer"}
                      </p>
                      <p className="mt-1 text-xs text-tekst-daempet">{kontekst}</p>
                    </div>
                    {k.antal_forsoeg > 0 && (
                      <span className="tal shrink-0 rounded-full border border-advarsel/40 bg-advarsel-baggrund px-2.5 py-1 text-xs text-advarsel">
                        Forsøg {k.antal_forsoeg + 1} af 4
                      </span>
                    )}
                  </div>

                  {manuskript && (
                    <div className="mb-3 rounded-md border border-kant bg-baggrund px-3 py-2">
                      <p className="mb-1 text-[11px] uppercase tracking-wide text-tekst-daempet">
                        Manuskript v{manuskript.version}
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-tekst-daempet">
                        {manuskript.indhold}
                      </p>
                    </div>
                  )}

                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="text"
                      name="note"
                      placeholder="Notat (valgfrit)"
                      className="flex-1 rounded border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none focus-visible:border-accent"
                    />
                    <input
                      type="date"
                      name="ring_igen_dato"
                      title="Ring igen-dato (bruges kun ved udfaldet 'Ring igen'; ellers +2 dage som standard)"
                      className="rounded border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none focus-visible:border-accent"
                    />
                    <select
                      name="indvending"
                      title="Indvending (bruges kun ved 'Lagde på'/'Ikke interesseret')"
                      defaultValue=""
                      className="rounded border border-kant bg-baggrund px-2.5 py-1.5 text-sm text-tekst outline-none focus-visible:border-accent"
                    >
                      <option value="">Indvending (valgfrit)</option>
                      {INDVENDINGER.map((i) => (
                        <option key={i} value={i}>
                          {i}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {UDFALD_KNAPPER.map((k2) => {
                      const deaktiveret = k2.udfald === "moede_booket" && !kanBookeMoede;
                      return (
                        <button
                          key={k2.udfald}
                          type="submit"
                          name="udfald"
                          value={k2.udfald}
                          disabled={deaktiveret}
                          title={
                            deaktiveret
                              ? "Kræver at leadet er tildelt en kunde (Kunder/Matching er ikke bygget endnu)"
                              : undefined
                          }
                          className={
                            deaktiveret
                              ? "cursor-not-allowed rounded-md border border-kant px-3 py-1.5 text-sm text-tekst-daempet/40"
                              : `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${k2.klasse}`
                          }
                        >
                          {k2.label}
                        </button>
                      );
                    })}
                  </div>
                </form>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
