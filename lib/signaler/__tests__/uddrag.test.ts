import test from "node:test";
import assert from "node:assert/strict";
import { uddragTitelOgBeskrivelse } from "../uddrag.ts";

test("udtrækker titel og beskrivelse fra en normal side", () => {
  const html = `<html><head><title>Eksempel A/S</title><meta name="description" content="Vi laver widgets."></head></html>`;
  const resultat = uddragTitelOgBeskrivelse(html);
  assert.equal(resultat.titel, "Eksempel A/S");
  assert.equal(resultat.beskrivelse, "Vi laver widgets.");
});

test("håndterer attributter i vilkårlig rækkefølge på meta-tagget", () => {
  const html = `<meta content="Omvendt rækkefølge." name="description">`;
  const resultat = uddragTitelOgBeskrivelse(html);
  assert.equal(resultat.beskrivelse, "Omvendt rækkefølge.");
});

test("giver null for manglende felter, i stedet for tom streng", () => {
  const resultat = uddragTitelOgBeskrivelse("<html><head></head></html>");
  assert.equal(resultat.titel, null);
  assert.equal(resultat.beskrivelse, null);
});

test("afkoder almindelige HTML-entiteter og normaliserer whitespace", () => {
  const html = `<title>Fisk &amp; Fiskere\n\t  Aps</title>`;
  const resultat = uddragTitelOgBeskrivelse(html);
  assert.equal(resultat.titel, "Fisk & Fiskere Aps");
});

test("afkorter meget lange værdier til 500 tegn", () => {
  const langBeskrivelse = "x".repeat(1000);
  const html = `<meta name="description" content="${langBeskrivelse}">`;
  const resultat = uddragTitelOgBeskrivelse(html);
  assert.equal(resultat.beskrivelse?.length, 500);
});
