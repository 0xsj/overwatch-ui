export type Box = { x: number; y: number; w: number; h: number };

/** Estimated rather than measured. A measure pass means rendering the nodes,
 *  reading `offsetWidth`, then re-rendering the edges — two frames and a layout
 *  thrash on every drag. The estimate is wrong by a few pixels and the search
 *  below has three offsets of slack, which is cheaper than being exact. */
export function nodeBox({
  label,
  kind,
  x,
  y,
  dense = false,
  root = false,
}: {
  label: string;
  kind: string;
  x: number;
  y: number;
  dense?: boolean;
  root?: boolean;
}): Box {
  if (dense && !root) return { x, y, w: 20 + label.length * 5.6, h: 20 };
  const pad = root ? 22 : 0;
  return { x, y, w: 58 + pad + kind.length * 5.4 + label.length * 6.9, h: 28 + (root ? 6 : 0) };
}

/** Where the segment leaving `box` toward (dx, dy) crosses its edge, plus a gap.
 *
 *  Edges were drawn centre to centre, which puts every line under the label it
 *  points at — and thirteen of them under the ROOT, which is the node the whole
 *  canvas is about. Clipping to the boundary is what stops that, and it has to
 *  happen at both ends of every edge rather than only at the root, because the
 *  same crossing happens quietly on every other node. */
export function clip(box: Box, dx: number, dy: number, gap: number): { x: number; y: number } {
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const tx = ux !== 0 ? box.w / 2 / Math.abs(ux) : Infinity;
  const ty = uy !== 0 ? box.h / 2 / Math.abs(uy) : Infinity;
  const t = Math.min(tx, ty) + gap;
  return { x: box.x + ux * t, y: box.y + uy * t };
}

const overlaps = (a: Box, b: Box, padX: number, padY: number) =>
  Math.abs(a.x - b.x) < (a.w + b.w) / 2 + padX &&
  Math.abs(a.y - b.y) < (a.h + b.h) / 2 + padY;

const ALONG = [0.38, 0.5, 0.27, 0.62, 0.72, 0.2, 0.8];
const AWAY = [10, 16, 22];

/** Find somewhere on this segment to put a label, or answer `null`.
 *
 *  The label is drawn in the SVG and the nodes are HTML on top of it, so a
 *  collision does not look crowded — it looks like the label vanished. Try a few
 *  points along the edge, on either side of it, and take the first that clears
 *  every node and every label already placed.
 *
 *  Crossing another EDGE is fine: the label paints a stroke of the surface
 *  colour behind itself. Only nodes and other labels matter.
 *
 *  Answering `null` is a real answer. The edge keeps its `<title>`, so the word
 *  is one hover away, and an unreadable label is worth less than none. */
export function placeLabel(
  text: string,
  from: { x: number; y: number },
  to: { x: number; y: number },
  nodes: readonly Box[],
  placed: Box[],
): { x: number; y: number } | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const box = { w: text.length * 5.1 + 8, h: 12 };

  for (const t of ALONG) {
    for (const away of AWAY) {
      for (const side of [1, -1]) {
        const x = from.x + dx * t + -uy * away * side;
        const y = from.y + dy * t + ux * away * side;
        const candidate = { x, y, ...box };
        if (nodes.some((n) => overlaps(candidate, n, 6, 4))) continue;
        if (placed.some((p) => overlaps(candidate, p, 3, 2))) continue;
        placed.push(candidate);
        return { x, y };
      }
    }
  }
  return null;
}
