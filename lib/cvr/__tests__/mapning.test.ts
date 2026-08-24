import { test } from "node:test";
import assert from "node:assert/strict";
import { mapVirksomhedTilLead, type RaaVirksomhed } from "../mapning.ts";

// Baseret på et rigtigt dokument hentet fra CVR system-til-system-adgangen
// 2026-08-24 (cvrNummer 29200106, "JL TRANSPORT, SDR. ApS") - se README "CVR
// system-til-system-adgang".
const rigtigtDokument: RaaVirksomhed = {
  cvrNummer: 29200106,
  reklamebeskyttet: false,
  telefonNummer: [],
  hjemmeside: [],
  virksomhedMetadata: {
    sammensatStatus: "NORMAL",
    nyesteNavn: { navn: "JL TRANSPORT, SDR. ApS" },
    nyesteVirksomhedsform: { kortBeskrivelse: "APS" },
    nyesteHovedbranche: { branchekode: "602410", branchetekst: "Vognmandsvirksomhed" },
    nyesteBeliggenhedsadresse: {
      vejnavn: "Pilegårdsvej",
      husnummerFra: 268,
      bogstavFra: null,
      postnummer: 8361,
      postdistrikt: "Hasselager",
    },
    nyesteErstMaanedsbeskaeftigelse: null,
    nyesteAarsbeskaeftigelse: null,
    nyesteKvartalsbeskaeftigelse: null,
    nyesteMaanedsbeskaeftigelse: null,
  },
};

test("mapper et rigtigt CVR-dokument til den samme rækkeform som CSV-import", () => {
  const lead = mapVirksomhedTilLead(rigtigtDokument);
  assert.ok(lead);
  assert.equal(lead?.cvr_nummer, "29200106");
  assert.equal(lead?.virksomhedsnavn, "JL TRANSPORT, SDR. ApS");
  assert.equal(lead?.virksomhedsform, "APS");
  assert.equal(lead?.branchekode, "602410");
  assert.equal(lead?.postnr, "8361");
  assert.equal(lead?.by, "Hasselager");
  assert.equal(lead?.adresse, "Pilegårdsvej 268");
  assert.equal(lead?.kilde, "cvr_api");
  assert.equal(lead?.reklamebeskyttelse, false);
});

test("mangler cvrNummer eller navn giver null (frasorteres), ikke en delvis række", () => {
  assert.equal(mapVirksomhedTilLead({ ...rigtigtDokument, cvrNummer: undefined }), null);
  assert.equal(
    mapVirksomhedTilLead({ ...rigtigtDokument, virksomhedMetadata: { ...rigtigtDokument.virksomhedMetadata, nyesteNavn: null } }),
    null
  );
});

test("ugyldigt (ikke 8-cifret) cvrNummer giver null", () => {
  assert.equal(mapVirksomhedTilLead({ ...rigtigtDokument, cvrNummer: 123 }), null);
});

test("antal_ansatte falder tilbage gennem beskæftigelsesfelterne i rækkefølge", () => {
  const medKvartal: RaaVirksomhed = {
    ...rigtigtDokument,
    virksomhedMetadata: {
      ...rigtigtDokument.virksomhedMetadata,
      nyesteKvartalsbeskaeftigelse: { antalAnsatte: 5 },
    },
  };
  assert.equal(mapVirksomhedTilLead(medKvartal)?.antal_ansatte, 5);

  const medBegge: RaaVirksomhed = {
    ...rigtigtDokument,
    virksomhedMetadata: {
      ...rigtigtDokument.virksomhedMetadata,
      nyesteAarsbeskaeftigelse: { antalAnsatte: 12 },
      nyesteKvartalsbeskaeftigelse: { antalAnsatte: 5 },
    },
  };
  assert.equal(mapVirksomhedTilLead(medBegge)?.antal_ansatte, 12, "årsbeskæftigelse har forrang over kvartal");
});

test("adresse uden husnummer bliver bare vejnavn", () => {
  const udenHusnummer: RaaVirksomhed = {
    ...rigtigtDokument,
    virksomhedMetadata: {
      ...rigtigtDokument.virksomhedMetadata,
      nyesteBeliggenhedsadresse: { vejnavn: "Hovedgaden", husnummerFra: null, postnummer: 1000, postdistrikt: "København" },
    },
  };
  assert.equal(mapVirksomhedTilLead(udenHusnummer)?.adresse, "Hovedgaden");
});

test("manglende beliggenhedsadresse giver null-felter, ikke en fejl", () => {
  const udenAdresse: RaaVirksomhed = {
    ...rigtigtDokument,
    virksomhedMetadata: { ...rigtigtDokument.virksomhedMetadata, nyesteBeliggenhedsadresse: null },
  };
  const lead = mapVirksomhedTilLead(udenAdresse);
  assert.equal(lead?.adresse, null);
  assert.equal(lead?.postnr, null);
  assert.equal(lead?.by, null);
});

test("telefon normaliseres og vælger den periode, der er aktuelt gyldig", () => {
  const medTelefon: RaaVirksomhed = {
    ...rigtigtDokument,
    telefonNummer: [
      { kontaktoplysning: "12345678", periode: { gyldigFra: "2020-01-01", gyldigTil: "2021-01-01" } },
      { kontaktoplysning: "87654321", periode: { gyldigFra: "2021-01-01", gyldigTil: null } },
    ],
  };
  assert.equal(mapVirksomhedTilLead(medTelefon)?.telefon, "+4587654321");
});
