import test from "node:test";
import assert from "node:assert/strict";
import { hashInput } from "../hash.ts";

test("hashInput giver samme hash for samme input", () => {
  assert.equal(hashInput("hej med dig"), hashInput("hej med dig"));
});

test("hashInput giver forskellig hash for forskelligt input", () => {
  assert.notEqual(hashInput("hej med dig"), hashInput("hej med dig!"));
});

test("hashInput er en 64-tegns hex-streng (sha256)", () => {
  assert.match(hashInput("test"), /^[0-9a-f]{64}$/);
});
