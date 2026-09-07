/**
 * Stat — one number, with what it is and what it means.
 *
 * Twenty-nine in the mock. Three slots: a `label`, a `value`, and a `note` that
 * says what the number implies rather than repeating it.
 *
 * # `value` is optional, and that is the whole component
 *
 *     value ?? <span className={s.unmeasured}>—</span>
 *
 * The workspace scope document, §Scope: *an unmeasured total renders as `–`
 * and never as `0`,
 * because a zero nothing computed is not a zero.* This is the cheapest place in
 * the product to hold that rule, and the most consequential — a board showing `0`
 * for a count nobody ran has told somebody an asset is clean when in fact nothing
 * looked at it.
 *
 * So the type makes the honest answer the *easy* one: omit the prop. A caller
 * that has genuinely counted zero passes `0`, which is a different keystroke and a
 * different claim.
 *
 * The em dash is `--ink-4` rather than the value colour, so an absent number does
 * not read at the same weight as a present one.
 *
 * # `tone` is on the note, not on the number
 *
 * The figure is the figure. Colouring `8` green says the eight is good, which is a
 * judgement the component cannot make — eight accepted attributions is
 * reassuring, eight rejected ones is not. The note is where the interpretation
 * lives, so that is where the colour goes.
 *
 * # tabular-nums, and the ellipsis
 *
 * Stats sit in a row and their digits must line up, or a grid of five reads as
 * five unrelated cards. `font-variant-numeric: tabular-nums` does that.
 *
 * The value also truncates rather than wraps: the canvas's ROOT stat holds an
 * entity name rather than a number, and a two-line value would make one card
 * taller than its neighbours and break the row it belongs to. A clipped name is
 * recoverable — the same name is the page's heading — and a broken row is not.
 *
 * # The label is a SectionLabel
 *
 * It was five properties in this stylesheet, and the same five in `Panel`'s head
 * and the canvas inspector's `<dt>`. Three copies had already begun to drift.
 */
export {};
