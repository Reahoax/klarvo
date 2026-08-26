import type { SupabaseClient } from "@supabase/supabase-js";
import { hentFriskCache } from "./cache.ts";
import { skalVente } from "./tidsregler.ts";
import { hentVirksomhedHistorik } from "@/lib/cvr/historikOpslag.ts";
import { udledCvrAendringer, formaterCvrAendringerTilTekst } from "./cvrAendring.ts";
import type { EnkeltSignalResultat } from "./hentSignaler.ts";

// Etape 8 (Spec.md "4B. OSINT", kildetypen "cvr_aendring") - orkestrering:
// cache først, så rate limit, så selve CVR-opslaget (lib/cvr/historikOpslag.ts)
// og til sidst udledning + lagring (lib/signaler/cvrAendring.ts). Samme
// rækkefølge-princip som hentSignaler.ts.
//
// Rate-limit-nøglen er bevidst IKKE leadets eget domæne (som website/
// jobopslag bruger) - CVR-historik kommer fra Erhvervsstyrelsens delte
// system-til-system-forbindelse, ikke virksomhedens egen hjemmeside, så
// alle leads deler ét fælles rate-limit-spor i signal_domaener.
const RATE_LIMIT_NOEGLE = "cvr-api-historik";

export async function hentCvrAendringForLead(
  supabase: SupabaseClient,
  leadId: string,
  cvrNummer: string
): Promise<EnkeltSignalResultat> {
  const cache = await hentFriskCache(supabase, leadId, "cvr_aendring");
  if (cache) {
    return { ok: true, genbrugtFraCache: true, vaerdi: cache.vaerdi, kildeUrl: cache.kilde_url };
  }

  const { data: forbindelse } = await supabase
    .from("cvr_forbindelse")
    .select("brugernavn, password")
    .eq("id", true)
    .maybeSingle();
  if (!forbindelse?.brugernavn || !forbindelse.password) {
    return {
      ok: false,
      besked: "Ingen CVR-forbindelse er gemt. Tilføj den under Indstillinger → Integrationer, før CVR-historik kan hentes.",
    };
  }

  const { data: domaeneRaekke } = await supabase
    .from("signal_domaener")
    .select("sidst_hentet")
    .eq("domaene", RATE_LIMIT_NOEGLE)
    .maybeSingle();
  if (skalVente(domaeneRaekke ? new Date(domaeneRaekke.sidst_hentet) : null)) {
    return { ok: false, besked: "CVR-opslag blev foretaget for under 5 sekunder siden - prøv igen om lidt." };
  }

  // Slotten låses FØR selve kaldet, samme forsigtighedsprincip som website/jobopslag.
  await supabase.from("signal_domaener").upsert({ domaene: RATE_LIMIT_NOEGLE, sidst_hentet: new Date().toISOString() });

  const resultat = await hentVirksomhedHistorik(forbindelse.brugernavn, forbindelse.password, cvrNummer);
  if (!resultat.ok) {
    return { ok: false, besked: resultat.besked };
  }

  const vaerdi = formaterCvrAendringerTilTekst(udledCvrAendringer(resultat.data));
  const kildeUrl = `https://datacvr.virk.dk/enhed/virksomhed/${cvrNummer}`;

  await supabase.from("signaler").insert({
    lead_id: leadId,
    type: "cvr_aendring",
    vaerdi,
    kilde_url: kildeUrl,
    hentet_dato: new Date().toISOString(),
    vaegt: 1,
  });

  return { ok: true, genbrugtFraCache: false, vaerdi, kildeUrl };
}
