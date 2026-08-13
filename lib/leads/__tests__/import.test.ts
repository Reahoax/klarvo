import { test } from "node:test";
import assert from "node:assert/strict";
import { filtrerOgValidérImport } from "../import.ts";

const KONFIG = { tilladteVirksomhedsformer: ["ApS", "A/S"] };

function raekke(overrides: Record<string, string> = {}) {
  return {
    cvr_nummer: "12345678",
    virksomhedsnavn: "Testfirma ApS",
    virksomhedsform: "ApS",
    status: "aktiv",
    ...overrides,
  };
}

test("gyldig række importeres", () => {
  const resultat = filtrerOgValidérImport([raekke()], KONFIG);
  assert.equal(resultat.klar.length, 1);
  assert.equal(resultat.frasorteret.length, 0);
  assert.equal(resultat.klar[0].cvr_nummer, "12345678");
});

test("R4: virksomhedsform uden for whitelisten frasorteres", () => {
  const resultat = filtrerOgValidérImport(
    [raekke({ virksomhedsform: "Enkeltmandsvirksomhed" })],
    KONFIG
  );
  assert.equal(resultat.klar.length, 0);
  assert.equal(resultat.frasorteret.length, 1);
  assert.match(resultat.frasorteret[0].aarsag, /virksomhedsform/i);
});

test("ugyldigt CVR-nummer frasorteres, ikke gættes på", () => {
  const resultat = filtrerOgValidérImport([raekke({ cvr_nummer: "123" })], KONFIG);
  assert.equal(resultat.klar.length, 0);
  assert.equal(resultat.frasorteret.length, 1);
  assert.match(resultat.frasorteret[0].aarsag, /CVR/i);
});

test("manglende virksomhedsnavn frasorteres", () => {
  const resultat = filtrerOgValidérImport([raekke({ virksomhedsnavn: "" })], KONFIG);
  assert.equal(resultat.klar.length, 0);
  assert.match(resultat.frasorteret[0].aarsag, /virksomhedsnavn/i);
});

test("dubleret CVR-nummer i samme fil: kun første tælles med, resten frasorteres", () => {
  const resultat = filtrerOgValidérImport(
    [raekke(), raekke({ virksomhedsnavn: "Andet navn" })],
    KONFIG
  );
  assert.equal(resultat.klar.length, 1);
  assert.equal(resultat.frasorteret.length, 1);
  assert.match(resultat.frasorteret[0].aarsag, /flere gange/i);
});

test("ugyldigt telefonnummer giver advarsel, men blokerer ikke importen", () => {
  const resultat = filtrerOgValidérImport(
    [raekke({ telefon: "123" })],
    KONFIG
  );
  assert.equal(resultat.klar.length, 1);
  assert.equal(resultat.klar[0].telefon, null);
  assert.equal(resultat.advarsler.length, 1);
});

test("reklamebeskyttelse=ja tolkes korrekt (afgørende for R3 nedstrøms)", () => {
  const resultat = filtrerOgValidérImport(
    [raekke({ reklamebeskyttelse: "ja" })],
    KONFIG
  );
  assert.equal(resultat.klar[0].reklamebeskyttelse, true);
});

test("samme navn+postnr med forskelligt CVR flages som mulig duplet", () => {
  const resultat = filtrerOgValidérImport(
    [
      raekke({ virksomhedsnavn: "Firma A", postnr: "2100" }),
      raekke({
        cvr_nummer: "87654321",
        virksomhedsnavn: "Firma A",
        postnr: "2100",
      }),
    ],
    KONFIG
  );
  assert.equal(resultat.klar.length, 2);
  assert.equal(resultat.muligeDubletter.length, 1);
  assert.equal(resultat.muligeDubletter[0].cvrNumre.length, 2);
});

test("alias-kolonnenavne genkendes (fx 'CVR-nummer' med bindestreg)", () => {
  const resultat = filtrerOgValidérImport(
    [
      {
        "CVR-nummer": "12345678",
        Virksomhedsnavn: "Testfirma ApS",
        Virksomhedsform: "ApS",
        Status: "aktiv",
      },
    ],
    KONFIG
  );
  assert.equal(resultat.klar.length, 1);
});
