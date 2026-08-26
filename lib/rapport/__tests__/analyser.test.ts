import test from "node:test";
import assert from "node:assert/strict";
import { analyserAfvisningsgrunde, analyserKontaktTitel } from "../analyser.ts";

test("analyserAfvisningsgrunde tæller og sorterer efter hyppighed", () => {
  const resultat = analyserAfvisningsgrunde(["For dyrt", "For dyrt", "Ingen tid", "For dyrt"]);
  assert.deepEqual(resultat, [
    { grund: "For dyrt", antal: 3 },
    { grund: "Ingen tid", antal: 1 },
  ]);
});

test("analyserAfvisningsgrunde samler null og tom streng under 'Ingen grund angivet'", () => {
  const resultat = analyserAfvisningsgrunde([null, "", "  ", "For dyrt"]);
  assert.deepEqual(resultat, [
    { grund: "Ingen grund angivet", antal: 3 },
    { grund: "For dyrt", antal: 1 },
  ]);
});

test("analyserAfvisningsgrunde giver tom liste for ingen data", () => {
  assert.deepEqual(analyserAfvisningsgrunde([]), []);
});

test("analyserKontaktTitel beregner vinderrate korrekt", () => {
  const resultat = analyserKontaktTitel([
    { titel: "Direktør", moedeBooket: true },
    { titel: "Direktør", moedeBooket: true },
    { titel: "Direktør", moedeBooket: false },
    { titel: "Direktør", moedeBooket: false },
    { titel: "Bogholder", moedeBooket: false },
  ]);
  assert.deepEqual(resultat[0], { titel: "Direktør", kontaktet: 4, moederBooket: 2, vinderrate: 50 });
  assert.deepEqual(resultat[1], { titel: "Bogholder", kontaktet: 1, moederBooket: 0, vinderrate: 0 });
});

test("analyserKontaktTitel sorterer højeste vinderrate først", () => {
  const resultat = analyserKontaktTitel([
    { titel: "A", moedeBooket: false },
    { titel: "B", moedeBooket: true },
  ]);
  assert.equal(resultat[0].titel, "B");
  assert.equal(resultat[1].titel, "A");
});

test("analyserKontaktTitel samler manglende titel under 'Titel ikke registreret'", () => {
  const resultat = analyserKontaktTitel([{ titel: null, moedeBooket: false }, { titel: "  ", moedeBooket: true }]);
  assert.equal(resultat.length, 1);
  assert.equal(resultat[0].titel, "Titel ikke registreret");
  assert.equal(resultat[0].kontaktet, 2);
});

test("analyserKontaktTitel giver tom liste for ingen data", () => {
  assert.deepEqual(analyserKontaktTitel([]), []);
});
