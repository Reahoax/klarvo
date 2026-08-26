import test from "node:test";
import assert from "node:assert/strict";
import { udtraekDomaene } from "../domaene.ts";

test("udtrækker domæne fra en fuld URL med protokol", () => {
  assert.equal(udtraekDomaene("https://www.eksempel.dk/om-os"), "eksempel.dk");
});

test("tilføjer https, hvis protokollen mangler", () => {
  assert.equal(udtraekDomaene("eksempel.dk"), "eksempel.dk");
});

test("fjerner www.-præfiks", () => {
  assert.equal(udtraekDomaene("http://www.eksempel.dk"), "eksempel.dk");
});

test("lowercaser domænet", () => {
  assert.equal(udtraekDomaene("https://EKSEMPEL.DK"), "eksempel.dk");
});

test("ugyldig URL giver null i stedet for at kaste en fejl", () => {
  assert.equal(udtraekDomaene(""), null);
  assert.equal(udtraekDomaene("   "), null);
});
