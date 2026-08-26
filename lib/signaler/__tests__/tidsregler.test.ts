import test from "node:test";
import assert from "node:assert/strict";
import {
  skalVente,
  erSignalFrisk,
  erSignalGammelt,
  MIN_MILLISEKUNDER_MELLEM_KALD,
  CACHE_DAGE,
  SIGNAL_GAMMELT_DAGE,
} from "../tidsregler.ts";

test("skalVente er false, hvis domænet aldrig er hentet før", () => {
  assert.equal(skalVente(null), false);
});

test("skalVente er true lige efter et kald", () => {
  const nu = new Date("2026-01-01T12:00:00Z");
  const sidstHentet = new Date(nu.getTime() - 1000); // 1 sekund siden
  assert.equal(skalVente(sidstHentet, nu), true);
});

test("skalVente er false, når nok tid er gået", () => {
  const nu = new Date("2026-01-01T12:00:00Z");
  const sidstHentet = new Date(nu.getTime() - MIN_MILLISEKUNDER_MELLEM_KALD - 1);
  assert.equal(skalVente(sidstHentet, nu), false);
});

test("erSignalFrisk er true lige efter hentning", () => {
  const nu = new Date("2026-01-01T12:00:00Z");
  assert.equal(erSignalFrisk(nu, nu), true);
});

test("erSignalFrisk er false efter cache-perioden er udløbet", () => {
  const nu = new Date("2026-01-01T12:00:00Z");
  const hentetDato = new Date(nu.getTime() - (CACHE_DAGE + 1) * 24 * 60 * 60 * 1000);
  assert.equal(erSignalFrisk(hentetDato, nu), false);
});

test("erSignalGammelt er false for et nyt signal", () => {
  const nu = new Date("2026-01-01T12:00:00Z");
  assert.equal(erSignalGammelt(nu, nu), false);
});

test("erSignalGammelt er true efter 6 måneder", () => {
  const nu = new Date("2026-01-01T12:00:00Z");
  const hentetDato = new Date(nu.getTime() - (SIGNAL_GAMMELT_DAGE + 1) * 24 * 60 * 60 * 1000);
  assert.equal(erSignalGammelt(hentetDato, nu), true);
});
