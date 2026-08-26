import test from "node:test";
import assert from "node:assert/strict";
import { udledCvrAendringer, formaterCvrAendringerTilTekst } from "../cvrAendring.ts";
import type { RaaVirksomhedHistorik } from "@/lib/cvr/historikOpslag.ts";

test("udledCvrAendringer finder ingen ændringer, når hver tidsserie kun har ét element", () => {
  const raa: RaaVirksomhedHistorik = {
    navne: [{ navn: "Test ApS", periode: { gyldigFra: "2020-01-01", gyldigTil: null } }],
    livsforloeb: [{ periode: { gyldigFra: "2020-01-01", gyldigTil: null } }],
  };
  const aendringer = udledCvrAendringer(raa);
  assert.deepEqual(aendringer, [
    { type: "Stiftelse", beskrivelse: "Virksomheden blev registreret", dato: "2020-01-01" },
  ]);
});

test("udledCvrAendringer finder navneskift mellem to perioder", () => {
  const raa: RaaVirksomhedHistorik = {
    navne: [
      { navn: "Gammelt Navn ApS", periode: { gyldigFra: "2018-01-01", gyldigTil: "2022-05-01" } },
      { navn: "Nyt Navn ApS", periode: { gyldigFra: "2022-05-01", gyldigTil: null } },
    ],
  };
  const aendringer = udledCvrAendringer(raa);
  assert.equal(aendringer.length, 1);
  assert.equal(aendringer[0].type, "Navneskift");
  assert.equal(aendringer[0].beskrivelse, "Gammelt Navn ApS → Nyt Navn ApS");
  assert.equal(aendringer[0].dato, "2022-05-01");
});

test("udledCvrAendringer finder adresseflytning og formaterer adressen", () => {
  const raa: RaaVirksomhedHistorik = {
    beliggenhedsadresse: [
      {
        vejnavn: "Gammelvej",
        husnummerFra: 1,
        postnummer: 2100,
        postdistrikt: "København Ø",
        periode: { gyldigFra: "2015-01-01", gyldigTil: "2024-03-01" },
      },
      {
        vejnavn: "Nyvej",
        husnummerFra: 5,
        postnummer: 8000,
        postdistrikt: "Aarhus C",
        periode: { gyldigFra: "2024-03-01", gyldigTil: null },
      },
    ],
  };
  const aendringer = udledCvrAendringer(raa);
  assert.equal(aendringer.length, 1);
  assert.equal(aendringer[0].type, "Adresseflytning");
  assert.match(aendringer[0].beskrivelse, /Gammelvej 1, 2100, København Ø → Nyvej 5, 8000, Aarhus C/);
});

test("udledCvrAendringer finder branchekodeskift", () => {
  const raa: RaaVirksomhedHistorik = {
    hovedbranche: [
      { branchekode: "620100", branchetekst: "Computerprogrammering", periode: { gyldigFra: "2019-01-01", gyldigTil: "2023-01-01" } },
      { branchekode: "620200", branchetekst: "Konsulentbistand", periode: { gyldigFra: "2023-01-01", gyldigTil: null } },
    ],
  };
  const aendringer = udledCvrAendringer(raa);
  assert.equal(aendringer[0].type, "Branchekodeskift");
  assert.equal(aendringer[0].beskrivelse, "620100 Computerprogrammering → 620200 Konsulentbistand");
});

test("udledCvrAendringer finder statusskift", () => {
  const raa: RaaVirksomhedHistorik = {
    virksomhedsstatus: [
      { status: "NORMAL", periode: { gyldigFra: "2019-01-01", gyldigTil: "2025-06-01" } },
      { status: "UNDER KONKURS", periode: { gyldigFra: "2025-06-01", gyldigTil: null } },
    ],
  };
  const aendringer = udledCvrAendringer(raa);
  assert.equal(aendringer[0].type, "Statusskift");
  assert.equal(aendringer[0].beskrivelse, "NORMAL → UNDER KONKURS");
});

test("udledCvrAendringer sorterer nyeste ændring først på tværs af typer", () => {
  const raa: RaaVirksomhedHistorik = {
    navne: [
      { navn: "A", periode: { gyldigFra: "2018-01-01", gyldigTil: "2020-01-01" } },
      { navn: "B", periode: { gyldigFra: "2020-01-01", gyldigTil: null } },
    ],
    virksomhedsstatus: [
      { status: "NORMAL", periode: { gyldigFra: "2018-01-01", gyldigTil: "2024-01-01" } },
      { status: "OPLØST", periode: { gyldigFra: "2024-01-01", gyldigTil: null } },
    ],
  };
  const aendringer = udledCvrAendringer(raa);
  assert.equal(aendringer[0].type, "Statusskift");
  assert.equal(aendringer[1].type, "Navneskift");
});

test("udledCvrAendringer håndterer tomt/manglende data uden at fejle", () => {
  assert.deepEqual(udledCvrAendringer({}), []);
});

test("formaterCvrAendringerTilTekst giver en klar besked, når intet er fundet", () => {
  assert.equal(formaterCvrAendringerTilTekst([]), "Ingen registrerede ændringer i CVR's historik.");
});

test("formaterCvrAendringerTilTekst begrænser til maksAntal poster", () => {
  const mange = Array.from({ length: 10 }, (_, i) => ({
    type: "Navneskift",
    beskrivelse: `Navn ${i}`,
    dato: `2020-01-0${(i % 9) + 1}`,
  }));
  const tekst = formaterCvrAendringerTilTekst(mange, 3);
  assert.equal(tekst.split("\n").length, 3);
});

test("formaterCvrAendringerTilTekst inkluderer dato og type i hver linje", () => {
  const tekst = formaterCvrAendringerTilTekst([{ type: "Stiftelse", beskrivelse: "Virksomheden blev registreret", dato: "2020-01-01" }]);
  assert.equal(tekst, "2020-01-01: Stiftelse — Virksomheden blev registreret");
});
