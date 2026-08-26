import test from "node:test";
import assert from "node:assert/strict";
import { validerResumeSvar, validerHypoteseSvar, validerScoreSvar, parseJsonSvar } from "../skema.ts";

test("validerResumeSvar accepterer en gyldig streng", () => {
  assert.deepEqual(validerResumeSvar({ resume: "De laver websites." }), { resume: "De laver websites." });
});

test("validerResumeSvar accepterer null (ikke fundet)", () => {
  assert.deepEqual(validerResumeSvar({ resume: null }), { resume: null });
});

test("validerResumeSvar afviser manglende felt", () => {
  assert.equal(validerResumeSvar({}), null);
});

test("validerResumeSvar afviser forkert type", () => {
  assert.equal(validerResumeSvar({ resume: 123 }), null);
});

test("validerResumeSvar afviser ikke-objekt-input", () => {
  assert.equal(validerResumeSvar("bare en streng"), null);
  assert.equal(validerResumeSvar(null), null);
  assert.equal(validerResumeSvar(["array"]), null);
});

test("validerHypoteseSvar accepterer gyldig streng og null", () => {
  assert.deepEqual(validerHypoteseSvar({ hypotese: "Mangler måske synlighed." }), {
    hypotese: "Mangler måske synlighed.",
  });
  assert.deepEqual(validerHypoteseSvar({ hypotese: null }), { hypotese: null });
});

test("validerHypoteseSvar afviser forkert form", () => {
  assert.equal(validerHypoteseSvar({ forkert_navn: "x" }), null);
});

test("validerScoreSvar accepterer gyldig score 1-10 med begrundelse", () => {
  assert.deepEqual(validerScoreSvar({ score: 7, begrundelse: "God branchematch." }), {
    score: 7,
    begrundelse: "God branchematch.",
  });
});

test("validerScoreSvar accepterer score: null og begrundelse: null", () => {
  assert.deepEqual(validerScoreSvar({ score: null, begrundelse: null }), { score: null, begrundelse: null });
});

test("validerScoreSvar afviser score under 1 eller over 10", () => {
  assert.equal(validerScoreSvar({ score: 0, begrundelse: "x" }), null);
  assert.equal(validerScoreSvar({ score: 11, begrundelse: "x" }), null);
});

test("validerScoreSvar afviser ikke-heltal score", () => {
  assert.equal(validerScoreSvar({ score: 5.5, begrundelse: "x" }), null);
});

test("validerScoreSvar afviser manglende begrundelse-felt", () => {
  assert.equal(validerScoreSvar({ score: 5 }), null);
});

test("parseJsonSvar parser ren JSON", () => {
  assert.deepEqual(parseJsonSvar('{"resume":"x"}'), { resume: "x" });
});

test("parseJsonSvar udtrækker JSON omgivet af forklarende tekst", () => {
  assert.deepEqual(parseJsonSvar('Her er svaret: {"resume":"x"} - håber det hjælper'), { resume: "x" });
});

test("parseJsonSvar returnerer null for ugyldig tekst", () => {
  assert.equal(parseJsonSvar("dette er ikke json"), null);
});
