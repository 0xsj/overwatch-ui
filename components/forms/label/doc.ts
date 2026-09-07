/**
 * Label — for the two labelling shapes `Field` cannot express.
 *
 * # Three shapes, and Field is one of them
 *
 *     above     input, textarea, select. The label sits above the control and
 *               `Field` wires htmlFor, aria-describedby and the error id
 *     beside    checkbox, switch. The control and its label are ONE clickable
 *               unit, so the label goes next to it
 *     a group   radio group, checkbox group. A <legend> names the SET and is
 *               announced before every option; each option still needs its own
 *
 * `Field` covers the first and is the wrong shape for the other two — it puts a
 * block label above and owns the id, which for a checkbox produces a label
 * floating over a 16px box and a click target that is only the box.
 *
 * # Why Radix's and not a plain <label>
 *
 * Two things. It stops a double-click on the label selecting the text, which is
 * what a native label does and is never what anybody wanted. And it forwards
 * `data-disabled` from the control it names, so the pair dims together instead of
 * a bright label sitting beside a dead control.
 *
 * # It does not generate an id
 *
 * `htmlFor` is the caller's. `Field` owns ids because it owns the whole
 * arrangement; here the control and the label are siblings, and inventing an id
 * would mean inventing the control's too.
 */
export {};
