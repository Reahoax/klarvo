import { test } from "node:test";
import assert from "node:assert/strict";
import { genererBekraeftelsestekst } from "../bekraeftelsestekst.ts";

const basis = {
  virksomhedsnavn: "Testvirksomhed ApS",
  deltagerNavn: "Anna Jensen",
  datoTid: "2026-08-20T10:00:00+02:00",
  form: "fysisk" as const,
};

test("indeholder virksomhedsnavn og deltagernavn", () => {
  const tekst = genererBekraeftelsestekst(basis);
  assert.match(tekst, /Testvirksomhed ApS/);
  assert.match(tekst, /Hej Anna Jensen,/);
});

test("mødeform oversættes til en læsbar beskrivelse", () => {
  assert.match(genererBekraeftelsestekst({ ...basis, form: "online" }), /online-møde/);
  assert.match(genererBekraeftelsestekst({ ...basis, form: "telefon" }), /telefonsamtale/);
  assert.match(genererBekraeftelsestekst({ ...basis, form: "fysisk" }), /fysisk møde/);
});

test("kontekstnote inkluderes når sat", () => {
  const tekst = genererBekraeftelsestekst({ ...basis, kontekstnote: "Medbring gerne jeres seneste tal." });
  assert.match(tekst, /Medbring gerne jeres seneste tal\./);
});

test("tom eller manglende kontekstnote udelades stille", () => {
  const utenNote = genererBekraeftelsestekst(basis);
  const tomNote = genererBekraeftelsestekst({ ...basis, kontekstnote: "   " });
  assert.equal(utenNote, tomNote);
});

test("manglende deltagernavn falder tilbage til en generisk hilsen", () => {
  const tekst = genererBekraeftelsestekst({ ...basis, deltagerNavn: "" });
  assert.match(tekst, /^Hej,/);
});
