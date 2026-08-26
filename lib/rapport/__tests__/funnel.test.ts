import test from "node:test";
import assert from "node:assert/strict";
import { beregnFunnel } from "../funnel.ts";

test("beregnFunnel regner konverteringsrater korrekt gennem hele tragten", () => {
  const resultat = beregnFunnel({
    researchet: 100,
    kvalificeret: 50,
    ringet: 40,
    kontaktOpnaaet: 20,
    moederBooket: 5,
  });
  assert.equal(resultat.konvertering.researchetTilKvalificeret, 50);
  assert.equal(resultat.konvertering.kvalificeretTilRinget, 80);
  assert.equal(resultat.konvertering.ringetTilKontakt, 50);
  assert.equal(resultat.konvertering.kontaktTilMoede, 25);
});

test("beregnFunnel afrunder til én decimal", () => {
  const resultat = beregnFunnel({
    researchet: 3,
    kvalificeret: 1,
    ringet: 0,
    kontaktOpnaaet: 0,
    moederBooket: 0,
  });
  assert.equal(resultat.konvertering.researchetTilKvalificeret, 33.3);
});

test("beregnFunnel giver null (ikke 0 eller NaN) når nævneren er 0", () => {
  const resultat = beregnFunnel({
    researchet: 0,
    kvalificeret: 0,
    ringet: 0,
    kontaktOpnaaet: 0,
    moederBooket: 0,
  });
  assert.equal(resultat.konvertering.researchetTilKvalificeret, null);
  assert.equal(resultat.konvertering.kvalificeretTilRinget, null);
  assert.equal(resultat.konvertering.ringetTilKontakt, null);
  assert.equal(resultat.konvertering.kontaktTilMoede, null);
});

test("beregnFunnel bevarer de rå tal uændret i resultatet", () => {
  const resultat = beregnFunnel({
    researchet: 7,
    kvalificeret: 3,
    ringet: 2,
    kontaktOpnaaet: 1,
    moederBooket: 1,
  });
  assert.equal(resultat.researchet, 7);
  assert.equal(resultat.kvalificeret, 3);
  assert.equal(resultat.ringet, 2);
  assert.equal(resultat.kontaktOpnaaet, 1);
  assert.equal(resultat.moederBooket, 1);
});

test("beregnFunnel giver 100% når hele tragten konverterer 1:1", () => {
  const resultat = beregnFunnel({
    researchet: 10,
    kvalificeret: 10,
    ringet: 10,
    kontaktOpnaaet: 10,
    moederBooket: 10,
  });
  assert.equal(resultat.konvertering.researchetTilKvalificeret, 100);
  assert.equal(resultat.konvertering.kvalificeretTilRinget, 100);
  assert.equal(resultat.konvertering.ringetTilKontakt, 100);
  assert.equal(resultat.konvertering.kontaktTilMoede, 100);
});
