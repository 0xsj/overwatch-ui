/**
 * Heading — a level and a scale, and they are deliberately not the same prop.
 *
 * # Why two props
 *
 *     <Heading level={2} scale="h3">
 *
 * `level` is the document outline: what a screen reader announces and what a
 * skip-to-section list is built from. `scale` is how large the words are. Tying
 * them together forces a choice between a correct outline and a correct page, and
 * the usual resolution is an `<h4>` picked because it looked right — which is a
 * silent accessibility defect, invisible in every screenshot.
 *
 * A panel head is the case that decides it. It is an `<h3>` under the section's
 * `<h2>`, and it must read no louder than the body around it. One prop cannot say
 * that.
 *
 * `level` is required, with no default. A heading whose level was never chosen is
 * a heading whose outline position was never chosen, and defaulting it produces a
 * document that nests plausibly and wrongly.
 *
 * # scale defaults to h2 and does NOT derive from level
 *
 * A derived default — `level={1}` implies the largest scale — is the first thing
 * proposed here and it fails on arithmetic: there are six levels and six scales,
 * but `d1`/`d2` are display sizes for a marketing hero and `label` is an uppercase
 * eyebrow. The mapping is not 1:1 and any table written for it encodes one page's
 * taste as a rule.
 *
 * So the default is the one that is always safe to land on, and the loud ones are
 * asked for by name — the same reason Button's default intent is secondary.
 *
 * # label is a scale, not a component
 *
 * `scale="label"` is the uppercase, letter-spaced eyebrow. It is a scale because
 * it is a heading: it names the block underneath it and belongs in the outline.
 * A separate `<Eyebrow>` would be the same element with the outline dropped, which
 * is how eyebrows end up as `<div>`s.
 *
 * It is the one scale that sets a colour, because uppercase 10px at full ink is
 * louder than the h3 beneath it — the size is smaller and the weight is heavier,
 * and the ink has to come down to compensate.
 *
 * # Deliberately absent
 *
 * `as`. The tag IS the level; a `Heading` that renders a `<div>` is a Text.
 */
export {};
