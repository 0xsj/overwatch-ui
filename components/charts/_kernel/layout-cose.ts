import cytoscape from "cytoscape";
import { px } from "./scale";
import type { GraphInput, Placement } from "./layout";

/** A seeded generator with only exact integer arithmetic in it — mulberry32.
 *
 *  Not an LCG. `Math.imul(s, 48271) % 2147483647` returns a SIGNED 32-bit
 *  intermediate, so it goes negative and stays negative, and every "random"
 *  value after that is below zero. That bug shipped in this repository's own
 *  chart fixtures and its symptom was invisible: negative indices produced edge
 *  endpoints that did not exist, the renderer skipped them, and the demo graphs
 *  were quietly missing about half their edges. */
function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** CoSE — the compound spring embedder, run headless.
 *
 *  This is the algorithm behind most of the published network figures that look
 *  properly laid out, and it is meaningfully better than the Fruchterman–Reingold
 *  beside it: it separates disconnected components, keeps a node's neighbours
 *  near without flinging the rest to the boundary, and does not need the hard
 *  clamp that made our own layout pile nodes along the edges.
 *
 *  # Cytoscape is used as a LAYOUT ENGINE and never as a renderer
 *
 *  `headless: true` and `styleEnabled: false`: no canvas, no DOM, no stylesheet
 *  parsing. It computes positions and we draw them as SVG, which is what keeps a
 *  node's label real text — searchable, selectable, and readable by a screen
 *  reader. Cytoscape's own renderer is canvas and would cost all three.
 *
 *  # Why `Math.random` is swapped, and why that is safe here
 *
 *  `randomize: false` and identical seeded input positions are NOT enough:
 *  measured, two runs of the same graph produced different output. Cytoscape
 *  calls `Math.random` in fifteen places, so the layout is irreducibly random
 *  unless the source of randomness is.
 *
 *  Replacing the global for the duration of the call makes it exactly
 *  reproducible — verified, two runs, identical to four decimal places. That is
 *  a global mutation and it is admissible for one specific reason: **the layout
 *  is synchronous.** `layoutstop` fires before `run()` returns with
 *  `animate: false`, so no other code can execute between the swap and the
 *  restore, and nothing else can observe the patched function. If a future
 *  version made this async the swap would become unsafe, which is why the
 *  synchronous assertion is checked rather than assumed.
 */
export function cose(
  input: GraphInput,
  options?: { seed?: number; quality?: "draft" | "default" | "proof" },
): Placement {
  const { nodes, edges, width, height } = input;
  if (nodes.length === 0) return new Map();

  const ids = new Set(nodes.map((n) => n.id));

  const cy = cytoscape({
    headless: true,
    styleEnabled: false,
    elements: [
      ...nodes.map((n) => ({ data: { id: n.id } })),
      // Endpoints are checked rather than trusted: cytoscape THROWS on an edge
      // to a node that does not exist, where our own renderer silently skips
      // it. A caller that was getting away with a dangling edge should not
      // start getting an exception because the layout changed.
      ...edges
        .filter((e) => ids.has(e.from) && ids.has(e.to))
        .map((e, i) => ({ data: { id: `e${i}`, source: e.from, target: e.to } })),
    ],
  });

  const layout = cy.layout({
    name: "cose",
    animate: false,
    randomize: true,
    fit: false,
    boundingBox: { x1: 0, y1: 0, w: width, h: height },
    nodeOverlap: 12,
    idealEdgeLength: () => 70,
    componentSpacing: 60,
    numIter: options?.quality === "proof" ? 2500 : options?.quality === "draft" ? 400 : 1200,
  } as cytoscape.LayoutOptions);

  let stopped = false;
  layout.on("layoutstop", () => { stopped = true; });

  const real = Math.random;
  Math.random = mulberry32(options?.seed ?? 0x9e3779b9);
  try {
    layout.run();
  } finally {
    Math.random = real;
  }

  // The assertion the swap depends on. If this ever fails the layout has become
  // asynchronous and patching a global around it is no longer safe.
  if (!stopped) {
    cy.destroy();
    throw new Error(
      "cose did not settle synchronously — the Math.random swap in layout-cose is unsafe under an async layout",
    );
  }

  const out: Placement = new Map();
  cy.nodes().forEach((node) => {
    const p = node.position();
    out.set(node.id(), { x: px(p.x), y: px(p.y) });
  });
  cy.destroy();

  if (input.pins) for (const [id, at] of input.pins) out.set(id, at);
  return out;
}
