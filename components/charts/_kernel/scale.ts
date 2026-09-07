/** A scale maps a value in the data's units to a position in pixels.
 *
 *  Pure, and deliberately not a library. `d3-scale` is excellent and it arrives
 *  with a module graph; these are the four this catalogue needs and each is
 *  under fifteen lines. The one that would justify a dependency is a time scale
 *  with proper tick calendars, and nothing here has one yet.
 */

export type Scale = {
  /** value -> pixel */
  (value: number): number;
  /** The data extent, as given. */
  domain: readonly [number, number];
  /** The pixel extent. Inverted for y, because SVG counts downward. */
  range: readonly [number, number];
  /** Round numbers inside the domain, for axes. */
  ticks: (count?: number) => number[];
};

const make = (
  domain: readonly [number, number],
  range: readonly [number, number],
  to: (v: number) => number,
): Scale => Object.assign(to, { domain, range, ticks: (n = 5) => niceTicks(domain, n) });

/** Values are mapped by proportion. A zero-width domain maps everything to the
 *  middle of the range rather than dividing by zero — one datum is a legitimate
 *  chart and it should draw. */
export function linear(
  domain: readonly [number, number],
  range: readonly [number, number],
): Scale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0;
  return make(domain, range, (v) =>
    span === 0 ? (r0 + r1) / 2 : r0 + ((v - d0) / span) * (r1 - r0),
  );
}

/** Categories on evenly spaced bands. Returns the band's START; `bandWidth`
 *  gives its size, which a bar needs and a tick label does not. */
export type BandScale = {
  (value: string): number;
  bandWidth: number;
  step: number;
  domain: readonly string[];
  range: readonly [number, number];
};

export function band(
  domain: readonly string[],
  range: readonly [number, number],
  padding = 0.1,
): BandScale {
  const [r0, r1] = range;
  const n = Math.max(1, domain.length);
  const step = (r1 - r0) / n;
  const bandWidth = step * (1 - padding);
  const index = new Map(domain.map((d, i) => [d, i]));
  const at = (value: string) => r0 + (index.get(value) ?? 0) * step + (step - bandWidth) / 2;
  return Object.assign(at, { bandWidth, step, domain, range });
}

/** Symmetric about a midpoint, so a diverging colour ramp reads the same
 *  distance either side of it. The extent is the larger of the two arms — using
 *  each arm's own extent would make `+1` and `-1` different saturations, which
 *  is the classic wrong diverging scale. */
export function diverging(
  values: readonly number[],
  midpoint = 0,
): { at: (v: number) => number; extent: number } {
  const extent = Math.max(
    1e-9,
    ...values.map((v) => Math.abs(v - midpoint)),
  );
  return {
    // -1 .. 0 .. 1
    at: (v: number) => (v - midpoint) / extent,
    extent,
  };
}

/** The extent of a set, with a guard for empty. */
export function extentOf(values: readonly number[]): [number, number] {
  if (values.length === 0) return [0, 1];
  return [Math.min(...values), Math.max(...values)];
}

/** Pad an extent so marks at the edge are not clipped by the frame. */
export function pad(
  [lo, hi]: readonly [number, number],
  fraction = 0.06,
): [number, number] {
  const span = hi - lo || Math.abs(hi) || 1;
  return [lo - span * fraction, hi + span * fraction];
}

/** Round tick values inside a domain — 1, 2, 5 x 10^n, which is the series
 *  people read without doing arithmetic. */
export function niceTicks(
  [lo, hi]: readonly [number, number],
  count = 5,
): number[] {
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo === hi) return [lo];
  const raw = (hi - lo) / Math.max(1, count);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalised = raw / magnitude;
  const step = (normalised >= 5 ? 10 : normalised >= 2 ? 5 : normalised >= 1 ? 2 : 1) * magnitude;
  const first = Math.ceil(lo / step) * step;
  const out: number[] = [];
  // A guard on the count, not on the value: floating point can make the last
  // step land a hair short and loop forever.
  for (let v = first, i = 0; v <= hi + step * 1e-9 && i < 500; v += step, i++) {
    out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  }
  return out;
}

/** A number on its way into an SVG attribute.
 *
 *  Scales multiply and divide, and `Math.log10` in `niceTicks` is
 *  implementation-approximated — Node's V8 and the browser's disagree in the
 *  last bit, which reaches the DOM as a hydration mismatch. Quantising at the
 *  boundary is the fix this codebase already found once on the entity canvas. */
export const px = (n: number): number => Math.round(n * 100) / 100;
