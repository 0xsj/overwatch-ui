/**
 * Badge — a small piece of state, and the reason it has a glyph slot.
 *
 * # A status may never be distinguished by colour alone
 *
 * The accent in this product is green, and green is also the healthy state. So a
 * chip that says only *"accepted"* in accent tells a colourblind reader nothing
 * that *"proposed"* in warn does not — and the four states this product cares most
 * about are the three-state rule (`present` / `absent` / `unattempted`) plus
 * scope, which is exactly where a wrong read is expensive.
 *
 * `glyph` is therefore a prop rather than a variant. It is a `ReactNode`, so it
 * takes the `✓ ? ⊘ ··` characters the mock uses or a lucide icon, and it is
 * `aria-hidden` because the chip's text already says the same thing — a screen
 * reader that announces "check accepted" has been told twice.
 *
 * The glyph is optional and that is the honest shape: a chip carrying `run-119` is
 * an identifier, not a state, and has nothing to redundantly encode.
 *
 * # `··` is a real value, not a placeholder
 *
 * The unattempted state is rendered as two middle dots. It is the state that every
 * other tool in this space collapses into "none", and giving it a glyph that reads
 * as absence-of-a-reading rather than a negative result is the whole point of the
 * three-state rule being a rule.
 *
 * # tone: "neutral" maps to the empty string
 *
 *     tone: { neutral: "", accent: s.accent, … }
 *
 * The neutral appearance lives on `.badge` itself, so the neutral variant adds
 * nothing. It is still listed, because a variant key that exists in the type and
 * not in the map is a runtime `undefined` in the class list, and because
 * `tone="neutral"` should be writable at a call site that is choosing between
 * tones in a ternary.
 *
 * # Every tone sets border, background AND colour
 *
 * Three properties from one class, never a tint without its ink. A chip that
 * changed only its background would be legible in one theme and not the other, and
 * the tint/line/ink triples are defined together in the semantic layer precisely
 * so a tone cannot be assembled half-way.
 *
 * # mono drops the weight
 *
 * The chip is `--weight-medium` at 10px because short uppercase-ish labels need it
 * to hold. An identifier in mono does not — the face already reads heavier, and
 * keeping medium makes `art_01JQ8F` shout next to the label beside it.
 *
 * # Deliberately absent
 *
 * `onRemove` / a dismiss affordance. That is a token in a filter bar, which is a
 * composition with its own keyboard model, not this.
 *
 * A `size` variant. One size, and a chip that needs to be bigger is a badge that
 * has not been designed yet.
 */
export {};
