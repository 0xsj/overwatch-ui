import { px } from "./scale";

export type Point = { x: number; y: number };
export type Placement = Map<string, Point>;

export type GraphInput = {
  nodes: readonly { id: string; group?: string | number }[];
  edges: readonly { from: string; to: string }[];
  /** Positions somebody dragged. A pin wins outright — it is a constraint
   *  stated by a person, and a layout that overrides it has thrown away the
   *  only input it could not compute. */
  pins?: ReadonlyMap<string, Point>;
  width: number;
  height: number;
};

const applyPins = (out: Placement, pins?: ReadonlyMap<string, Point>) => {
  if (pins) for (const [id, at] of pins) out.set(id, at);
  return out;
};

/* ─── adjacency, shared ───────────────────────────────────────────────────── */

export function neighbours(input: GraphInput): Map<string, string[]> {
  const near = new Map<string, string[]>(input.nodes.map((n) => [n.id, []]));
  for (const e of input.edges) {
    near.get(e.from)?.push(e.to);
    near.get(e.to)?.push(e.from);
  }
  return near;
}

/** Hops from a root, by breadth. Edges walked in BOTH directions — a directed
 *  walk strands everything upstream at infinity, which is a layout bug that
 *  looks like a data bug. */
export function hopsFrom(input: GraphInput, rootId: string): Map<string, number> {
  const near = neighbours(input);
  const depth = new Map<string, number>([[rootId, 0]]);
  let frontier = [rootId];
  while (frontier.length) {
    const next: string[] = [];
    for (const id of frontier)
      for (const other of near.get(id) ?? []) {
        if (depth.has(other)) continue;
        depth.set(other, (depth.get(id) ?? 0) + 1);
        next.push(other);
      }
    frontier = next;
  }
  const unreached = Math.max(0, ...depth.values()) + 1;
  for (const n of input.nodes) if (!depth.has(n.id)) depth.set(n.id, unreached);
  return depth;
}

/* ─── deterministic pseudo-random ─────────────────────────────────────────── */

/** A hash of the id, not `Math.random`.
 *
 *  This is what makes the force layout below admissible. `STACK.md` refuses a
 *  graph library because *"a library buys a physics simulation nobody asked for
 *  — the picture reshuffles on re-render and two people cannot describe the
 *  same node"*. That objection is to NON-DETERMINISM and not to physics: seed
 *  from the node's own id and run a fixed number of iterations, and the same
 *  graph settles identically every time, on every machine.
 *
 *  FNV-1a, because it is eight lines and its avalanche is good enough that two
 *  adjacent ids do not start on top of each other. */
function seedOf(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

/* ─── the six layouts ─────────────────────────────────────────────────────── */

/** Fruchterman–Reingold, seeded and capped.
 *
 *  Fixed iterations rather than a settling threshold, so the cost is bounded and
 *  known: this is O(iterations x n²) and the n² is a real ceiling — see the
 *  family's `doc.ts` for where it stops being acceptable.
 *
 *  # Not one implementation-defined function in the loop, and that is required
 *
 *  ECMAScript leaves `hypot`, `cos`, `sin`, `exp` and `log` to the
 *  implementation, so Node's V8 and the browser's disagree in the last bit. In a
 *  single-shot layout that is invisible and quantising the output hides it. A
 *  force simulation is CHAOTIC: a one-ULP difference in iteration 1 is amplified
 *  by 220 iterations of feedback, and this drew nodes five pixels apart on the
 *  server and the client — a hydration mismatch that no amount of rounding at
 *  the end could fix.
 *
 *  So the distance is `sqrt(dx*dx + dy*dy)` and not `Math.hypot`, and the
 *  seeding is arithmetic on a hash rather than a point on a circle. `sqrt`, and
 *  `+ - * /`, are exactly specified by IEEE-754; every browser and every Node
 *  computes the same bits. Measured, after the change: identical output.
 */
export function force(input: GraphInput, options?: { iterations?: number }): Placement {
  const { nodes, edges, width, height } = input;
  const n = Math.max(1, nodes.length);
  const iterations = options?.iterations ?? 220;
  const area = width * height;
  const k = Math.sqrt(area / n) * 0.72;

  // Seeded from two independent hashes rather than an angle and a radius: a
  // point on a circle needs `cos`/`sin`, and those are the functions this loop
  // cannot contain.
  const pos = new Map<string, Point>(
    nodes.map((node) => [
      node.id,
      {
        x: width * (0.2 + seedOf(`${node.id}:x`) * 0.6),
        y: height * (0.2 + seedOf(`${node.id}:y`) * 0.6),
      },
    ]),
  );

  const ids = nodes.map((x) => x.id);
  let temperature = Math.min(width, height) * 0.1;
  const cool = temperature / (iterations + 1);

  for (let step = 0; step < iterations; step++) {
    const disp = new Map<string, Point>(ids.map((id) => [id, { x: 0, y: 0 }]));

    // Repulsion, every pair. The n² term.
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = pos.get(ids[i])!;
        const b = pos.get(ids[j])!;
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let d = Math.sqrt(dx * dx + dy * dy);
        if (d < 0.01) {
          // Two nodes exactly on top of each other have no direction to
          // separate in. Nudge deterministically rather than randomly.
          dx = (seedOf(ids[i]) - 0.5) * 0.1;
          dy = (seedOf(ids[j]) - 0.5) * 0.1;
          d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        }
        const f = (k * k) / d;
        const da = disp.get(ids[i])!;
        const db = disp.get(ids[j])!;
        da.x += (dx / d) * f; da.y += (dy / d) * f;
        db.x -= (dx / d) * f; db.y -= (dy / d) * f;
      }
    }

    // Attraction, along edges.
    for (const e of edges) {
      const a = pos.get(e.from);
      const b = pos.get(e.to);
      if (!a || !b) continue;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const f = (d * d) / k;
      const da = disp.get(e.from)!;
      const db = disp.get(e.to)!;
      da.x -= (dx / d) * f; da.y -= (dy / d) * f;
      db.x += (dx / d) * f; db.y += (dy / d) * f;
    }

    for (const id of ids) {
      const p = pos.get(id)!;
      const d = disp.get(id)!;
      const len = Math.sqrt(d.x * d.x + d.y * d.y) || 1;
      p.x += (d.x / len) * Math.min(len, temperature);
      p.y += (d.y / len) * Math.min(len, temperature);
      p.x = Math.max(12, Math.min(width - 12, p.x));
      p.y = Math.max(12, Math.min(height - 12, p.y));
    }
    temperature -= cool;
  }

  const out: Placement = new Map(
    [...pos].map(([id, p]) => [id, { x: px(p.x), y: px(p.y) }]),
  );
  return applyPins(out, input.pins);
}

/** Concentric rings by hop distance from a root. Position is an ANSWER here —
 *  the ring is the distance — which is the one thing a force layout cannot say. */
export function concentric(input: GraphInput, rootId: string): Placement {
  const depth = hopsFrom(input, rootId);
  const rings = new Map<number, string[]>();
  for (const n of input.nodes) {
    if (n.id === rootId) continue;
    const d = depth.get(n.id) ?? 1;
    if (!rings.has(d)) rings.set(d, []);
    rings.get(d)!.push(n.id);
  }

  const cx = input.width / 2;
  const cy = input.height / 2;
  const out: Placement = new Map([[rootId, { x: px(cx), y: px(cy) }]]);

  let inner = 0;
  for (const [ring, ids] of [...rings].sort((a, b) => a[0] - b[0])) {
    // The ring grows to fit its own contents. A fixed radius puts thirteen
    // labels on ninety pixels of arc each and they collide.
    const needed = (ids.length * 62) / (Math.PI * 2);
    const radius = Math.max(70, needed, inner + 62);
    inner = radius;
    const stepAngle = (Math.PI * 2) / ids.length;
    // Half a step of turn on alternate rings, so ring two sits in ring one's
    // gaps rather than directly behind it.
    const turn = ring % 2 === 0 ? stepAngle / 2 : 0;
    ids.forEach((id, i) => {
      const a = i * stepAngle + turn;
      out.set(id, { x: px(cx + Math.cos(a) * radius), y: px(cy + Math.sin(a) * radius * 0.82) });
    });
  }
  return applyPins(out, input.pins);
}

/** Every node on one circle, edges as chords across it. Position carries
 *  NOTHING — what it buys is that no node is ever hidden behind another, which
 *  is the whole reason to reach for it. */
export function circular(input: GraphInput): Placement {
  const { nodes, width, height } = input;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - 26;
  const stepAngle = (Math.PI * 2) / Math.max(1, nodes.length);
  const out: Placement = new Map();
  nodes.forEach((node, i) => {
    const a = i * stepAngle - Math.PI / 2;
    out.set(node.id, { x: px(cx + Math.cos(a) * radius), y: px(cy + Math.sin(a) * radius) });
  });
  return applyPins(out, input.pins);
}

/** Tiers, left to right. Two groups is bipartite; more is multipartite, and it
 *  is the same function — the difference is only how many distinct groups the
 *  data has, which is the atlas's point about those two being one family. */
export function tiered(input: GraphInput, order?: readonly (string | number)[]): Placement {
  const { nodes, width, height } = input;
  const groups = new Map<string | number, string[]>();
  for (const n of nodes) {
    const g = n.group ?? 0;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(n.id);
  }
  const keys = order ? [...order].filter((k) => groups.has(k)) : [...groups.keys()];
  const columns = Math.max(1, keys.length);
  const out: Placement = new Map();
  keys.forEach((key, col) => {
    const ids = groups.get(key)!;
    const x = columns === 1 ? width / 2 : 28 + (col * (width - 56)) / (columns - 1);
    ids.forEach((id, i) => {
      const y = ((i + 1) * height) / (ids.length + 1);
      out.set(id, { x: px(x), y: px(y) });
    });
  });
  return applyPins(out, input.pins);
}

/** Columns by longest path from a source. Deterministic, and the only layout
 *  here with no trigonometry in it at all — which is why the pipeline canvas
 *  uses it and cannot have the hydration bug the others are quantised against. */
export function columns(input: GraphInput): Placement {
  const incoming = new Map<string, string[]>(input.nodes.map((n) => [n.id, []]));
  for (const e of input.edges) incoming.get(e.to)?.push(e.from);

  const depth = new Map<string, number>();
  const seen = new Set<string>();
  const walk = (id: string): number => {
    const known = depth.get(id);
    if (known !== undefined) return known;
    if (seen.has(id)) return 0;
    seen.add(id);
    const from = incoming.get(id) ?? [];
    // LONGEST path, not shortest: shortest puts a node beside the thing that
    // feeds it whenever a second, longer route also reaches it, and an edge
    // then points backwards.
    const d = from.length === 0 ? 0 : Math.max(...from.map(walk)) + 1;
    depth.set(id, d);
    return d;
  };
  for (const n of input.nodes) walk(n.id);

  const byColumn = new Map<number, string[]>();
  for (const n of input.nodes) {
    const d = depth.get(n.id) ?? 0;
    if (!byColumn.has(d)) byColumn.set(d, []);
    byColumn.get(d)!.push(n.id);
  }
  const cols = Math.max(1, byColumn.size);
  const out: Placement = new Map();
  for (const [d, ids] of byColumn) {
    const x = cols === 1 ? input.width / 2 : 28 + (d * (input.width - 56)) / (cols - 1);
    ids.forEach((id, i) => {
      out.set(id, { x: px(x), y: px(((i + 1) * input.height) / (ids.length + 1)) });
    });
  }
  return applyPins(out, input.pins);
}

/** A plain grid. Not in the atlas as a figure, and it is here because it is the
 *  honest fallback: when a layout would say nothing, saying nothing in rows is
 *  better than saying nothing in a shape that implies meaning. */
export function grid(input: GraphInput): Placement {
  const { nodes, width, height } = input;
  const cols = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
  const rows = Math.max(1, Math.ceil(nodes.length / cols));
  const out: Placement = new Map();
  nodes.forEach((node, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    out.set(node.id, {
      x: px(((c + 1) * width) / (cols + 1)),
      y: px(((r + 1) * height) / (rows + 1)),
    });
  });
  return applyPins(out, input.pins);
}

export const LAYOUTS = [
  "cose", "force", "concentric", "circular", "tiered", "columns", "grid",
] as const;
export type LayoutName = (typeof LAYOUTS)[number];
