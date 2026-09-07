import type { EntityGraph, Pin } from "@/lib/services/entities";

export type Point = { x: number; y: number };

/** A number on its way into the DOM, quantised to a thousandth of a pixel.
 *
 *  `Math.cos`, `Math.sin`, `Math.hypot` and `Math.exp` are the four this layout
 *  uses whose precision ECMAScript leaves to the implementation, so Node's V8
 *  and the browser's V8 are free to disagree in the last bit — and they do.
 *  Measured 2026-09-07 across Node 26.8.1 and Chrome 152: one value in
 *  twenty-six differed, by 4.44e-16, which is 4e-14 of a pixel.
 *
 *  That is invisible as geometry and fatal as markup, because React hydrates by
 *  comparing the STRING: `130` against `129.99999999999994` is a mismatch React
 *  says it will not patch up. Quantising here makes both sides round the same
 *  integer and print the same characters.
 *
 *  It is a quantisation, not a proof. Two values a ULP apart that straddle a
 *  half-thousandth boundary would still print differently; nothing rules that
 *  out, and the honest claim is that it is ~1e-13 likely per coordinate rather
 *  than impossible. The sound fix is a layout with no transcendental in it,
 *  which is a much larger change for a defect this size. */
export const snap = (n: number): number => Math.round(n * 1000) / 1000;
export type Placement = Map<string, Point>;

/** One layout unit is roughly one node's height. Pins are stored in these,
 *  never in pixels, which is what lets an arrangement survive a window resize
 *  and a zoom. */
export const UNIT = 88;

/** Labels are far wider than they are tall, so the field is stretched rather
 *  than the spiral made sparser — a circular layout wastes vertical space and
 *  still collides horizontally. */
const ASPECT = 2.1;

const GOLDEN = 2.399963229728653;

function slot(index: number): Point {
  const angle = index * GOLDEN;
  // The constant is the first ring, and it is set by the ROOT's own width: a
  // spiral that starts closer puts slot zero underneath the node everything
  // radiates from, which is the one collision no amount of spacing further out
  // will fix.
  const radius = 1.32 + 0.46 * Math.sqrt(index);
  return { x: Math.cos(angle) * radius * ASPECT, y: Math.sin(angle) * radius };
}

/** Deterministic: the same graph places identically every render, so a
 *  re-render never reshuffles the picture and two people describing "the node
 *  top left" mean the same node.
 *
 *  A slot belongs to a node's index in the server's ordering and is not
 *  reassigned when something else is pinned — pinning one node must not move
 *  every other node, or the arrangement is not an arrangement. */
export function place(graph: EntityGraph, pins: readonly Pin[]): Placement {
  const pinned = new Map(pins.map((p) => [p.node_id, { x: p.x, y: p.y }]));
  const out: Placement = new Map([[graph.root.id, { x: 0, y: 0 }]]);

  graph.nodes.forEach((node, index) => {
    out.set(node.id, pinned.get(node.id) ?? slot(index));
  });

  return out;
}

export function toPixels({ x, y }: Point): Point {
  return { x: x * UNIT, y: y * UNIT };
}

export function toUnits({ x, y }: Point): Point {
  return { x: x / UNIT, y: y / UNIT };
}

export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

/** The real extent of a placement, so the view can be framed on first paint.
 *
 *  Measured rather than assumed symmetric around the root: one pinned node three
 *  units to the left does not mean there is anything three units to the right,
 *  and sizing the field as if there were opens the canvas zoomed out with the
 *  graph in a corner of an empty page. */
export function bounds(placement: Placement): Bounds {
  let minX = 0;
  let minY = 0;
  let maxX = 0;
  let maxY = 0;
  for (const { x, y } of placement.values()) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY };
}
