/**
 * Separator — a rule that either means something or does not.
 *
 * # The distinction the component exists to keep
 *
 * Radix's primitive has `decorative`, and it is the whole reason to wrap rather
 * than write `<div className="rule" />`:
 *
 *     decorative={false}   role="separator" — announced, and it MEANS the
 *     (the default)        content above and below are different things
 *     decorative           role="none" — out of the tree, a line and nothing else
 *
 * A line drawn because two blocks looked crowded is decorative. A line between
 * one member's row and the next is not — it is the record boundary, and a screen
 * reader announcing it is announcing something true.
 *
 * Most rules in a dense product are decorative and most codebases mark none of
 * them, which floods the accessibility tree with separators that mean nothing.
 * Radix defaults to the semantic one; that default is kept deliberately, so
 * "this line means nothing" has to be said rather than assumed.
 *
 * # `subtle`, and why it is not a tone
 *
 * Two weights: `--line-strong` between regions, `--line` inside a component where
 * the full line is too loud. It is a boolean rather than a `tone` union because
 * there is no third answer and there is no case for a coloured rule — a rule that
 * needs a colour is a border on the thing it belongs to.
 *
 * # The orientation styles hang off the data attribute
 *
 * `[data-orientation="vertical"]` rather than a prop the CSS also has to know
 * about. Radix already writes the attribute from `orientation`, so reading it is
 * one source of truth; a parallel `vertical` class would be a second one to keep
 * in step.
 *
 * `align-self: stretch` on the vertical case because a 1px element in a flex row
 * has no height of its own, and the version everybody writes first is invisible.
 */
export {};
