import Link from "next/link";
import { opretServerKlient } from "@/lib/supabase/server";
import { LinjeGraf } from "./linje-graf";
import { OekonomiFormular } from "./okonomi-formular";
import { sletOekonomiPost } from "./actions";

type KundeRaekke = {
  id: string;
  navn: string;
  pris_pr_moede: number | null;
  moeder_koebt: number;
  dpa_underskrevet: boolean;
  aktive: boolean;
  startdato: string | null;
  pilot_slutdato: string | null;
};

// Kundens kontraktværdi (pris/møde × møder i saldo) omregnet til en månedlig
// kørselsrate. Har kunden både start- og slutdato, spredes værdien over den
// faktiske periode; ellers antages den solgt til at dække ét år (samme
// konvention som ARR/MRR - "årsindkomst" er så kørselsraten × 12, ikke et
// løfte om at pengene reelt er indbetalt endnu).
function kundeMaanedligVaerdi(k: KundeRaekke): number {
  const vaerdi = (k.pris_pr_moede ?? 0) * k.moeder_koebt;
  if (k.startdato && k.pilot_slutdato) {
    const dage =
      (new Date(k.pilot_slutdato).getTime() - new Date(k.startdato).getTime()) /
      (1000 * 60 * 60 * 24);
    const maaneder = Math.max(1, Math.round(dage / 30));
    return vaerdi / maaneder;
  }
  return vaerdi / 12;
}

type PostRaekke = {
  id: string;
  type: "indtaegt" | "omkostning";
  navn: string;
  beloeb: number;
  kategori: string | null;
  gentagelse: "engangs" | "maanedligt" | "aarligt";
  dato: string;
};

function formatKr(v: number): string {
  return Math.round(v).toLocaleString("da-DK") + " kr.";
}

function StatKort({
  label,
  vaerdi,
  undertekst,
  fremhaevet,
}: {
  label: string;
  vaerdi: string | number;
  undertekst?: string;
  fremhaevet?: "positiv" | "negativ";
}) {
  const bg =
    fremhaevet === "positiv" ? "bg-godkendt" : fremhaevet === "negativ" ? "bg-spaerret" : null;
  return (
    <div className={bg ? `glow-accent-blod rounded-lg ${bg} p-4 text-accent-tekst` : "rounded-lg border border-kant bg-flade p-4"}>
      <p className={bg ? "text-[11px] uppercase tracking-wide text-accent-tekst/80" : "text-[11px] uppercase tracking-wide text-tekst-daempet"}>
        {label}
      </p>
      <p className="tal mt-1 text-2xl font-semibold">{vaerdi}</p>
      {undertekst && (
        <p className={bg ? "mt-0.5 text-xs text-accent-tekst/70" : "mt-0.5 text-xs text-tekst-daempet"}>
          {undertekst}
        </p>
      )}
    </div>
  );
}

// Normaliserer en post til et månedligt beløb: engangsposter tæller kun med
// i den måned de faktisk skete (håndteres ved gruppering, ikke her).
function maanedligtBeloeb(p: PostRaekke): number {
  if (p.gentagelse === "maanedligt") return p.beloeb;
  if (p.gentagelse === "aarligt") return p.beloeb / 12;
  return 0;
}

export default async function OekonomiSide() {
  const supabase = await opretServerKlient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profil } = user
    ? await supabase.from("profiler").select("rolle").eq("id", user.id).single()
    : { data: null };

  if (profil?.rolle !== "ejer") {
    return (
      <div>
        <div className="border-b border-kant px-6 py-3 text-xs text-tekst-daempet">
          <span>Økonomi</span>
        </div>
        <div className="px-6 py-6">
          <p className="text-sm text-tekst-daempet">
            Økonomi er kun tilgængelig for ejere.
          </p>
        </div>
      </div>
    );
  }

  const [{ data: kunder }, { data: poster }] = await Promise.all([
    supabase
      .from("kunder")
      .select("id, navn, pris_pr_moede, moeder_koebt, dpa_underskrevet, aktive, startdato, pilot_slutdato")
      .order("navn", { ascending: true })
      .returns<KundeRaekke[]>(),
    supabase
      .from("oekonomi_poster")
      .select("id, type, navn, beloeb, kategori, gentagelse, dato")
      .order("dato", { ascending: false })
      .returns<PostRaekke[]>(),
  ]);

  const alleKunder = kunder ?? [];
  const aktiveKunder = alleKunder.filter((k) => k.aktive);
  const allePoster = poster ?? [];

  const samletKontraktvaerdi = aktiveKunder.reduce(
    (sum, k) => sum + (k.pris_pr_moede ?? 0) * k.moeder_koebt,
    0
  );
  const samletSaldo = aktiveKunder.reduce((sum, k) => sum + k.moeder_koebt, 0);
  const dpaMangler = aktiveKunder.filter((k) => !k.dpa_underskrevet).length;

  // Kundekontrakter tælles automatisk med i indkomsten - ikke kun det, der
  // logges manuelt nedenfor. Det er det, brugeren bad om: "den skal selv
  // regne alt det her ud sammen med [...] møder/abonnement".
  const kundeMdrIndkomst = aktiveKunder.reduce((sum, k) => sum + kundeMaanedligVaerdi(k), 0);
  const kundeAarsIndkomst = kundeMdrIndkomst * 12;

  const idag = new Date();
  const indeaevaerendeMaaned = idag.toISOString().slice(0, 7);
  const iAar = idag.getFullYear();

  const indtaegter = allePoster.filter((p) => p.type === "indtaegt");
  const omkostninger = allePoster.filter((p) => p.type === "omkostning");

  const engangsIMaaned = (liste: PostRaekke[]) =>
    liste
      .filter((p) => p.gentagelse === "engangs" && p.dato.slice(0, 7) === indeaevaerendeMaaned)
      .reduce((sum, p) => sum + p.beloeb, 0);
  const tilbagevendendeMaanedligt = (liste: PostRaekke[]) =>
    liste.reduce((sum, p) => sum + maanedligtBeloeb(p), 0);

  const loggetMdrIndkomst = engangsIMaaned(indtaegter) + tilbagevendendeMaanedligt(indtaegter);
  const maanedligIndkomst = loggetMdrIndkomst + kundeMdrIndkomst;
  const maanedligtForbrug = engangsIMaaned(omkostninger) + tilbagevendendeMaanedligt(omkostninger);

  const engangsIAar = (liste: PostRaekke[]) =>
    liste
      .filter((p) => p.gentagelse === "engangs" && new Date(p.dato).getFullYear() === iAar)
      .reduce((sum, p) => sum + p.beloeb, 0);
  const loggetAarsIndkomst = engangsIAar(indtaegter) + tilbagevendendeMaanedligt(indtaegter) * 12;
  const aarsIndkomst = loggetAarsIndkomst + kundeAarsIndkomst;
  const aarsForbrug = engangsIAar(omkostninger) + tilbagevendendeMaanedligt(omkostninger) * 12;

  // Graf: de seneste 6 måneder. Manuelt loggede poster tæller kun med i den
  // måned de reelt er logget; kundernes kørselsrate lægges oveni hver måned,
  // så grafen matcher stat-kortene ovenfor (samme "alt regnet sammen"-logik).
  const maanederKort = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
  const graf = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(idag.getFullYear(), idag.getMonth() - (5 - i), 1);
    const noegle = d.toISOString().slice(0, 7);
    return {
      label: `${maanederKort[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`,
      indtaegt:
        kundeMdrIndkomst +
        allePoster
          .filter((p) => p.type === "indtaegt" && p.dato.slice(0, 7) === noegle)
        .reduce((sum, p) => sum + p.beloeb, 0),
      omkostning: allePoster
        .filter((p) => p.type === "omkostning" && p.dato.slice(0, 7) === noegle)
        .reduce((sum, p) => sum + p.beloeb, 0),
    };
  });

  return (
    <div>
      <div className="border-b border-kant px-6 py-3 text-xs text-tekst-daempet">
        <span className="text-accent">Overblik</span>
        <span className="mx-1.5">/</span>
        <span>Økonomi</span>
      </div>

      <div className="flex flex-col gap-6 px-6 py-6">
        <div>
          <h1 className="text-xl font-semibold text-tekst">Økonomi</h1>
          <p className="mt-1 text-sm text-tekst-daempet">
            Kun synlig for ejere. Indkomst lægger automatisk kundernes kontraktværdi
            (pris/møde × møder i saldo, spredt over kontraktperioden) sammen med det,
            I selv logger nedenfor. Der er ingen automatisk fakturering endnu.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatKort
            label="Månedlig indkomst"
            vaerdi={formatKr(maanedligIndkomst)}
            undertekst={`${formatKr(kundeMdrIndkomst)} fra kunder + ${formatKr(loggetMdrIndkomst)} logget`}
          />
          <StatKort
            label="Månedligt forbrug"
            vaerdi={formatKr(maanedligtForbrug)}
            undertekst="Denne måneds engangsposter + tilbagevendende"
          />
          <StatKort
            label="Årsindkomst"
            vaerdi={formatKr(aarsIndkomst)}
            undertekst={`${formatKr(kundeAarsIndkomst)} fra kunder + ${formatKr(loggetAarsIndkomst)} logget`}
            fremhaevet="positiv"
          />
          <StatKort
            label="Årsforbrug"
            vaerdi={formatKr(aarsForbrug)}
            undertekst={`${iAar} — engangs + tilbagevendende × 12`}
            fremhaevet={aarsForbrug > aarsIndkomst ? "negativ" : undefined}
          />
        </div>

        <section className="rounded-lg border border-kant bg-flade p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-tekst">Indtægt vs. forbrug, seneste 6 måneder</h2>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-tekst-daempet">
                <span className="h-2 w-2 rounded-full bg-godkendt" /> Indtægt
              </span>
              <span className="flex items-center gap-1 text-tekst-daempet">
                <span className="h-2 w-2 rounded-full bg-spaerret" /> Forbrug
              </span>
            </div>
          </div>
          <LinjeGraf punkter={graf} />
        </section>

        <section className="rounded-lg border border-kant bg-flade p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-tekst">Loggede poster</h2>
          </div>

          <OekonomiFormular />

          {allePoster.length === 0 ? (
            <p className="mt-4 text-sm text-tekst-daempet">
              Ingen poster logget endnu. Tilføj jeres faste udgifter (domæne, Vercel, Supabase
              m.m.) og eventuelle indtægter for at se reelle tal her og i grafen.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-1.5">
              {allePoster.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-flade-haevet"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={
                        p.type === "indtaegt"
                          ? "h-1.5 w-1.5 shrink-0 rounded-full bg-godkendt"
                          : "h-1.5 w-1.5 shrink-0 rounded-full bg-spaerret"
                      }
                    />
                    <span className="min-w-0 truncate text-tekst">{p.navn}</span>
                    {p.kategori && (
                      <span className="shrink-0 rounded-full border border-kant px-1.5 py-0.5 text-[10px] text-tekst-daempet">
                        {p.kategori}
                      </span>
                    )}
                    <span className="shrink-0 text-[10px] text-tekst-daempet">
                      {p.gentagelse === "engangs"
                        ? "Engangs"
                        : p.gentagelse === "maanedligt"
                          ? "Månedlig"
                          : "Årlig"}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="tal text-xs text-tekst-daempet">
                      {new Date(p.dato).toLocaleDateString("da-DK")}
                    </span>
                    <span className={p.type === "indtaegt" ? "tal text-godkendt" : "tal text-spaerret"}>
                      {formatKr(p.beloeb)}
                    </span>
                    <form action={sletOekonomiPost}>
                      <input type="hidden" name="id" value={p.id} />
                      <button
                        type="submit"
                        className="text-tekst-daempet transition-colors hover:text-spaerret"
                        title="Slet"
                      >
                        ✕
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-kant bg-flade">
          <div className="flex items-center justify-between border-b border-kant px-4 py-3">
            <h2 className="text-sm font-semibold text-tekst">Kontraktoversigt (kunder)</h2>
            <span className="text-[11px] uppercase tracking-wide text-tekst-daempet">
              {formatKr(samletKontraktvaerdi)} i alt · {samletSaldo} møder i saldo
            </span>
          </div>

          {alleKunder.length === 0 ? (
            <p className="px-4 py-6 text-sm text-tekst-daempet">
              Ingen kunder oprettet endnu.{" "}
              <Link href="/kunder" className="text-accent hover:underline">
                Opret en kunde →
              </Link>
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-kant text-left text-[11px] uppercase tracking-wide text-tekst-daempet">
                  <th className="px-4 py-2 font-medium">Kunde</th>
                  <th className="px-4 py-2 font-medium">Pris/møde</th>
                  <th className="px-4 py-2 font-medium">Møder i saldo</th>
                  <th className="px-4 py-2 font-medium">Kontraktværdi</th>
                  <th className="px-4 py-2 font-medium">DPA</th>
                </tr>
              </thead>
              <tbody>
                {alleKunder.map((k) => (
                  <tr key={k.id} className="border-b border-kant last:border-b-0">
                    <td className="px-4 py-2.5">
                      <Link href={`/kunder/${k.id}`} className="text-tekst hover:text-accent">
                        {k.navn}
                      </Link>
                    </td>
                    <td className="tal px-4 py-2.5 text-tekst-daempet">
                      {k.pris_pr_moede ? formatKr(k.pris_pr_moede) : "—"}
                    </td>
                    <td className="tal px-4 py-2.5 text-tekst-daempet">{k.moeder_koebt}</td>
                    <td className="tal px-4 py-2.5 text-tekst">
                      {formatKr((k.pris_pr_moede ?? 0) * k.moeder_koebt)}
                    </td>
                    <td className="px-4 py-2.5">
                      {k.dpa_underskrevet ? (
                        <span className="text-godkendt">Underskrevet</span>
                      ) : (
                        <span className="text-spaerret">Mangler</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {dpaMangler > 0 && (
            <p className="border-t border-kant px-4 py-2 text-xs text-spaerret">
              {dpaMangler} aktiv{dpaMangler === 1 ? "" : "e"} kunde{dpaMangler === 1 ? "" : "r"} mangler DPA.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
