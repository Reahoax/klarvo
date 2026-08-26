import test from "node:test";
import assert from "node:assert/strict";
import {
  parseSide,
  parseLeadsPrSide,
  beregnRange,
  beregnAntalSider,
  LEADS_PR_SIDE,
} from "../filters.ts";

test("parseSide falder tilbage til side 1, når parameteren mangler", () => {
  assert.equal(parseSide({}), 1);
});

test("parseSide læser et gyldigt sidetal", () => {
  assert.equal(parseSide({ side: "3" }), 3);
});

test("parseSide afviser 0, negative og ugyldige værdier - falder tilbage til 1", () => {
  assert.equal(parseSide({ side: "0" }), 1);
  assert.equal(parseSide({ side: "-2" }), 1);
  assert.equal(parseSide({ side: "abc" }), 1);
});

test("parseSide tager første værdi, hvis parameteren optræder flere gange", () => {
  assert.equal(parseSide({ side: ["4", "5"] }), 4);
});

test("parseLeadsPrSide falder tilbage til standarden (50), når parameteren mangler", () => {
  assert.equal(parseLeadsPrSide({}), LEADS_PR_SIDE);
});

test("parseLeadsPrSide accepterer en af de faste valgmuligheder", () => {
  assert.equal(parseLeadsPrSide({ pr_side: "100" }), 100);
  assert.equal(parseLeadsPrSide({ pr_side: "25" }), 25);
});

test("parseLeadsPrSide afviser vilkårlige tal - falder tilbage til standarden", () => {
  assert.equal(parseLeadsPrSide({ pr_side: "10000" }), LEADS_PR_SIDE);
  assert.equal(parseLeadsPrSide({ pr_side: "0" }), LEADS_PR_SIDE);
  assert.equal(parseLeadsPrSide({ pr_side: "abc" }), LEADS_PR_SIDE);
});

test("beregnRange giver de første 50 rækker på side 1", () => {
  assert.deepEqual(beregnRange(1), { fra: 0, til: LEADS_PR_SIDE - 1 });
});

test("beregnRange giver de næste 50 rækker på side 2", () => {
  assert.deepEqual(beregnRange(2), { fra: 50, til: 99 });
});

test("beregnRange respekterer en tilpasset sidestørrelse", () => {
  assert.deepEqual(beregnRange(2, 10), { fra: 10, til: 19 });
});

test("beregnAntalSider runder op, så en delvist fyldt sidste side stadig tæller", () => {
  assert.equal(beregnAntalSider(101), 3); // 50 + 50 + 1
  assert.equal(beregnAntalSider(100), 2);
  assert.equal(beregnAntalSider(1), 1);
});

test("beregnAntalSider giver mindst 1, selv ved 0 rækker", () => {
  assert.equal(beregnAntalSider(0), 1);
});
