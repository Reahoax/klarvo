import { PhoneCall } from "lucide-react";
import { opretServerKlient } from "@/lib/supabase/server";
import { erIndenforRingetid } from "@/lib/leads/ringetid.ts";
import { KandidatListe, type Kandidat } from "./kandidat-liste";

type KandidatRaa = {
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

export default async function RingelisteSide() {
  const supabase = await opretServerKlient();

  const { data: konfiguration } = await supabase
    .from("konfiguration")
    .select("ringetid_fra, ringetid_til, ringetid_ugedage")
    .eq("id", true)
    .single();

  const indenforRingetid = konfiguration ? erIndenforRingetid(konfiguration) : true;

  const { data: kandidaterRaa, error } = indenforRingetid
    ? await supabase
        .from("ringeliste_kandidater")
        .select(
          "id, virksomhedsnavn, cvr_nummer, kontaktperson_navn, kontaktperson_titel, telefon, branchetekst, by, kunde_id, antal_forsoeg"
        )
        .order("oprettet", { ascending: true })
        .returns<KandidatRaa[]>()
    : { data: null, error: null };

  const kundeIds = [...new Set((kandidaterRaa ?? []).map((k) => k.kunde_id).filter(Boolean))];
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

  // Manuskriptet slås op og hægtes direkte på hvert kandidatobjekt her (i
  // stedet for at sende et separat Map-opslag med ned til klienten) - en Map
  // kan ikke sendes som prop over server/klient-grænsen.
  const kandidater: Kandidat[] = (kandidaterRaa ?? []).map((k) => ({
    ...k,
    manuskript: k.kunde_id ? (nyesteManuskriptPrKunde.get(k.kunde_id) ?? null) : null,
  }));

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

        {!error && <KandidatListe kandidater={kandidater} />}
      </div>
    </div>
  );
}
