import test from "node:test";
import assert from "node:assert/strict";
import { berigLead } from "../berig.ts";

// Denne test beviser den konkrete garanti bag "sørg for at den ikke er
// connected endnu": uden ANTHROPIC_API_KEY foretager berigLead INGEN
// databasekald overhovedet (heller ikke et opslag på leadet selv) - den
// fejler ud med det samme. supabase-stubben har bevidst ingen fungerende
// .from(), så testen ville selv kaste en fejl, hvis koden nogensinde nåede
// at forsøge et databasekald før konfigurationstjekket.
test("berigLead stopper før nogen databaseadgang, når AI ikke er konfigureret", async () => {
  const forrige = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;

  const supabaseStub = {
    from() {
      throw new Error("Denne stub bør aldrig kaldes - berigLead skal stoppe før databaseadgang.");
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  try {
    const resultat = await berigLead(supabaseStub, "00000000-0000-0000-0000-000000000000");
    assert.equal(resultat.ok, false);
    assert.match(resultat.fejl ?? "", /ANTHROPIC_API_KEY er ikke sat endnu/);
    assert.deepEqual(resultat.udfoerte, []);
    assert.deepEqual(resultat.sprunget_over, []);
  } finally {
    if (forrige !== undefined) process.env.ANTHROPIC_API_KEY = forrige;
  }
});
