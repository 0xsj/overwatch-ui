import type { Kind } from "@/lib/kernel";

/** THREE states, and `never` versus `stale` are two different failures —
 *  `decisions/0011`: *nobody asked* versus *the answer is old*. They are never
 *  summed into one deficit, because the fix for each is a different action. */
export type CoverageState = "fresh" | "stale" | "never";

export type CoverageCell = {
  check_id: string;
  check_name: string;
  state: CoverageState;
  /** ABSENT when never. For the human check it is when somebody READ it, which
   *  is not when they ruled on it — `decisions/0037`. */
  at?: string;
};

export type CoverageRow = {
  fragment_id: string;
  kind: Kind;
  value: string;
  /** ONLY the applicable checks. An inapplicable pair is NOT a cell — *n/a
   *  renders as no square* — so the grid is RAGGED, and a client that
   *  right-pads it with dashed squares has re-introduced the bug `0011` exists
   *  to remove. */
  cells: CoverageCell[];
};

/** **There is no percentage on the wire, and there must not be one here
 *  either.** `fresh` and `pairs` both come back and the arithmetic is the
 *  client's, because a `0/0` rounded to `0%` is exactly the zero nothing
 *  computed that §Scope refuses. */
export type Coverage = {
  assets: number;
  /** The RAGGED denominator, and a CLAIM: it asserts that this many questions
   *  exist. Never assets × checks. */
  pairs: number;
  fresh: number;
  stale: number;
  never: number;
  rows: CoverageRow[];
};
