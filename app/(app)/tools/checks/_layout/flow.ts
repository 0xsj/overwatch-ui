import type { Check, Flow, Step } from "@/lib/services/pipeline";

export type Point = { x: number; y: number };
export type Placement = Map<string, Point>;

/** One column per depth. Wide, because a node carries an argv line — and the
 *  gap has to leave a stepped connector somewhere to step. */
export const COL = 300;
export const ROW = 96;
export const NODE_W = 208;
export const NODE_H = 64;

/** Longest path from a source, which is the only depth that draws correctly.
 *
 *  Shortest path would put a step beside the thing that feeds it whenever a
 *  second, longer route also reaches it — so an edge would point backwards. A
 *  cycle is not modelled and not reachable through the editor; if one ever
 *  arrives, the `seen` guard stops the recursion and the node lands at the depth
 *  it already had rather than hanging. */
export function depths(steps: Step[], flows: Flow[]): Map<string, number> {
  const incoming = new Map<string, string[]>();
  for (const s of steps) incoming.set(s.step_id, []);
  for (const f of flows) incoming.get(f.to)?.push(f.from);

  const depth = new Map<string, number>();
  const seen = new Set<string>();

  const walk = (id: string): number => {
    const known = depth.get(id);
    if (known !== undefined) return known;
    if (seen.has(id)) return 0;
    seen.add(id);
    const from = incoming.get(id) ?? [];
    const d = from.length === 0 ? 0 : Math.max(...from.map(walk)) + 1;
    depth.set(id, d);
    return d;
  };

  for (const s of steps) walk(s.step_id);
  return depth;
}

/** Deterministic, and with no transcendental in it.
 *
 *  `+ - * /` and comparisons are exactly specified by IEEE-754, so the server
 *  and the browser compute identical bits and the markup they produce is
 *  identical. The entity canvas's spiral uses `Math.cos`, whose precision
 *  ECMAScript leaves to the implementation, and that cost a hydration mismatch
 *  and an afternoon. This layout cannot have that bug rather than being
 *  defended against it.
 *
 *  A pin wins outright. Somebody who dragged a node stated a constraint, and a
 *  re-layout must move everything else around it rather than over it. */
export function place(check: Check): Placement {
  const depth = depths(check.steps, check.flows);

  // Stable within a column: the order the steps are declared in, which is the
  // order they were added. Sorting by anything derived would reshuffle the
  // picture when an unrelated step changed.
  const byColumn = new Map<number, string[]>();
  for (const s of check.steps) {
    const d = depth.get(s.step_id) ?? 0;
    if (!byColumn.has(d)) byColumn.set(d, []);
    byColumn.get(d)!.push(s.step_id);
  }

  const out: Placement = new Map();
  for (const s of check.steps) {
    if (s.pin) {
      out.set(s.step_id, s.pin);
      continue;
    }
    const d = depth.get(s.step_id) ?? 0;
    const column = byColumn.get(d) ?? [];
    const row = column.indexOf(s.step_id);
    // Centre each column on the tallest one, so a fan-out reads as a fan rather
    // than as everything hanging off the top edge.
    const tallest = Math.max(...[...byColumn.values()].map((c) => c.length));
    const offset = (tallest - column.length) / 2;
    out.set(s.step_id, { x: d * COL, y: (row + offset) * ROW });
  }
  return out;
}

export function bounds(placement: Placement) {
  const xs = [...placement.values()].map((p) => p.x);
  const ys = [...placement.values()].map((p) => p.y);
  return {
    minX: Math.min(0, ...xs),
    maxX: Math.max(0, ...xs) + NODE_W,
    minY: Math.min(0, ...ys),
    maxY: Math.max(0, ...ys) + NODE_H,
  };
}

/** An orthogonal connector: out of the right edge, across half the gap, down,
 *  and into the left edge.
 *
 *  Stepped rather than straight, and that is the main thing separating this
 *  canvas from the entity one at a glance. It also reads correctly for a
 *  fan-out, where several straight lines from one point become a starburst and
 *  several stepped ones become a bus. */
export function connector(a: Point, b: Point): string {
  const x1 = a.x + NODE_W;
  const y1 = a.y + NODE_H / 2;
  const x2 = b.x;
  const y2 = b.y + NODE_H / 2;
  const mid = x1 + (x2 - x1) / 2;
  return `M ${x1} ${y1} H ${mid} V ${y2} H ${x2}`;
}
