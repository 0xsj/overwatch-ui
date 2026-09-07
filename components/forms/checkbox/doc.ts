/**
 * Checkbox — three states, and the third is not a styling of the other two.
 *
 * # indeterminate
 *
 *     checked         aria-checked="true"
 *     unchecked       aria-checked="false"
 *     indeterminate   aria-checked="mixed"     ← a real, announced third state
 *
 * The usual case is a parent checkbox over a partly-selected list. This product
 * has a second one everywhere: **found · looked for and absent · never looked
 * for** is the distinction §Scope refuses to collapse, and a checkbox is one of
 * the few controls that can express three states without inventing a widget.
 *
 * The indicator holds both glyphs and `data-state` decides which shows. A `mixed`
 * prop would make it a variant, and it is a value — the difference matters
 * because a variant is chosen by the author and a state comes from the data.
 *
 * # The label is not in here
 *
 * A checkbox is 16px, and its clickable area has to include the words. That is
 * `Label` beside it with `htmlFor`, which also makes the whole phrase a hit
 * target. Bundling a `label` prop would have this component own an id, and then
 * a caller that wants two controls under one label cannot have it.
 *
 * # Deliberately absent
 *
 * A `CheckboxGroup`. Radix has none, HTML has none, and the grouping is a
 * `Fieldset` with a `legend` — which is the same thing a radio group needs and is
 * already a component.
 */
export {};
