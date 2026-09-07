import type { CSSProperties } from "react";

/** The four channels a mark can carry, kept apart from the charts so a preset
 *  is a choice of channels rather than a new implementation.
 *
 *  Colour is the constrained one, and the constraint is this build's rather than
 *  the atlas's: `STACK.md` has four hues — accent, warn, info, crit — and
 *  §two-tier-colour-tokens forbids a component naming a palette step. So a
 *  categorical scale here is SIX values and then it stops, and the answer to a
 *  seventh category is not a seventh hue.
 */

/** Area, not radius. A circle drawn with radius proportional to value is read
 *  as roughly value squared, which overstates the large ones — the standard
 *  bubble-chart error. */
export function radiusFor(
  value: number,
  domain: readonly [number, number],
  range: readonly [number, number] = [3, 14],
): number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0;
  const t = span === 0 ? 0.5 : (value - d0) / span;
  const a0 = r0 * r0;
  const a1 = r1 * r1;
  return Math.sqrt(a0 + t * (a1 - a0));
}

/** Six categorical slots, assigned in FIXED order and never cycled.
 *
 *  Cycling is what makes a chart repaint its survivors when a filter changes the
 *  series count — the seventh category taking the first hue means every legend
 *  entry is a lie the moment anything is hidden. A seventh category folds into
 *  `other`, and this returns `null` for it so a caller cannot accidentally paint
 *  it as a colour it does not own. */
export const CATEGORICAL = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
] as const;

/** Two more, and they carry a condition rather than a caveat.
 *
 *  Six slots pass the validator when only ADJACENT pairs are compared and FAIL
 *  when any two might be — teal against blue at ΔE 10.7 for normal vision, amber
 *  against green at 7.1 for a deuteranope. So these are legal in a stacked bar,
 *  where neighbours touch and nothing distant is ever compared, and illegal in a
 *  scatter, where every point is compared with every other. */
export const CATEGORICAL_ADJACENT_ONLY = ["var(--chart-5)", "var(--chart-6)"] as const;

/** `null` past the fourth slot, and returning `null` is the point.
 *
 *  A cycling palette is what makes a chart repaint its survivors when a filter
 *  changes the series count — the fifth category taking the first hue means
 *  every legend entry is a lie the moment anything is hidden. So there is no
 *  fifth hue to take: a caller that gets `null` has to fold the category into
 *  `other`, facet, or use small multiples. */
export function categorical(index: number): string | null {
  return index >= 0 && index < CATEGORICAL.length ? CATEGORICAL[index] : null;
}

/** A diverging ramp, taking `-1 .. 0 .. 1` from `scale.diverging`.
 *
 *  Two hues and a neutral midpoint, never a rainbow, and the midpoint is
 *  genuinely neutral rather than a third hue — a coloured midpoint makes zero
 *  look like a value. */
export function divergingFill(t: number): string {
  const clamped = Math.max(-1, Math.min(1, t));
  return clamped >= 0
    ? `color-mix(in oklab, var(--chart-pos) ${Math.round(clamped * 100)}%, var(--chart-mid))`
    : `color-mix(in oklab, var(--chart-neg) ${Math.round(-clamped * 100)}%, var(--chart-mid))`;
}

/** A single-hue sequential ramp, for magnitude with no sign. */
export function sequentialFill(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  return `color-mix(in oklab, var(--chart-seq) ${Math.round(12 + clamped * 88)}%, transparent)`;
}

/** Shape carries a CLASS, and it is the channel that survives being printed in
 *  black and white or read by somebody with a colour vision deficiency. Six,
 *  matching the categorical count, so a legend can pair them. */
export type MarkShape = "circle" | "square" | "diamond" | "triangle" | "hexagon" | "pill";

export const SHAPES: readonly MarkShape[] = [
  "circle", "square", "diamond", "triangle", "hexagon", "pill",
];

/** An SVG path for a shape, centred on the origin. `pill` is the odd one — it
 *  is a rounded rectangle, so it is returned as a `<rect>` spec instead and the
 *  renderer branches once. */
export function shapePath(shape: MarkShape, r: number): string {
  switch (shape) {
    case "circle":
      return `M ${-r} 0 a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`;
    case "square":
      return `M ${-r} ${-r} H ${r} V ${r} H ${-r} Z`;
    case "diamond":
      return `M 0 ${-r * 1.25} L ${r * 1.25} 0 L 0 ${r * 1.25} L ${-r * 1.25} 0 Z`;
    case "triangle":
      return `M 0 ${-r * 1.2} L ${r * 1.1} ${r * 0.8} L ${-r * 1.1} ${r * 0.8} Z`;
    case "hexagon": {
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        return `${(Math.cos(a) * r * 1.12).toFixed(2)} ${(Math.sin(a) * r * 1.12).toFixed(2)}`;
      });
      return `M ${pts.join(" L ")} Z`;
    }
    case "pill":
      return `M ${-r * 1.5} ${-r * 0.7} H ${r * 1.5} A ${r * 0.7} ${r * 0.7} 0 0 1 ${r * 1.5} ${r * 0.7} H ${-r * 1.5} A ${r * 0.7} ${r * 0.7} 0 0 1 ${-r * 1.5} ${-r * 0.7} Z`;
  }
}

/** A legend entry, which every chart with more than one series must render.
 *  Identity is never carried by colour alone — the shape is in here too. */
export type LegendItem = {
  label: string;
  fill?: string | null;
  shape?: MarkShape;
  /** For a diverging or sequential ramp, drawn as a bar rather than a swatch. */
  ramp?: "diverging" | "sequential";
  style?: CSSProperties;
};
