/**
 * RadioGroup — one choice from a closed set, with the set named.
 *
 * # It is incomplete without a Fieldset
 *
 * The group has a `role="radiogroup"`, and that role has no name of its own. A
 * `<legend>` inside a `<fieldset>` is announced before **every** option, so a
 * screen reader says *"Claimant, rule, radio button, 1 of 3"* rather than *"rule,
 * radio button, 1 of 3"* — which is the difference between a choice and a word.
 *
 * That is why `Fieldset` was built in the same batch. Neither is much use alone.
 *
 * # Radix's arrow-key behaviour, which is the reason not to hand-roll
 *
 * Radios are a single tab stop with arrow keys moving *and selecting* inside it —
 * roving tabindex, the same pattern as `Tabs`. Native radios do this and a set of
 * hand-rolled buttons does not, which is the usual regression.
 *
 * # Radio, not RadioGroupItem
 *
 * The export is `Radio`. `RadioGroupItem` is Radix's name and it is longer than
 * the thing it describes; a radio outside a group is not a thing, so the shorter
 * name is not ambiguous.
 *
 * # Deliberately absent
 *
 * A `label` prop on `Radio`. Same reason as `Checkbox`: the option's label is a
 * sibling with `htmlFor`, which makes the words part of the hit target.
 */
export {};
