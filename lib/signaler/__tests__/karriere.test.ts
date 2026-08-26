import test from "node:test";
import assert from "node:assert/strict";
import { findKarriereLink } from "../karriere.ts";

test("finder et link med 'karriere' i URL'en", () => {
  const html = `<a href="/karriere">Om os</a>`;
  assert.equal(findKarriereLink(html, "https://eksempel.dk"), "https://eksempel.dk/karriere");
});

test("finder et link ud fra linkteksten alene", () => {
  const html = `<a href="/ansaettelse">Se ledige stillinger</a>`;
  assert.equal(findKarriereLink(html, "https://eksempel.dk"), "https://eksempel.dk/ansaettelse");
});

test("finder engelske jobopslag-nøgleord", () => {
  const html = `<a href="/careers">Careers</a>`;
  assert.equal(findKarriereLink(html, "https://eksempel.dk"), "https://eksempel.dk/careers");
});

test("returnerer null, når intet matcher", () => {
  const html = `<a href="/om-os">Om os</a><a href="/kontakt">Kontakt</a>`;
  assert.equal(findKarriereLink(html, "https://eksempel.dk"), null);
});

test("vælger den højest scorende kandidat ved flere match", () => {
  const html = `
    <a href="/blog/vi-soeger-en-praktikant">Vi søger en praktikant</a>
    <a href="/job">Job</a>
  `;
  // "/job" matcher på både URL og intet i teksten (score 2), bloggen matcher kun løst i URL'en - "/job" skal vinde
  assert.equal(findKarriereLink(html, "https://eksempel.dk"), "https://eksempel.dk/job");
});

test("gør relative links absolutte mod base-URL'en", () => {
  const html = `<a href="karriere/">Karriere</a>`;
  assert.equal(findKarriereLink(html, "https://eksempel.dk/om"), "https://eksempel.dk/karriere/");
});

test("håndterer allerede absolutte links uændret", () => {
  const html = `<a href="https://jobs.eksempel.dk/ledige">Ledige job</a>`;
  assert.equal(findKarriereLink(html, "https://eksempel.dk"), "https://jobs.eksempel.dk/ledige");
});

test("ignorerer almindelige navigationslinks uden nøgleord", () => {
  const html = `<a href="/forside">Forside</a><a href="/produkter">Produkter</a>`;
  assert.equal(findKarriereLink(html, "https://eksempel.dk"), null);
});
