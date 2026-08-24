import test from "node:test";
import assert from "node:assert/strict";
import { matchLeadModIcp, type LeadTilMatching } from "../score.ts";

const grundlead: LeadTilMatching = {
  branchekode: "812100",
  antal_ansatte: 15,
  postnr: "8000",
  virksomhedsform: "ApS",
  maa_kontaktes: true,
};

test("spærret lead matcher aldrig, uanset ICP", () => {
  const resultat = matchLeadModIcp({ ...grundlead, maa_kontaktes: false }, { branchekoder: ["812100"] });
  assert.equal(resultat.matcher, false);
  assert.match(resultat.begrundelse, /spærret/);
});

test("kunde uden nogen ICP-kriterier giver intet match", () => {
  const resultat = matchLeadModIcp(grundlead, {});
  assert.equal(resultat.matcher, false);
  assert.match(resultat.begrundelse, /ingen ICP-kriterier/);
});

test("alle kriterier sat og opfyldt giver et match med fuld begrundelse", () => {
  const resultat = matchLeadModIcp(grundlead, {
    branchekoder: ["812100", "812900"],
    virksomhedsformer: ["ApS", "A/S"],
    postnumre: ["8000", "8200"],
    ansatte_fra: 10,
    ansatte_til: 40,
  });
  assert.equal(resultat.matcher, true);
  assert.match(resultat.begrundelse, /branchekode 812100 matcher/);
  assert.match(resultat.begrundelse, /15 ansatte er inden for intervallet/);
  assert.match(resultat.begrundelse, /postnummer 8000 matcher/);
  assert.match(resultat.begrundelse, /virksomhedsform ApS er tilladt/);
});

test("branchekode uden for ICP giver nul, uanset andre kriterier", () => {
  const resultat = matchLeadModIcp(grundlead, { branchekoder: ["999999"] });
  assert.equal(resultat.matcher, false);
  assert.match(resultat.begrundelse, /Branchekode/);
});

test("manglende branchekode på leadet giver nul, når kunden kræver det", () => {
  const resultat = matchLeadModIcp({ ...grundlead, branchekode: null }, { branchekoder: ["812100"] });
  assert.equal(resultat.matcher, false);
  assert.match(resultat.begrundelse, /mangler/);
});

test("for få ansatte giver nul", () => {
  const resultat = matchLeadModIcp(grundlead, { ansatte_fra: 20 });
  assert.equal(resultat.matcher, false);
  assert.match(resultat.begrundelse, /under kundens minimum/);
});

test("for mange ansatte giver nul", () => {
  const resultat = matchLeadModIcp(grundlead, { ansatte_til: 10 });
  assert.equal(resultat.matcher, false);
  assert.match(resultat.begrundelse, /over kundens maksimum/);
});

test("ukendt antal ansatte giver nul, når kunden har et interval", () => {
  const resultat = matchLeadModIcp({ ...grundlead, antal_ansatte: null }, { ansatte_fra: 10 });
  assert.equal(resultat.matcher, false);
  assert.match(resultat.begrundelse, /ukendt/);
});

test("postnummer uden for kundens område giver nul", () => {
  const resultat = matchLeadModIcp(grundlead, { postnumre: ["2100"] });
  assert.equal(resultat.matcher, false);
  assert.match(resultat.begrundelse, /geografiske område/);
});

test("virksomhedsform uden for kundens tilladte former giver nul", () => {
  const resultat = matchLeadModIcp(grundlead, { virksomhedsformer: ["A/S"] });
  assert.equal(resultat.matcher, false);
  assert.match(resultat.begrundelse, /tilladte former/);
});

test("virksomhedsform matcher uanset case (CVR-data gemmer 'APS', ICP-formular foreslår 'ApS')", () => {
  const resultat = matchLeadModIcp(
    { ...grundlead, virksomhedsform: "APS" },
    { virksomhedsformer: ["ApS"] }
  );
  assert.equal(resultat.matcher, true);
});

test("kun ét kriterie sat (branchekode) - resten af ICP'en begrænser ikke", () => {
  const resultat = matchLeadModIcp(grundlead, { branchekoder: ["812100"] });
  assert.equal(resultat.matcher, true);
  assert.equal(resultat.begrundelse, "branchekode 812100 matcher.");
});
