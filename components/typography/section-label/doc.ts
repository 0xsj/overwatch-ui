/**
 * SectionLabel — the small uppercase key that names a value.
 *
 * `ROOT`, `ACCEPTED`, `STATE`, `CLAIMED BY`. Ten pixels, medium weight, uppercase,
 * `--tracking-label`, `--ink-4`.
 *
 * # It exists because three components had already written it
 *
 * `Stat`'s label, `Panel`'s head, and the canvas inspector's `<dt>` each declared
 * the same five properties in their own stylesheet. None was wrong and none knew
 * about the others, so the tracking and the weight had already begun to drift.
 * That is the whole argument: a rule repeated in three stylesheets is a rule that
 * is about to be four slightly different rules.
 *
 * # Why the default element is `div` and not a heading
 *
 * Most of these name a *value* — the key half of a key/value pair — rather than
 * head a region. A heading that is not meant to be in the document outline is
 * worse than no heading: it puts `ACCEPTED` and `LAST SEEN` into the same
 * structure a screen-reader user navigates by, between the page's real headings,
 * and the outline stops being a table of contents.
 *
 * So `h2`/`h3`/`h4` has to be asked for, and `dt` and `legend` are in the union
 * because a definition list and a fieldset are where this genuinely belongs.
 *
 * # Why it is typography and not display
 *
 * A component goes where its job is. This one's job is text with a specific
 * semantic weight, the same job `Heading` and `Code` have. It renders no box and
 * has no tone axis — `Badge` is the neighbour that does.
 *
 * # Deliberately absent
 *
 * A `tone` prop. Every instance in the product is `--ink-4`, and a label that
 * needs to be louder than its own value is a label competing with what it names.
 * The moment one genuinely needs to be, that is a variant with a reason and not a
 * pass-through prop.
 */
export {};
