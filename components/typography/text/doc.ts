/**
 * Text — the only element in this tree that may set an ink colour on prose.
 *
 * # Tone is a name, never a step
 *
 * `tone="tertiary"` and never `color: var(--ink-3)` at a call site. The two-tier
 * token rule says a component may not name a palette step; this component is the
 * place where the *semantic* names are spent, so every screen inherits the ladder
 * rather than re-deciding it.
 *
 * The ladder is monotonic by construction and measured on the kitchen sink:
 * primary → secondary → tertiary → quiet, each a real step down in prominence and
 * each above 4.5:1 on both the ground and the panel, in both themes. That last
 * clause is not decoration — the fourth step was at 2.81:1 for two visual reviews
 * before it was computed, and it was carrying timestamps and axis labels.
 *
 * `accent` sits outside the ladder. It is a fifth tone, not a fifth step, and a
 * screen that reaches for it to mean "more important than primary" is wrong: the
 * accent is also the healthy status, so prose wearing it reads as a state.
 *
 * # `as` is a closed union, not ElementType
 *
 *     as?: "p" | "span" | "div" | "li" | "dd" | "dt" | "label"
 *
 * The open version compiles and then lets `as="h1"` through, which produces a
 * heading with no outline level and body type — the exact confusion Heading
 * exists to prevent. The closed set is the set of elements that hold a phrase and
 * carry no other meaning.
 *
 * `label` is in it and is the one to be careful with: it renders a bare `<label>`
 * with no `htmlFor`. Field owns that wiring, so a form label comes from Field.
 * This one is for the label-shaped things that are not form labels.
 *
 * # mono is a boolean, and its size is relative
 *
 *     .mono { font-family: var(--font-mono); font-size: 0.93em; }
 *
 * `em`, not a token. The mono face runs visually larger than the sans at the same
 * pixel size, so a hash inline in a sentence has to shrink *relative to whatever
 * size it is sitting in* to keep one baseline. A fixed size would need one value
 * per size variant, and a `size × mono` matrix in cva for a correction that is the
 * same ratio every time.
 *
 * # measure is here rather than on a wrapper
 *
 * `max-inline-size` plus a looser line-height, as one switch, because they are one
 * decision: a column is only worth constraining if it is set to be read, and prose
 * set to be read wants the taller leading. Two props would let a caller pick the
 * broken half of the pair.
 *
 * # Deliberately absent
 *
 * `weight`, `align`, `truncate`. Each is a layout decision that belongs where the
 * layout is; a truncating Text in particular hides its own overflow bug at every
 * call site instead of at the one that has the constrained box.
 */
export {};
