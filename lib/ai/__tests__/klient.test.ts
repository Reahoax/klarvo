import test from "node:test";
import assert from "node:assert/strict";
import { erAiKonfigureret, opretAiKlient } from "../klient.ts";

// ANTHROPIC_API_KEY er bevidst ikke sat i produktion endnu (se README/memory
// "Bevidst udskudt") - disse tests kører uden nøglen for at bevise, at
// AI-berigelse fejler pænt frem for at forsøge en forbindelse.
test("erAiKonfigureret er false, når ANTHROPIC_API_KEY ikke er sat", () => {
  const forrige = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    assert.equal(erAiKonfigureret(), false);
  } finally {
    if (forrige !== undefined) process.env.ANTHROPIC_API_KEY = forrige;
  }
});

test("opretAiKlient kaster en tydelig dansk fejl, når nøglen mangler", () => {
  const forrige = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    assert.throws(() => opretAiKlient(), /ANTHROPIC_API_KEY mangler/);
  } finally {
    if (forrige !== undefined) process.env.ANTHROPIC_API_KEY = forrige;
  }
});

test("erAiKonfigureret er true, når ANTHROPIC_API_KEY er sat", () => {
  const forrige = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = "test-noegle-kun-til-denne-test";
  try {
    assert.equal(erAiKonfigureret(), true);
  } finally {
    if (forrige === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = forrige;
  }
});
