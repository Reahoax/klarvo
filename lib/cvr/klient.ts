// Etape 11 — CVR system-til-system-adgang (Erhvervsstyrelsens Elasticsearch-
// baserede løsning, distribution.virk.dk). Login sker med brugernavn/password
// givet af Erhvervsstyrelsen, ikke en API-nøgle - se cvr-forbindelse-actions.ts
// for hvor credentials gemmes (kun ejer-rollen kan læse dem, se migrationen
// tilfoej_cvr_forbindelse). Denne fil rører aldrig databasen selv - den
// kender kun til selve HTTP-kaldet mod CVR.
//
// Forbindelsen er kun bekræftet at virke over almindelig HTTP, ikke HTTPS -
// se README "CVR system-til-system-adgang" for hvorfor det er værd at holde
// øje med som et fremtidigt sikkerhedsforbedringspunkt.
const CVR_BASIS_URL = "http://distribution.virk.dk/cvr-permanent";

export type CvrTestResultat = {
  ok: boolean;
  besked: string;
};

// Bruges både til "Test forbindelse"-knappen i Indstillinger og som et
// hurtigt sundhedstjek, før et rigtigt datatræk startes i en senere fase.
// Laver et minimalt GET-kald (indeks-metadata, ingen søgning) - billigt for
// både os og Erhvervsstyrelsens system.
export async function testCvrForbindelse(
  brugernavn: string,
  password: string
): Promise<CvrTestResultat> {
  const basicAuth = Buffer.from(`${brugernavn}:${password}`).toString("base64");

  try {
    const res = await fetch(CVR_BASIS_URL, {
      headers: { Authorization: `Basic ${basicAuth}` },
      signal: AbortSignal.timeout(10_000),
    });

    if (res.status === 200) {
      return { ok: true, besked: "Forbindelsen virker." };
    }
    if (res.status === 401) {
      return { ok: false, besked: "Forkert brugernavn eller password." };
    }
    if (res.status === 403) {
      return { ok: false, besked: "Adgangen er endnu ikke aktiveret hos Erhvervsstyrelsen." };
    }
    return { ok: false, besked: `Uventet svar fra CVR (HTTP ${res.status}).` };
  } catch (fejl) {
    const besked = fejl instanceof Error ? fejl.message : "Ukendt fejl.";
    return { ok: false, besked: `Kunne ikke oprette forbindelse: ${besked}` };
  }
}
