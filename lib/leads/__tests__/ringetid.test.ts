import { test } from "node:test";
import assert from "node:assert/strict";
import { erIndenforRingetid } from "../ringetid.ts";

const standard = { ringetid_fra: "09:00", ringetid_til: "16:00", ringetid_ugedage: [1, 2, 3, 4, 5] };

test("tirsdag kl. 10 dansk tid er indenfor standardvinduet", () => {
  // 2026-08-11 er en tirsdag. 08:00 UTC = 10:00 dansk sommertid (UTC+2).
  const naa = new Date("2026-08-11T08:00:00Z");
  assert.equal(erIndenforRingetid(standard, naa), true);
});

test("tirsdag kl. 20 dansk tid er udenfor vinduet", () => {
  const naa = new Date("2026-08-11T18:00:00Z");
  assert.equal(erIndenforRingetid(standard, naa), false);
});

test("lørdag er udenfor vinduet, selv midt på dagen", () => {
  // 2026-08-15 er en lørdag.
  const naa = new Date("2026-08-15T10:00:00Z");
  assert.equal(erIndenforRingetid(standard, naa), false);
});

test("præcis på starttidspunktet tæller som indenfor", () => {
  const naa = new Date("2026-08-11T07:00:00Z"); // 09:00 dansk sommertid
  assert.equal(erIndenforRingetid(standard, naa), true);
});

test("præcis på sluttidspunktet tæller som udenfor", () => {
  const naa = new Date("2026-08-11T14:00:00Z"); // 16:00 dansk sommertid
  assert.equal(erIndenforRingetid(standard, naa), false);
});

test("udvidet vindue og weekend-dage respekteres", () => {
  const udvidet = { ringetid_fra: "08:00", ringetid_til: "20:00", ringetid_ugedage: [6, 7] };
  const loerdag = new Date("2026-08-15T10:00:00Z");
  assert.equal(erIndenforRingetid(udvidet, loerdag), true);
});
