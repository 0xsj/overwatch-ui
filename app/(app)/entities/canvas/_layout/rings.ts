import type { Pin } from "@/lib/services/entities";
import type { ViewGraph } from "./graph";
import { snap, type Placement, type Point } from "./place";

/** How much arc one node needs before its LABEL collides with its neighbour's.
 *  The circle is small; the name under it is not, and a ring sized for the
 *  circles produces a legible diagram of illegible text. */
const ARC_PER_NODE = 150;

/** Radius of ring n, driven by how many nodes are ON it.
 *
 *  A fixed radius was the first version and it was wrong in the only case that
 *  matters: thirteen fragments on a 190px ring get ninety pixels of arc each and
 *  their labels overlap. So the ring grows to fit its own contents —
 *  `circumference = count x arc` — with a floor so a two-node ring does not
 *  collapse onto the root.
 *
 *  Each ring also clears the one inside it, because a ring computed only from
 *  its own count can come out smaller than its parent. */
function radiusOf(ring: number, count: number, inner: number): number {
  if (ring === 0) return 0;
  const needed = (count * ARC_PER_NODE) / (Math.PI * 2);
  return Math.max(190, needed, inner + 150);
}

/** Node diameters, by degree. Three sizes and not a continuous scale: a
 *  continuous one asks somebody to compare two circles that differ by four
 *  pixels, which nobody can do and which therefore encodes nothing. */
export const SIZE = { root: 76, hub: 56, node: 44, leaf: 36 } as const;

export function diameterOf(degree: number, isRoot: boolean): number {
  if (isRoot) return SIZE.root;
  if (degree >= 4) return SIZE.hub;
  if (degree >= 2) return SIZE.node;
  return SIZE.leaf;
}

/** How many edges touch each node. The size channel, and the only thing on this
 *  canvas that says "this fragment is load-bearing" without anybody asserting
 *  it — degree is counted, not claimed. */
export function degrees(graph: ViewGraph): Map<string, number> {
  const out = new Map<string, number>();
  const bump = (id: string) => out.set(id, (out.get(id) ?? 0) + 1);
  for (const e of graph.edges) {
    bump(e.from);
    bump(e.to);
  }
  return out;
}

/** Hops from the root, by breadth. Edges are walked in BOTH directions: an
 *  attribution points at the fragment and a derivation points away from what it
 *  was read out of, so following only `from → to` would strand half the graph
 *  at infinity.
 *
 *  A node no edge reaches gets the outermost ring rather than being dropped. It
 *  is in the graph because something returned it, and putting it nowhere would
 *  be the canvas deciding it does not count. */
export function hops(graph: ViewGraph): Map<string, number> {
  const near = new Map<string, string[]>();
  const link = (a: string, b: string) => {
    if (!near.has(a)) near.set(a, []);
    near.get(a)!.push(b);
  };
  for (const e of graph.edges) {
    link(e.from, e.to);
    link(e.to, e.from);
  }

  const depth = new Map<string, number>([[graph.root.id, 0]]);
  let frontier = [graph.root.id];
  while (frontier.length) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const other of near.get(id) ?? []) {
        if (depth.has(other)) continue;
        depth.set(other, (depth.get(id) ?? 0) + 1);
        next.push(other);
      }
    }
    frontier = next;
  }

  const unreached = Math.max(0, ...depth.values()) + 1;
  for (const node of graph.nodes) if (!depth.has(node.id)) depth.set(node.id, unreached);
  return depth;
}

/** Concentric by hop distance, so where a node sits is an answer rather than an
 *  arrangement: the ring IS how far it is from the root.
 *
 *  It replaced a golden-angle spiral, which packed without overlapping and meant
 *  nothing. `STACK.md` says the answer to a target with hundreds of fragments is
 *  *"a smaller neighbourhood, not a better layout"* — and a neighbourhood is
 *  exactly what a ring is, so the picture now shows the thing the product says
 *  matters.
 *
 *  Deterministic, which is the property the spiral was chosen for and which this
 *  keeps: the same graph rings identically every render, so two people
 *  describing "the node top left" mean the same node. */
export function place(graph: ViewGraph, pins: readonly Pin[]): Placement {
  const pinned = new Map(pins.map((p) => [p.fragment_id, { x: p.x, y: p.y }]));
  const depth = hops(graph);

  // Grouped by ring, in declaration order — stable, so an unrelated node
  // appearing does not reshuffle the ones already placed.
  const rings = new Map<number, string[]>();
  for (const node of graph.nodes) {
    const d = depth.get(node.id) ?? 1;
    if (!rings.has(d)) rings.set(d, []);
    rings.get(d)!.push(node.id);
  }

  const out: Placement = new Map([[graph.root.id, { x: 0, y: 0 }]]);

  let inner = 0;
  for (const [ring, ids] of [...rings].sort((a, b) => a[0] - b[0])) {
    const radius = radiusOf(ring, ids.length, inner);
    inner = radius;
    const step = (Math.PI * 2) / ids.length;
    // Offset each ring by half a step so the second ring's nodes sit in the gaps
    // of the first rather than directly behind them.
    const turn = ring % 2 === 0 ? step / 2 : 0;

    ids.forEach((id, i) => {
      const pin = pinned.get(id);
      if (pin) {
        out.set(id, pin);
        return;
      }
      const angle = i * step + turn;
      /* `snap` because `Math.cos` and `Math.sin` are implementation-approximated
         by ECMAScript, and Node's V8 and the browser's disagree in the last bit
         — which reaches the DOM as a hydration mismatch. The spiral this
         replaced cost an afternoon to that exact bug; quantising here is the
         fix that already exists rather than a new one.

         Squashed vertically rather than stretched horizontally: a label is far
         wider than it is tall, so the horizontal gaps are the ones that have to
         be generous and the vertical ones can close up. */
      out.set(id, {
        x: snap(Math.cos(angle) * radius),
        y: snap(Math.sin(angle) * radius * 0.72),
      });
    });
  }

  return out;
}

export type { Point, Placement };
