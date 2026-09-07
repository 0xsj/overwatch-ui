/**
 * Toggle — a button that stays pressed. Not a switch, and not a checkbox.
 *
 * # What it is for
 *
 * A view or a mode, never data. A filter chip, a formatting mark, a theme choice.
 * `aria-pressed`, which says *this control is currently on* rather than *this
 * setting has a value*.
 *
 *     Toggle     a button. aria-pressed. Changes what you SEE
 *     Switch     role="switch". Changes what the SYSTEM does, immediately
 *     Checkbox   role="checkbox". A value in a form, applied on submit
 *
 * # It replaced two hand-rolled sets
 *
 * `ThemeToggle` was three `Button`s carrying `aria-pressed` by hand, and the
 * canvas's state filters were three `<button aria-pressed>` with their own CSS.
 * Both were correct and neither was the same: one styled `[aria-pressed="true"]`
 * and the other styled `:hover` separately, so the keyboard and pointer states
 * could disagree.
 *
 * Radix writes `data-state="on"/"off"` from either input, which is one rule
 * instead of two that race.
 *
 * # Styled on `aria-pressed`, not `data-state`
 *
 * Radix writes both and both are correct. But `data-state` is written by *every*
 * Radix primitive, so a Toggle wrapped in `TooltipTrigger asChild` has the
 * tooltip's `open`/`closed` merged onto the same element and the pressed rule
 * silently stops matching — the control still announces itself correctly and just
 * never looks pressed.
 *
 * Measured on the canvas's Focus toggle: `aria-pressed="true"` alongside
 * `data-state="closed"`. `aria-pressed` is this component's own attribute, is
 * equally driven by pointer and keyboard, and cannot collide — which is what
 * makes a Toggle composable inside any other trigger.
 *
 * # Two axes, and `shape` is not decoration
 *
 * `size` is sm | md | icon; `shape` is square | pill. The canvas's filters are
 * pills and the theme control is square icons — that is a real difference between
 * "one of a set of filters" and "one of a set of modes", and both existed before
 * the component did.
 *
 * # Deliberately absent
 *
 * `ToggleGroup`. Radix has one, and it enforces single or multiple selection
 * across a set with roving focus. `ThemeToggle` is exactly that shape and does not
 * use it, because its three options each apply immediately rather than selecting
 * within a group — the group would add a roving tab stop and a selection model
 * neither caller wants. It arrives when something wants exclusive selection.
 */
export {};
