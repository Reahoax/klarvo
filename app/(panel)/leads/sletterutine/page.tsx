import Link from "next/link";
import { Trash2 } from "lucide-react";
import { opretServerKlient } from "@/lib/supabase/server";
import { erForaeldet } from "@/lib/leads/foraeldelse.ts";
import { SletKnap } from "./slet-knap";

// Etape 12 (Spec.md "R7 — Dataminimering og sletning"). Ejer-only, samme
// mønster som Økonomi - permissiv RLS på leads' UPDATE/SELECT, men DELETE
// er selv rollebegrænset i RLS (se migrationen
// tilfoej_delete_policy_leads_og_insert_deletion_log), fordi sletning her
// er permanent og irreversibel, ikke kun en visningsbegrænsning.
type LeadRaekke = { id: string; virksomhedsnavn: string; cvr_nummer: string; oprettet: string };

export default async function SletterutineSide() {
  const supabase = await opretServerKlient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = user
    ? await supabase.from("profiler").select("rolle").eq("id", user.id).single()
    : { data: null };

  if (profil?.rolle !== "ejer") {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <p className="rounded-lg border border-kant bg-flade px-4 py-6 text-center text-sm text-tekst-daempet">
          Kun ejere har adgang til sletterutinen.
        </p>
      </div>
    );
  }

  const { data: konfiguration } = await supabase
    .from("konfiguration")
    .select("sletning_maaneder")
    .eq("id", true)
    .single();
  const taerskel = konfiguration?.sletning_maaneder ?? 12;

  const [{ data: leads }, { data: aktiviteter }] = await Promise.all([
    supabase
      .from("leads")
      .select("id, virksomhedsnavn, cvr_nummer, oprettet")
      .order("oprettet", { ascending: true })
      .returns<LeadRaekke[]>(),
    supabase.from("aktiviteter").select("lead_id, oprettet").order("oprettet", { ascending: false }),
  ]);

  // Kun den SENESTE aktivitet pr. lead er relevant for forældelsestjekket -
  // resultatet er allerede sorteret nyest-først, så første forekomst vinder.
  const senesteAktivitetPrLead = new Map<string, string>();
  for (const a of aktiviteter ?? []) {
    if (!senesteAktivitetPrLead.has(a.lead_id)) senesteAktivitetPrLead.set(a.lead_id, a.oprettet);
  }

  const nu = new Date();
  const foraeldede = (leads ?? []).filter((l) =>
    erForaeldet(
      new Date(l.oprettet),
      senesteAktivitetPrLead.has(l.id) ? new Date(senesteAktivitetPrLead.get(l.id)!) : null,
      taerskel,
      nu
    )
  );

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="flex items-center gap-2 text-lg font-semibold text-tekst">
        <Trash2 className="h-5 w-5 text-tekst-daempet" strokeWidth={1.75} />
        Sletterutine
      </h1>
      <p className="mb-6 text-sm text-tekst-daempet">
        Leads uden noget registreret opkald i mere end {taerskel} måned{taerskel === 1 ? "" : "er"} (kan
        ændres i Indstillinger → Forretningsregler). Sletning er permanent og logges i{" "}
        <code className="rounded bg-flade-haevet px-1 py-0.5 text-xs">deletion_log</code>.
      </p>

      {foraeldede.length === 0 ? (
        <p className="rounded-lg border border-kant bg-flade px-4 py-6 text-center text-sm text-tekst-daempet">
          Ingen forældede leads lige nu.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-kant bg-flade">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-kant text-[11px] uppercase tracking-wide text-tekst-daempet">
              <tr>
                <th className="px-4 py-2.5 font-medium">Virksomhed</th>
                <th className="px-4 py-2.5 font-medium">CVR-nummer</th>
                <th className="px-4 py-2.5 font-medium">Oprettet</th>
                <th className="px-4 py-2.5 font-medium">Seneste opkald</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {foraeldede.map((l) => (
                <tr key={l.id} className="border-b border-kant last:border-0">
                  <td className="px-4 py-2.5">
                    <Link href={`/leads/${l.id}`} className="text-tekst hover:text-accent">
                      {l.virksomhedsnavn}
                    </Link>
                  </td>
                  <td className="tal px-4 py-2.5 text-tekst-daempet">{l.cvr_nummer}</td>
                  <td className="px-4 py-2.5 text-tekst-daempet">
                    {new Date(l.oprettet).toLocaleDateString("da-DK")}
                  </td>
                  <td className="px-4 py-2.5 text-tekst-daempet">
                    {senesteAktivitetPrLead.has(l.id)
                      ? new Date(senesteAktivitetPrLead.get(l.id)!).toLocaleDateString("da-DK")
                      : "Aldrig"}
                  </td>
                  <td className="px-4 py-2.5">
                    <SletKnap leadId={l.id} virksomhedsnavn={l.virksomhedsnavn} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
