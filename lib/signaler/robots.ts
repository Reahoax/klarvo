// Etape 8 (Spec.md "4B. OSINT"): "Respektér robots.txt på alle sites. Byg det
// ind, spørg ikke." Simpel, men standardnær robots.txt-fortolker - kun
// User-agent/Allow/Disallow forstås (Sitemap, Crawl-delay m.v. ignoreres
// bevidst, da vi ikke bruger dem). Ved flere matchende regler vinder den
// LÆNGSTE sti-præfiks, samme konvention som Googles egen robots.txt-parser.

export type RobotsRegel = { type: "allow" | "disallow"; sti: string };
export type RobotsRegelsaet = Map<string, RobotsRegel[]>;

export function parseRobotsTxt(indhold: string): RobotsRegelsaet {
  const regelsaet: RobotsRegelsaet = new Map();
  let aktiveAgenter: string[] = [];
  let sidstVarUserAgent = false;

  for (const raaLinje of indhold.split("\n")) {
    const linje = raaLinje.split("#")[0].trim();
    if (!linje) continue;

    const skilleIndex = linje.indexOf(":");
    if (skilleIndex === -1) continue;
    const noegle = linje.slice(0, skilleIndex).trim().toLowerCase();
    const vaerdi = linje.slice(skilleIndex + 1).trim();

    if (noegle === "user-agent") {
      if (!sidstVarUserAgent) aktiveAgenter = [];
      const agent = vaerdi.toLowerCase();
      aktiveAgenter.push(agent);
      if (!regelsaet.has(agent)) regelsaet.set(agent, []);
      sidstVarUserAgent = true;
    } else if (noegle === "disallow" || noegle === "allow") {
      sidstVarUserAgent = false;
      for (const agent of aktiveAgenter) {
        regelsaet.get(agent)!.push({ type: noegle, sti: vaerdi });
      }
    } else {
      sidstVarUserAgent = false;
    }
  }

  return regelsaet;
}

function findMestSpecifikkeAgent(regelsaet: RobotsRegelsaet, userAgent: string): string | null {
  const ua = userAgent.toLowerCase();
  for (const agent of regelsaet.keys()) {
    if (agent !== "*" && agent.length > 0 && ua.includes(agent)) return agent;
  }
  return regelsaet.has("*") ? "*" : null;
}

// Ingen matchende gruppe i robots.txt betyder tilladt (robots.txt-standardens
// egen fallback) - kun en eksplicit Disallow-regel forbyder noget.
export function erTilladt(regelsaet: RobotsRegelsaet, userAgent: string, sti: string): boolean {
  const agent = findMestSpecifikkeAgent(regelsaet, userAgent);
  if (agent === null) return true;

  const regler = regelsaet.get(agent)!;
  let bedsteMatch: RobotsRegel | null = null;
  for (const regel of regler) {
    if (regel.sti === "") continue; // "Disallow:" uden værdi betyder "intet forbudt"
    if (sti.startsWith(regel.sti) && (!bedsteMatch || regel.sti.length > bedsteMatch.sti.length)) {
      bedsteMatch = regel;
    }
  }
  return !bedsteMatch || bedsteMatch.type === "allow";
}
