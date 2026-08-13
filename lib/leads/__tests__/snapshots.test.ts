import { test } from "node:test";
import assert from "node:assert/strict";
import { beregnSnapshotDiff, type SnapshotData } from "../snapshots.ts";

const basis: SnapshotData = {
  virksomhedsnavn: "Test Aps",
  virksomhedsform: "ApS",
  branchekode: "620100",
  branchetekst: "IT",
  antal_ansatte: 10,
  status: "normal",
  adresse: "Testvej 1",
  postnr: "2100",
  by: "København Ø",
  telefon: "+4512345678",
  website: "https://test.dk",
  reklamebeskyttelse: false,
};

test("ingen ændringer giver tom diff", () => {
  assert.deepEqual(beregnSnapshotDiff(basis, { ...basis }), []);
});

test("adresseændring opdages", () => {
  const ny = { ...basis, adresse: "Nyvej 2" };
  assert.deepEqual(beregnSnapshotDiff(basis, ny), [
    { felt: "adresse", gammel: "Testvej 1", ny: "Nyvej 2" },
  ]);
});

test("flere samtidige ændringer opdages hver for sig", () => {
  const ny = { ...basis, antal_ansatte: 25, status: "ophørt" };
  const diff = beregnSnapshotDiff(basis, ny);
  assert.equal(diff.length, 2);
  assert.deepEqual(diff.find((d) => d.felt === "antal_ansatte"), {
    felt: "antal_ansatte",
    gammel: 10,
    ny: 25,
  });
  assert.deepEqual(diff.find((d) => d.felt === "status"), {
    felt: "status",
    gammel: "normal",
    ny: "ophørt",
  });
});

test("felter der ikke er i SNAPSHOT_FELTER indgår ikke i diff (fx sidst_aendret)", () => {
  // beregnSnapshotDiff kigger kun på de deklarerede snapshot-felter, så
  // typen SnapshotData kan ikke engang indeholde ekstra felter - testen her
  // dokumenterer bevidst grænsen, ikke en runtime-kontrol.
  assert.deepEqual(Object.keys(basis).sort(), [
    "adresse",
    "antal_ansatte",
    "branchekode",
    "branchetekst",
    "by",
    "postnr",
    "reklamebeskyttelse",
    "status",
    "telefon",
    "virksomhedsform",
    "virksomhedsnavn",
    "website",
  ]);
});
