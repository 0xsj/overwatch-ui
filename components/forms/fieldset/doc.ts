/**
 * Fieldset — a name for a SET of controls, which is the one thing a group has no
 * other way to carry.
 *
 * # Why a legend and not a heading
 *
 * A `<legend>` inside a `<fieldset>` is announced before **every** control in the
 * group. A heading above the group is announced once, when you pass it — so
 * somebody arriving at the third radio by arrow key hears "human, radio button, 3
 * of 3" and never learns what is being chosen.
 *
 * That is the whole component. It is four lines of markup and it is the
 * difference between a choice and a list of words.
 *
 * # The two resets are not cosmetic
 *
 *     border: 0; padding: 0        every browser gives a fieldset both, and they
 *                                  are from 1995
 *     min-inline-size: 0           the real one
 *
 * A `<fieldset>` has `min-inline-size: min-content` in the UA stylesheet, which
 * cannot be overridden by `width` and makes the element refuse to shrink inside a
 * flex or grid parent. It presents as an unexplainable horizontal overflow in a
 * layout that is correct everywhere else, and the cause is invisible because
 * nothing in the author's CSS mentions a minimum.
 *
 * # `legend` is required, and `title` is omitted from the attributes
 *
 * A fieldset with no legend is a `<div>` with extra steps. And
 * `FieldsetHTMLAttributes` carries the DOM's `title`, which would intersect with a
 * `ReactNode` prop of the same name — the trap `Panel` paid for.
 *
 * # Not for visual grouping
 *
 * A `Panel` groups things that look related. A fieldset asserts that the controls
 * inside it answer one question, and a screen reader repeats that assertion at
 * every one of them. Using it for layout makes the reader hear "Filters" before
 * each of nine unrelated inputs.
 */
export {};
