import test from "node:test";
import assert from "node:assert/strict";
import { beregnSegmentStatistik } from "../statistik.ts";

test("ingen leads tildelt giver 0 og null-rater", () => {
  const stats = beregnSegmentStatistik("s1", [], [], []);
  assert.deepEqual(stats, { antalLeads: 0, antalRinget: 0, kontaktrate: null, moedrate: null });
});

test("leads tildelt men ingen ringet endnu giver null-rater, ikke 0", () => {
  const koblinger = [
    { lead_id: "l1", segment_id: "s1" },
    { lead_id: "l2", segment_id: "s1" },
  ];
  const stats = beregnSegmentStatistik("s1", koblinger, [], []);
  assert.equal(stats.antalLeads, 2);
  assert.equal(stats.antalRinget, 0);
  assert.equal(stats.kontaktrate, null);
  assert.equal(stats.moedrate, null);
});

test("beregner kontaktrate og mødrate korrekt", () => {
  const koblinger = [
    { lead_id: "l1", segment_id: "s1" },
    { lead_id: "l2", segment_id: "s1" },
    { lead_id: "l3", segment_id: "s1" },
    { lead_id: "l4", segment_id: "s1" },
  ];
  const aktiviteter = [
    { lead_id: "l1", udfald: "moede_booket" },
    { lead_id: "l2", udfald: "ikke_interesseret" },
    { lead_id: "l3", udfald: "ikke_kontakt" },
    // l4 er slet ikke ringet
  ];
  const moeder = [{ lead_id: "l1" }];

  const stats = beregnSegmentStatistik("s1", koblinger, aktiviteter, moeder);
  assert.equal(stats.antalLeads, 4);
  assert.equal(stats.antalRinget, 3); // l1, l2, l3 - l4 tæller ikke med
  assert.equal(stats.kontaktrate, 67); // l1 + l2 kontaktet af 3 ringet = 66.67 -> 67
  assert.equal(stats.moedrate, 33); // l1 fik møde af 3 ringet = 33.33 -> 33
});

test("kun tæller aktiviteter og møder for leads i dette segment", () => {
  const koblinger = [
    { lead_id: "l1", segment_id: "s1" },
    { lead_id: "l2", segment_id: "s2" }, // hører til et andet segment
  ];
  const aktiviteter = [
    { lead_id: "l1", udfald: "ikke_interesseret" },
    { lead_id: "l2", udfald: "moede_booket" },
  ];
  const moeder = [{ lead_id: "l2" }];

  const stats = beregnSegmentStatistik("s1", koblinger, aktiviteter, moeder);
  assert.equal(stats.antalLeads, 1);
  assert.equal(stats.antalRinget, 1);
  assert.equal(stats.kontaktrate, 100);
  assert.equal(stats.moedrate, 0);
});

test("flere udfald på samme lead - tæller kun som kontaktet hvis mindst ét ikke er ikke_kontakt", () => {
  const koblinger = [{ lead_id: "l1", segment_id: "s1" }];
  const aktiviteter = [
    { lead_id: "l1", udfald: "ikke_kontakt" },
    { lead_id: "l1", udfald: "ring_igen" },
  ];
  const stats = beregnSegmentStatistik("s1", koblinger, aktiviteter, []);
  assert.equal(stats.antalRinget, 1);
  assert.equal(stats.kontaktrate, 100);
});
