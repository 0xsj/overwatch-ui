/**
 * Empty — three reasons there is nothing here, and one of them is not a result.
 *
 * # The distinction
 *
 *     empty        the set is genuinely empty. Something looked
 *     filtered     nothing matches the current filter. Something looked
 *     unmeasured   NOBODY LOOKED. Not a result at all
 *
 * An empty table is exactly where somebody concludes *"we're clean"*, which makes
 * this the highest-consequence empty state in the product. It is the same rule
 * `Stat` holds for a number and `Presence` holds for a cell, at the scale of a
 * whole view.
 *
 * # `reason` is required and has no default
 *
 * The whole component is the distinction. A default would let a caller skip
 * making it, and the one they would get is the reassuring one.
 *
 * # Every reason carries a coda the caller cannot forget
 *
 *     empty        That is a result.
 *     filtered     That is a result, not an error.
 *     unmeasured   That is not a result — nothing has looked yet.
 *
 * The line is the component's, not the caller's, so the distinction survives
 * somebody who writes only a headline. The mock's own copy is where the second
 * one comes from.
 *
 * # unmeasured looks different in kind, not in shade
 *
 * `--warn` on the headline, and the coda is italic with a dotted rule — the same
 * treatment `Presence` gives `unattempted`, for the same reason. Two greys are
 * two greys; an italic under a dotted line is a different kind of thing, and it
 * survives greyscale and a colourblind reader.
 */
export {};
