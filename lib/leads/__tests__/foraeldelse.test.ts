import test from "node:test";
import assert from "node:assert/strict";
import { erForaeldet } from "../foraeldelse.ts";

test("erForaeldet er false for et nyt lead uden aktivitet", () => {
  const nu = new Date("2026-01-01T00:00:00Z");
  const oprettet = new Date("2025-12-01T00:00:00Z"); // 1 måned gammelt
  assert.equal(erForaeldet(oprettet, null, 12, nu), false);
});

test("erForaeldet er true for et gammelt lead uden nogen aktivitet", () => {
  const nu = new Date("2026-01-01T00:00:00Z");
  const oprettet = new Date("2024-01-01T00:00:00Z"); // 2 år gammelt, ingen aktivitet
  assert.equal(erForaeldet(oprettet, null, 12, nu), true);
});

test("erForaeldet bruger seneste aktivitet frem for oprettelsesdato, når den findes", () => {
  const nu = new Date("2026-01-01T00:00:00Z");
  const oprettet = new Date("2020-01-01T00:00:00Z"); // meget gammelt lead
  const senesteAktivitet = new Date("2025-12-01T00:00:00Z"); // men ringet for 1 måned siden
  assert.equal(erForaeldet(oprettet, senesteAktivitet, 12, nu), false);
});

test("erForaeldet er true, når seneste aktivitet selv er ældre end tærsklen", () => {
  const nu = new Date("2026-01-01T00:00:00Z");
  const oprettet = new Date("2020-01-01T00:00:00Z");
  const senesteAktivitet = new Date("2024-01-01T00:00:00Z"); // 2 år siden sidste opkald
  assert.equal(erForaeldet(oprettet, senesteAktivitet, 12, nu), true);
});

test("erForaeldet respekterer en konfigurerbar tærskel, ikke kun 12 måneder", () => {
  const nu = new Date("2026-01-01T00:00:00Z");
  const oprettet = new Date("2025-10-01T00:00:00Z"); // 3 måneder gammelt
  assert.equal(erForaeldet(oprettet, null, 6, nu), false);
  assert.equal(erForaeldet(oprettet, null, 2, nu), true);
});

test("erForaeldet er false lige på oprettelsestidspunktet", () => {
  const nu = new Date("2026-01-01T00:00:00Z");
  assert.equal(erForaeldet(nu, null, 12, nu), false);
});
