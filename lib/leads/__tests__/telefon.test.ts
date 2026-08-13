import { test } from "node:test";
import assert from "node:assert/strict";
import { normaliserTelefon } from "../telefon.ts";

test("8 cifre uden formatering normaliseres til +45", () => {
  assert.equal(normaliserTelefon("12345678"), "+4512345678");
});

test("nummer med mellemrum normaliseres", () => {
  assert.equal(normaliserTelefon("12 34 56 78"), "+4512345678");
});

test("nummer der allerede har +45 bevares", () => {
  assert.equal(normaliserTelefon("+4512345678"), "+4512345678");
});

test("nummer med 0045-prefiks normaliseres", () => {
  assert.equal(normaliserTelefon("004512345678"), "+4512345678");
});

test("for få cifre afvises (null, ikke et gæt)", () => {
  assert.equal(normaliserTelefon("1234567"), null);
});

test("udenlandsk nummer afvises", () => {
  assert.equal(normaliserTelefon("+4915123456789"), null);
});

test("tomt input giver null", () => {
  assert.equal(normaliserTelefon(""), null);
  assert.equal(normaliserTelefon(null), null);
  assert.equal(normaliserTelefon(undefined), null);
});
