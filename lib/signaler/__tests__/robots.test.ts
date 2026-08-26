import test from "node:test";
import assert from "node:assert/strict";
import { parseRobotsTxt, erTilladt } from "../robots.ts";

test("ingen robots.txt-regler overhovedet giver tilladt", () => {
  const regelsaet = parseRobotsTxt("");
  assert.equal(erTilladt(regelsaet, "Klarvo", "/"), true);
});

test("Disallow: / under * forbyder alt for alle", () => {
  const regelsaet = parseRobotsTxt(`
User-agent: *
Disallow: /
`);
  assert.equal(erTilladt(regelsaet, "Klarvo", "/"), false);
  assert.equal(erTilladt(regelsaet, "Klarvo", "/om-os"), false);
});

test("Disallow: (tom værdi) betyder intet er forbudt", () => {
  const regelsaet = parseRobotsTxt(`
User-agent: *
Disallow:
`);
  assert.equal(erTilladt(regelsaet, "Klarvo", "/hemmeligt"), true);
});

test("specifik sti forbydes, resten af sitet er tilladt", () => {
  const regelsaet = parseRobotsTxt(`
User-agent: *
Disallow: /admin
`);
  assert.equal(erTilladt(regelsaet, "Klarvo", "/admin/login"), false);
  assert.equal(erTilladt(regelsaet, "Klarvo", "/om-os"), true);
});

test("længste matchende sti vinder (Allow overtrumfer en bredere Disallow)", () => {
  const regelsaet = parseRobotsTxt(`
User-agent: *
Disallow: /karriere
Allow: /karriere/aabne-stillinger
`);
  assert.equal(erTilladt(regelsaet, "Klarvo", "/karriere/hr"), false);
  assert.equal(erTilladt(regelsaet, "Klarvo", "/karriere/aabne-stillinger"), true);
});

test("en navngivet user-agent-gruppe bruges frem for *, når den matcher", () => {
  const regelsaet = parseRobotsTxt(`
User-agent: *
Disallow:

User-agent: Klarvo
Disallow: /
`);
  assert.equal(erTilladt(regelsaet, "Klarvo-signalindsamling", "/"), false);
  assert.equal(erTilladt(regelsaet, "AndenBot", "/"), true);
});

test("flere User-agent-linjer i træk deler samme regler", () => {
  const regelsaet = parseRobotsTxt(`
User-agent: BotA
User-agent: BotB
Disallow: /
`);
  assert.equal(erTilladt(regelsaet, "BotA", "/"), false);
  assert.equal(erTilladt(regelsaet, "BotB", "/"), false);
});

test("kommentarer og ukendte direktiver ignoreres uden at fejle", () => {
  const regelsaet = parseRobotsTxt(`
# Dette er en kommentar
Sitemap: https://eksempel.dk/sitemap.xml
Crawl-delay: 10
User-agent: *
Disallow: /privat
`);
  assert.equal(erTilladt(regelsaet, "Klarvo", "/privat"), false);
  assert.equal(erTilladt(regelsaet, "Klarvo", "/offentligt"), true);
});
