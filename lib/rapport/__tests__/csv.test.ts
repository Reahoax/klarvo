import test from "node:test";
import assert from "node:assert/strict";
import { tilCsv } from "../csv.ts";

test("tilCsv sætter header og rækker sammen med \\r\\n", () => {
  const csv = tilCsv(["Navn", "Antal"], [["Kunde A", 5], ["Kunde B", 10]]);
  assert.equal(csv, "Navn,Antal\r\nKunde A,5\r\nKunde B,10");
});

test("tilCsv escaper felter med komma", () => {
  const csv = tilCsv(["Navn"], [["Andersen, Jensen & Co"]]);
  assert.equal(csv, 'Navn\r\n"Andersen, Jensen & Co"');
});

test("tilCsv escaper og fordobler interne anførselstegn", () => {
  const csv = tilCsv(["Citat"], [['Han sagde "hej"']]);
  assert.equal(csv, 'Citat\r\n"Han sagde ""hej"""');
});

test("tilCsv escaper felter med linjeskift", () => {
  const csv = tilCsv(["Note"], [["Linje 1\nLinje 2"]]);
  assert.equal(csv, 'Note\r\n"Linje 1\nLinje 2"');
});

test("tilCsv konverterer null/undefined til tomt felt", () => {
  const csv = tilCsv(["A", "B"], [[null, undefined]]);
  assert.equal(csv, "A,B\r\n,");
});

test("tilCsv lader almindelige tal og tekst stå ucitéret", () => {
  const csv = tilCsv(["Tal", "Tekst"], [[42, "almindelig tekst"]]);
  assert.equal(csv, "Tal,Tekst\r\n42,almindelig tekst");
});

test("tilCsv håndterer ingen datarækker", () => {
  assert.equal(tilCsv(["Kun header"], []), "Kun header");
});
