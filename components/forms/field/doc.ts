/**
 * Field — owns the label, the description, the error, and the aria wiring that
 * connects them.
 *
 * # children is a function, and that is the whole design
 *
 *     <Field label="Work email" hint="…">
 *       {(aria) => <Input placeholder="you@firm.example" {...aria} />}
 *     </Field>
 *
 * The alternative is `cloneElement` on an opaque child, which fails the moment the
 * child is wrapped in anything — a `<div>` for layout, a controlled wrapper — and
 * fails *silently*: the label stops being connected and nothing errors. A render
 * prop makes the caller place the props, so the connection is visible in the JSX
 * and a wrapper cannot break it.
 *
 * It also means Field never has to know what the control is. An Input, a Textarea,
 * a select this tree does not have yet — the contract is the `aria` bag, not a
 * component type.
 *
 * The bag is the four things a control cannot derive on its own:
 *
 *     id                  matched to htmlFor
 *     aria-describedby    error first, then hint
 *     required            the attribute, not just the asterisk
 *     invalid             derived from `error` being present
 *
 * # useId, not a caller-supplied id
 *
 * Two Fields with the same label on one page is normal — two "Name" fields in a
 * repeated row — and a hand-written id there produces two elements sharing one,
 * so the second label points at the first control. `useId` is stable across the
 * server render and the hydration, which a counter or a random string is not.
 *
 * # Error is announced before hint, and rendered before it too
 *
 *     [errorId, hintId]
 *
 * `aria-describedby` is read in the order the ids are listed, not document order,
 * so this is a deliberate choice: a person who has just failed validation hears
 * what is wrong before they hear the standing advice. The DOM order matches so
 * that a sighted reader gets the same sequence.
 *
 * The hint is not replaced by the error. "Use at least twelve characters" and "One
 * pattern per line" are still true while the field is wrong, and swapping them
 * removes the instruction exactly when it is needed.
 *
 * # required renders an asterisk that is aria-hidden
 *
 * The `required` attribute on the control is what assistive technology announces.
 * The asterisk is the visual echo, and leaving it readable produces "Password star"
 * on top of "Password required" — the same fact twice, once as a symbol.
 *
 * # Deliberately absent
 *
 * Validation. Field renders an error it is given; it does not decide there is one.
 * A primitive that validates has to hold a schema, and then every form in the
 * product is shaped by whichever schema library this file imported.
 *
 * A horizontal layout variant. `display: grid` with a gap, and a caller that wants
 * label-beside-control writes that grid where the form is.
 */
export {};
