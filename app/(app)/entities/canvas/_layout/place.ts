import type { EntityGraph, Pin } from "@/lib/services/entities";

export type Point = { x: number; y: number };
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
