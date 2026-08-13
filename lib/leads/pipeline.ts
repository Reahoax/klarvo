// Delt mellem leadtabellen (kolonne + Kanban-visning) og detaljevisningen
// (klikbar statuslinje), så pipeline-stadierne kun er defineret ét sted.
export const PIPELINE_STADIER = [
  "ny",
  "kvalificering",
  "godkendt",
  "ringeliste",
  "lukket",
] as const;

export type PipelineStadie = (typeof PIPELINE_STADIER)[number];

export const PIPELINE_LABEL: Record<string, string> = {
  ny: "Ny",
  kvalificering: "Kvalificering",
  godkendt: "Godkendt",
  ringeliste: "Ringeliste",
  lukket: "Lukket",
};

export const PIPELINE_FARVE: Record<string, string> = {
  ny: "bg-tekst-daempet",
  kvalificering: "bg-accent",
  godkendt: "bg-godkendt",
  ringeliste: "bg-advarsel",
  lukket: "bg-tekst-daempet/50",
};
