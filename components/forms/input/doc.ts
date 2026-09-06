/**
 * Input and Textarea — one variant set, two elements, and no wrapper.
 *
 * # Two exports rather than a `multiline` prop
 *
 * `<Input multiline>` would have to accept the union of `InputHTMLAttributes` and
 * `TextareaHTMLAttributes` on one signature, so `rows` would type-check on a text
 * input and `type="email"` on a textarea. Two functions keep both prop sets exact
 * and cost one more import.
 *
 * The *styling* is still one variant set: `inputVariants({ multiline: true })`
 * adds the height and resize behaviour to the same base. So the border, the focus
 * ring and the invalid state cannot drift between them, which is the drift a
 * separate Textarea component actually produces.
 *
 * `multiline` is therefore omitted from the public props of both — it is an
 * internal argument to the variant function, not a caller's decision.
 *
 * # invalid is written twice, on purpose
 *
 *     aria-invalid={invalid || undefined}     the announcement
 *     data-invalid={invalid || undefined}     the styling hook
 *
 * They could be one — `[aria-invalid]` is a perfectly good selector. They are two
 * because the ARIA attribute is a contract with assistive technology and the data
 * attribute is a contract with the stylesheet, and collapsing them means a future
 * styling need edits an accessibility attribute. `|| undefined` rather than the
 * boolean: `aria-invalid="false"` is a rendered attribute that announces nothing
 * and matches `[aria-invalid]`, which would style every valid field as an error.
 *
 * `invalid` is a prop rather than something read from the DOM because Field
 * derives it from `error` and passes it down. A caller using Input bare can still
 * set it.
 *
 * # The focus ring is a box-shadow, not an outline
 *
 * `outline` cannot be given a radius that follows `border-radius` on every engine,
 * and the ring here sits *outside* a border that changes colour at the same time.
 * A two-pixel shadow in `--accent-tint` composites over whatever the field is
 * sitting on; an outline would need a surface colour it cannot know.
 *
 * `:focus-visible`, never `:focus` — a mouse click on a text field should not
 * paint a ring, and `:focus` cannot tell the difference.
 *
 * # mono, and why the size drops
 *
 * `--text-11-5` rather than the sans `--text-12-5`. Scope patterns, hashes and IDs
 * go in mono fields, and the mono face runs larger at equal nominal size; matching
 * the sans size would make every rule editor read one step louder than the form
 * around it. Text solves the same problem with `0.93em` because it is inline in a
 * sentence; here the field owns its whole box, so a token is honest.
 *
 * # Deliberately absent
 *
 * A `size` variant. Every field in this product is one height. A second height is
 * a real decision about density and should arrive with the screen that needs it,
 * not as an unused enum.
 *
 * Adornments — a leading icon, a trailing unit. They need a wrapper element, and a
 * wrapper here would break `inline-size: 100%` for every caller that does not use
 * one. When a search field wants a magnifier, that is a composition.
 */
export {};
