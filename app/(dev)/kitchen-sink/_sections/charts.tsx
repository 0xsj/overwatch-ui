import {
  BipartiteNetwork, BubblePlot, CircularNetwork, CliqueNetwork, ColourBar,
  CorrelationNetwork, EnrichmentMap, FlowNetwork, ForceNetwork, HairballNetwork,
  Legend, Matrix, ModuleNetwork, MultipartiteNetwork, NothingKey, RadialNetwork,
  RankedBar, Volcano, categorical, coverageOf, type Cell,
} from "@/components/charts";
import { Text } from "@/components/typography";
import { Case, Row, Section } from "../_components/section";
import { readSources } from "../_lib/source";

/* Deterministic fixtures. `Math.random` would make every render a different
   picture, which is exactly the property the layouts are built to avoid — a
   demo that reshuffles cannot show that the layout does not.

   Warmed by three steps before the first value is handed out. A bare LCG
   returns `seed * a mod m / m` first, which for a small seed is a small number
   — the matrix below seeded from string lengths and every cell came back under
   0.22, so the whole grid rendered `unattempted` and the coverage ratio said
   0%. The chart was right and the fixture was lying to it. */
const rnd = (seed: number) => {
  /* mulberry32, and NOT the LCG this was. `Math.imul(s, 48271) % 2147483647`
     returns a signed intermediate, so it goes negative and stays there — every
     value after that was below zero, `Math.floor(r() * n)` produced negative
     indices, and the renderer silently skipped every edge pointing at a node
     that did not exist. The demo graphs were missing about half their edges and
     nothing said so. */
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** A hash, not a length. Two strings the same length are not the same string,
 *  and seeding from `.length` gave the matrix five identical columns. */
const hash = (text: string) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const volcano = (() => {
  const r = rnd(7);
  return Array.from({ length: 240 }, (_, i) => {
    const x = (r() - 0.5) * 7;
    return { id: `g${i}`, x, y: Math.abs(x) * r() * 1.5 + r() * 0.6, label: `GENE${i}` };
  });
})();

const bubbles = (() => {
  const r = rnd(11);
  const cats = ["KEGG", "Reactome", "GO"];
  return Array.from({ length: 26 }, (_, i) => ({
    id: `t${i}`, x: (r() - 0.4) * 5, y: r() * 4,
    weight: Math.round(r() * 90) + 8, category: cats[i % 3], label: `term ${i}`,
  }));
})();

const bars = [
  { id: "alb", label: "ALB", value: 148 }, { id: "il6", label: "IL6", value: 141 },
  { id: "tnf", label: "TNF", value: 139 }, { id: "ins", label: "INS", value: 132 },
  { id: "akt1", label: "AKT1", value: 128 }, { id: "il1b", label: "IL1B", value: 121 },
  { id: "vegfa", label: "VEGFA", value: 118 }, { id: "tp53", label: "TP53", value: 112 },
  { id: "jun", label: "JUN", value: 108 }, { id: "tlr4", label: "TLR4", value: 101 },
];

const ASSETS = ["assets.example", "cdn.example", "legacy.example", "198.51.100.0/24", "AS64511", "*.example"];
const CHECKS = ["TLS expiry", "open ports", "subdomains", "WHOIS", "headers"];
const cell = (row: string, column: string): Cell => {
  // An ASN has no TLS certificate — decisions/0011's own worked example, and
  // the reason the `na` state exists at all.
  if (row.startsWith("AS") && (column === "TLS expiry" || column === "headers")) return { state: "na" };
  if (row.includes("/24") && column === "TLS expiry") return { state: "na" };
  const r = rnd(hash(`${row}|${column}`))();
  if (r < 0.22) return { state: "unattempted" };
  if (r < 0.38) return { state: "absent" };
  return { state: "value", value: Math.round(r * 100) };
};

const net = (n: number, seed: number, extra = 1.6) => {
  const r = rnd(seed);
  const nodes = Array.from({ length: n }, (_, i) => ({
    id: `n${i}`, label: `N${i}`, group: i % 3, size: 5 + Math.round(r() * 4),
    fill: categorical(i % 4),
  }));
  const edges = Array.from({ length: Math.round(n * extra) }, () => {
    const a = Math.floor(r() * n);
    const b = Math.floor(r() * n);
    return { from: `n${a}`, to: `n${b === a ? (b + 1) % n : b}` };
  });
  return { nodes, edges };
};

const star = (() => {
  const r = rnd(5);
  const nodes: { id: string; label: string; size: number; fill: string | null }[] =
    [{ id: "root", label: "Northbeam", size: 10, fill: "var(--chart-3)" }];
  const edges: { from: string; to: string }[] = [];
  for (let i = 0; i < 12; i++) {
    nodes.push({ id: `a${i}`, label: `hop1-${i}`, size: 5, fill: categorical(0) });
    edges.push({ from: "root", to: `a${i}` });
    if (r() > 0.55) {
      nodes.push({ id: `b${i}`, label: `hop2-${i}`, size: 4, fill: categorical(1) });
      edges.push({ from: `a${i}`, to: `b${i}` });
    }
  }
  return { nodes, edges };
})();

const bipartite = {
  nodes: [
    ...["lovastatin", "luteolin", "ICI", "cyclovalone"].map((l, i) => ({
      id: `c${i}`, label: l, group: 0, shape: "hexagon" as const, fill: categorical(2),
    })),
    ...["CD14", "NOD2", "CYP1", "TLR4"].map((l, i) => ({
      id: `t${i}`, label: l, group: 1, shape: "square" as const, fill: categorical(0),
    })),
  ],
  edges: [
    { from: "c0", to: "t0" }, { from: "c1", to: "t0" }, { from: "c1", to: "t2" },
    { from: "c2", to: "t1" }, { from: "c3", to: "t3" }, { from: "c0", to: "t3" },
  ],
};

const correlation = (() => {
  const r = rnd(23);
  const ids = ["METTL3", "METTL14", "YTHDF1", "YTHDF2", "IGF2BP1", "RBMX", "CPSF1", "PCF11"];
  const nodes = ids.map((id, i) => ({ id, label: id, size: 6, fill: categorical(i % 4) }));
  const edges: { from: string; to: string; signed: number }[] = [];
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++) {
      const v = r() * 2 - 1;
      if (Math.abs(v) > 0.45) edges.push({ from: ids[i], to: ids[j], signed: v });
    }
  return { nodes, edges };
})();

export async function ChartsSection() {
  const sources = await readSources([
    "charts/matrix.tsx",
    "charts/graph-frame/graph-frame.tsx",
    "charts/_kernel/layout.ts",
  ]);
  const coverage = coverageOf(ASSETS, CHECKS, cell);

  return (
    <Section
      id="charts"
      title="Charts"
      blurb="Two frames, six layouts and four encodings, wearing sixteen names. Every colour here was computed rather than chosen — the categorical palette caps at four because that is where all-pairs separation stops passing, and the fifth category folds into `other` rather than taking a fifth hue."
    >
      <Case title="Volcano" note="effect against significance; three states and grey is one of them" sources={sources}>
        <Volcano points={volcano} labelled={["g3", "g17", "g44"]} title="Differential expression" />
      </Case>

      <Case title="Bubble plot" note="area is the third variable, and it is AREA not radius" sources={sources}>
        <BubblePlot bubbles={bubbles} xLabel="enrichment" yLabel="−log₁₀ q" categories={["KEGG", "Reactome", "GO"]} />
        <Legend items={[
          { label: "KEGG", fill: categorical(0) }, { label: "Reactome", fill: categorical(1) },
          { label: "GO", fill: categorical(2) },
        ]} />
      </Case>

      <Case title="Ranked bar" note="sorted by the component, because the order is the finding" sources={sources}>
        <RankedBar bars={bars} yLabel="degree" />
      </Case>

      <Case
        title="Matrix"
        note="the one with a caller — three kinds of nothing, and `n/a` is excluded from the ratio"
        sources={sources}
      >
        <Matrix rows={ASSETS} columns={CHECKS} cell={cell} ramp="sequential" title="Coverage" />
        <NothingKey />
        <Row label="ratio">
          <Text as="span" size="xs" tone="quiet">
            {coverage
              ? `${coverage.checked} of ${coverage.applicable} applicable · ${(coverage.ratio * 100).toFixed(0)}%`
              : "– nothing applicable"}
            {" — the three n/a cells are in neither half of that fraction."}
          </Text>
        </Row>
      </Case>

      <Case title="Colour bar" note="stepped, not a gradient — the eye resolves about seven levels" sources={sources}>
        <Row label="sequential"><ColourBar kind="sequential" domain={[0, 100]} label="coverage %" /></Row>
        <Row label="diverging"><ColourBar kind="diverging" domain={[-1, 1]} label="correlation" /></Row>
      </Case>

      <Case title="Force network" note="position is a hint, and the layout is seeded so it never reshuffles" sources={sources}>
        <ForceNetwork {...net(70, 3, 1.9)} width={520} height={360} labels={false} />
      </Case>

      <Case title="Radial network" note="the ring IS hops from the centre — the only layout you can read off" sources={sources}>
        <RadialNetwork {...star} rootId="root" width={520} height={340} />
      </Case>

      <Case title="Circular network" note="position means nothing, and nothing is ever hidden" sources={sources}>
        <CircularNetwork {...net(18, 9, 1.3)} width={420} height={340} />
      </Case>

      <Case title="Bipartite" note="shape carries the class, so it survives being printed" sources={sources}>
        <BipartiteNetwork {...bipartite} width={420} height={260} groupOrder={[0, 1]} />
      </Case>

      <Case title="Multipartite" note="the same function with more tiers" sources={sources}>
        <MultipartiteNetwork
          nodes={net(21, 13).nodes}
          edges={net(21, 13).edges}
          groupOrder={[0, 1, 2]}
          width={460}
          height={300}
        />
      </Case>

      <Case title="Flow" note="columns by longest path; the only layout with no trigonometry in it" sources={sources}>
        <FlowNetwork
          nodes={[
            { id: "subfinder", label: "subfinder", size: 7, fill: categorical(0) },
            { id: "httpx", label: "httpx", size: 6, fill: categorical(0) },
            { id: "tlsx", label: "tlsx", size: 6, fill: categorical(1) },
            { id: "naabu", label: "naabu", size: 6, fill: categorical(1) },
            { id: "nuclei", label: "nuclei", size: 7, fill: categorical(3) },
          ]}
          edges={[
            { from: "subfinder", to: "httpx" }, { from: "subfinder", to: "tlsx" },
            { from: "subfinder", to: "naabu" }, { from: "httpx", to: "nuclei" },
          ]}
          width={460}
          height={220}
        />
      </Case>

      <Case title="Clique" note="density is the result; circular makes every edge visible" sources={sources}>
        <CliqueNetwork {...net(9, 31, 3.4)} width={360} height={300} />
      </Case>

      <Case title="Hairball" note="labels off — at this density they are a grey wash" sources={sources}>
        <HairballNetwork {...net(140, 17, 3.2)} width={520} height={380} />
        <Text size="xs" tone="quiet">
          Legible as a texture, not a structure. Which is why the atlas always prints it beside a
          ranked bar chart — the bar chart is the finding, extracted because the picture cannot
          carry it.
        </Text>
      </Case>

      <Case title="Enrichment map" note="hulls are an annotation layer, drawn and named by a person" sources={sources}>
        <EnrichmentMap
          {...net(46, 41, 1.5)}
          width={520}
          height={360}
          hulls={[
            { ids: ["n0", "n1", "n2", "n3", "n4"], label: "axon guidance" },
            { ids: ["n10", "n11", "n12", "n13"], label: "lipid metabolism", fill: "var(--chart-2)" },
          ]}
        />
      </Case>

      <Case title="Module network" note="rings around the parts worth naming; the nodes were already there" sources={sources}>
        <ModuleNetwork
          {...net(64, 53, 2.0)}
          width={520}
          height={360}
          hulls={[{ ids: ["n2", "n5", "n8", "n11"], label: "cluster 1", fill: "var(--chart-4)" }]}
        />
      </Case>

      <Case title="Correlation network" note="hue is the sign; a missing edge is below the cut, not a zero" sources={sources}>
        <CorrelationNetwork {...correlation} width={420} height={300} />
        <Legend items={[
          { label: "positive", fill: "var(--chart-pos)" },
          { label: "negative", fill: "var(--chart-neg)" },
        ]} />
      </Case>
    </Section>
  );
}
