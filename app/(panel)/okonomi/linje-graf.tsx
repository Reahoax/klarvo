// Simpel, afhængighedsfri SVG-linjegraf (intet chart-bibliotek installeret,
// og datamængden her er lille nok til at det ikke er nødvendigt). Viser
// indtægt/omkostning pr. måned ud fra faktisk loggede økonomiposter.
export function LinjeGraf({
  punkter,
}: {
  punkter: { label: string; indtaegt: number; omkostning: number }[];
}) {
  const bredde = 700;
  const hoejde = 180;
  const margin = { top: 10, bund: 24, side: 8 };
  const maks = Math.max(1, ...punkter.map((p) => Math.max(p.indtaegt, p.omkostning)));

  const x = (i: number) =>
    punkter.length > 1
      ? margin.side + (i / (punkter.length - 1)) * (bredde - margin.side * 2)
      : bredde / 2;
  const y = (v: number) =>
    hoejde - margin.bund - (v / maks) * (hoejde - margin.top - margin.bund);

  const linje = (nøgle: "indtaegt" | "omkostning") =>
    punkter.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p[nøgle])}`).join(" ");

  return (
    <svg viewBox={`0 0 ${bredde} ${hoejde}`} className="w-full" role="img" aria-label="Indtægt og omkostning pr. måned">
      <line
        x1={margin.side}
        y1={hoejde - margin.bund}
        x2={bredde - margin.side}
        y2={hoejde - margin.bund}
        className="stroke-kant"
        strokeWidth={1}
      />

      <path d={linje("indtaegt")} fill="none" className="stroke-godkendt" strokeWidth={2} />
      <path d={linje("omkostning")} fill="none" className="stroke-spaerret" strokeWidth={2} />

      {punkter.map((p, i) => (
        <g key={p.label}>
          <circle cx={x(i)} cy={y(p.indtaegt)} r={3} className="fill-godkendt" />
          <circle cx={x(i)} cy={y(p.omkostning)} r={3} className="fill-spaerret" />
          <text
            x={x(i)}
            y={hoejde - 6}
            textAnchor="middle"
            className="fill-tekst-daempet text-[10px]"
          >
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
