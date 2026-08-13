import type { SupabaseClient } from "@supabase/supabase-js";

// Etape 3 (Spec.md afsnit 2B og "J. Filtre"): filtrene lever i URL'en via searchParams,
// ikke i klient-state. Det gør en visning delelig/bogmærkbar, og betyder at hele
// filterlogikken kan ligge på serveren, uden JavaScript i browseren.

export type LeadsFiltre = {
  sog: string;
  ansatteFra: number | null;
  ansatteTil: number | null;
  former: string[];
  statusser: string[];
  kval: "alle" | "kvalificerede" | "ikke_vurderet" | "afvist";
  kontakt: "alle" | "maa_kontaktes" | "spaerret";
  tildeling: "alle" | "ukoblet" | "tildelt";
  sort: string;
  retning: "asc" | "desc";
};

const GYLDIGE_SORT_KOLONNER = [
  "virksomhedsnavn",
  "cvr_nummer",
  "antal_ansatte",
  "oprettet",
  "sidst_aendret",
];

function somListe(vaerdi: string | string[] | undefined): string[] {
  if (!vaerdi) return [];
  return Array.isArray(vaerdi) ? vaerdi : [vaerdi];
}

function somTal(vaerdi: string | string[] | undefined): number | null {
  const raa = Array.isArray(vaerdi) ? vaerdi[0] : vaerdi;
  if (!raa) return null;
  const tal = Number.parseInt(raa, 10);
  return Number.isFinite(tal) ? tal : null;
}

// "kontakt" har bevidst ingen tom-streng-fallback til "alle": mangler parameteren helt,
// er standarden at skjule spærrede leads (jf. "Spærrede leads er som standard skjult").
// Det signaleres til brugeren som et aktivt filter-chip i UI'et, ikke skjult stilfærdigt.
export function parseLeadsFiltre(
  searchParams: Record<string, string | string[] | undefined>
): LeadsFiltre {
  const kontaktRaa = searchParams.kontakt;
  const sortRaa = Array.isArray(searchParams.sort) ? searchParams.sort[0] : searchParams.sort;

  return {
    sog: (Array.isArray(searchParams.sog) ? searchParams.sog[0] : searchParams.sog) ?? "",
    ansatteFra: somTal(searchParams.ansatte_fra),
    ansatteTil: somTal(searchParams.ansatte_til),
    former: somListe(searchParams.form),
    statusser: somListe(searchParams.status),
    kval: (["kvalificerede", "ikke_vurderet", "afvist"].includes(String(searchParams.kval))
      ? (searchParams.kval as LeadsFiltre["kval"])
      : "alle"),
    kontakt: kontaktRaa === "alle" || kontaktRaa === "spaerret" ? kontaktRaa : "maa_kontaktes",
    tildeling: (["ukoblet", "tildelt"].includes(String(searchParams.tildeling))
      ? (searchParams.tildeling as LeadsFiltre["tildeling"])
      : "alle"),
    sort: GYLDIGE_SORT_KOLONNER.includes(String(sortRaa)) ? String(sortRaa) : "oprettet",
    retning: searchParams.retning === "asc" ? "asc" : "desc",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function anvendLeadsFiltre(query: any, filtre: LeadsFiltre) {
  if (filtre.sog) {
    const s = filtre.sog.replace(/[%_]/g, "");
    query = query.or(
      `virksomhedsnavn.ilike.%${s}%,cvr_nummer.ilike.%${s}%,by.ilike.%${s}%`
    );
  }
  if (filtre.ansatteFra !== null) query = query.gte("antal_ansatte", filtre.ansatteFra);
  if (filtre.ansatteTil !== null) query = query.lte("antal_ansatte", filtre.ansatteTil);
  if (filtre.former.length > 0) query = query.in("virksomhedsform", filtre.former);
  if (filtre.statusser.length > 0) query = query.in("status", filtre.statusser);

  if (filtre.kval === "kvalificerede") {
    query = query.eq("kvalificeret", true);
  } else if (filtre.kval === "ikke_vurderet") {
    query = query
      .is("fit", null)
      .is("behov", null)
      .is("oekonomi", null)
      .is("person", null);
  } else if (filtre.kval === "afvist") {
    query = query
      .eq("kvalificeret", false)
      .or("fit.not.is.null,behov.not.is.null,oekonomi.not.is.null,person.not.is.null");
  }

  if (filtre.kontakt === "maa_kontaktes") query = query.eq("maa_kontaktes", true);
  if (filtre.kontakt === "spaerret") query = query.eq("maa_kontaktes", false);

  if (filtre.tildeling === "ukoblet") query = query.is("kunde_id", null);
  if (filtre.tildeling === "tildelt") query = query.not("kunde_id", "is", null);

  // Sekundær sortering på id: leads fra samme import kan dele identisk værdi på
  // sorteringskolonnen (fx "oprettet", som er ens for alle rækker i én batch-insert),
  // hvilket ellers giver en ustabil rækkefølge, der kan skifte mellem sideindlæsninger.
  return query
    .order(filtre.sort, { ascending: filtre.retning === "asc" })
    .order("id", { ascending: true });
}

// Bygger en /leads-URL med de nuværende searchParams, hvor de angivne nøgler er
// overskrevet (eller fjernet, hvis værdien er null). Bruges til sorteringslinks og
// genveje for antal ansatte, så alle andre aktive filtre bevares.
export function medOverskrevneParametre(
  searchParams: URLSearchParams,
  overskrivninger: Record<string, string | null>
): string {
  const kopi = new URLSearchParams(searchParams);
  for (const [noegle, vaerdi] of Object.entries(overskrivninger)) {
    kopi.delete(noegle);
    if (vaerdi !== null) kopi.set(noegle, vaerdi);
  }
  const s = kopi.toString();
  return s ? `/leads?${s}` : "/leads";
}

export type FilterChip = { label: string; fjernHref: string };

// Bygger de synlige chips ud fra aktive filtre, inkl. standardfilteret på kontaktbarhed,
// jf. kravet om at intet filter må skjule data uden at vise det som en chip.
export function byggFilterChips(
  filtre: LeadsFiltre,
  searchParams: URLSearchParams
): FilterChip[] {
  const chips: FilterChip[] = [];

  const fjern = (noegler: string[]) => {
    const kopi = new URLSearchParams(searchParams);
    noegler.forEach((n) => kopi.delete(n));
    const s = kopi.toString();
    return s ? `/leads?${s}` : "/leads";
  };

  if (filtre.sog) chips.push({ label: `Fritekst: "${filtre.sog}"`, fjernHref: fjern(["sog"]) });
  if (filtre.ansatteFra !== null || filtre.ansatteTil !== null) {
    chips.push({
      label: `Ansatte: ${filtre.ansatteFra ?? 0}–${filtre.ansatteTil ?? "∞"}`,
      fjernHref: fjern(["ansatte_fra", "ansatte_til"]),
    });
  }
  filtre.former.forEach((f) =>
    chips.push({
      label: `Form: ${f}`,
      fjernHref: (() => {
        const kopi = new URLSearchParams(searchParams);
        const tilbage = kopi.getAll("form").filter((v) => v !== f);
        kopi.delete("form");
        tilbage.forEach((v) => kopi.append("form", v));
        const s = kopi.toString();
        return s ? `/leads?${s}` : "/leads";
      })(),
    })
  );
  filtre.statusser.forEach((s2) =>
    chips.push({
      label: `Status: ${s2}`,
      fjernHref: (() => {
        const kopi = new URLSearchParams(searchParams);
        const tilbage = kopi.getAll("status").filter((v) => v !== s2);
        kopi.delete("status");
        tilbage.forEach((v) => kopi.append("status", v));
        const s = kopi.toString();
        return s ? `/leads?${s}` : "/leads";
      })(),
    })
  );
  if (filtre.kval !== "alle") {
    const label = { kvalificerede: "Kvalificerede", ikke_vurderet: "Ikke vurderet", afvist: "Afvist" }[filtre.kval];
    chips.push({ label: `Kvalificering: ${label}`, fjernHref: fjern(["kval"]) });
  }
  if (filtre.kontakt === "maa_kontaktes") {
    const kopi = new URLSearchParams(searchParams);
    kopi.set("kontakt", "alle");
    chips.push({
      label: "Kontaktbarhed: Må kontaktes (standard)",
      fjernHref: `/leads?${kopi.toString()}`,
    });
  } else if (filtre.kontakt === "spaerret") {
    chips.push({ label: "Kontaktbarhed: Spærret", fjernHref: fjern(["kontakt"]) });
  }
  if (filtre.tildeling !== "alle") {
    chips.push({
      label: `Tildeling: ${filtre.tildeling === "ukoblet" ? "Ukoblet" : "Tildelt kunde"}`,
      fjernHref: fjern(["tildeling"]),
    });
  }

  return chips;
}
