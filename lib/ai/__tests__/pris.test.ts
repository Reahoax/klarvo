import test from "node:test";
import assert from "node:assert/strict";
import { beregnPrisUsd, AI_MODEL } from "../pris.ts";

test("beregnPrisUsd regner input til $1 pr. million tokens", () => {
  assert.equal(beregnPrisUsd(1_000_000, 0), 1);
});

test("beregnPrisUsd regner output til $5 pr. million tokens", () => {
  assert.equal(beregnPrisUsd(0, 1_000_000), 5);
});

test("beregnPrisUsd summerer input og output", () => {
  assert.equal(beregnPrisUsd(500_000, 100_000), 0.5 + 0.5);
});

test("beregnPrisUsd er 0 for intet forbrug", () => {
  assert.equal(beregnPrisUsd(0, 0), 0);
});

test("AI_MODEL er den billigste nuværende model (Haiku)", () => {
  assert.equal(AI_MODEL, "claude-haiku-4-5");
});
