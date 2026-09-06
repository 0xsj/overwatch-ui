/**
 * Button — the actionable primitive, and the one that decides how every other
 * primitive here is shaped.
 *
 * Radix has no Button, because a button needs no behaviour Radix could own: the
 * platform element is focusable, keyboard-operable and self-announcing already.
 * So this borrows exactly one thing — `Slot` — and that one thing is what makes
 * it composable.
 *
 * # A primitive may not create a function prop it was not given
 *
 * The rule this component exists to hold, and it was paid for in the v1 build
 * rather than here: an earlier version synthesised an `onClick` that swallowed
 * the event while inert. It compiled, and then every page rendering a Button
 * failed to prerender —
 *
 *     Error: Event handlers cannot be passed to Client Component props.
 *
 * A function prop cannot cross the server/client boundary, so a component that
 * always attaches a handler — even one that does nothing on the happy path — is
 * silently client-only, and takes every Server Component that renders it with
 * it. Handlers are passed through, never manufactured. Anything that genuinely
 * needs one needs a `"use client"` boundary, and that is the call site's
 * decision rather than a Button's.
 *
 * This is why `inert` gates through `disabled`, `tabIndex` and CSS, and never
 * through a wrapped handler.
 *
 * # asChild beats an `as` prop
 *
 * `<Button asChild><Link href="/x">Go</Link></Button>` renders ONE element: the
 * Link wearing the button's classes. No wrapper, no cloned tag.
 *
 * `as="a"` would have to re-declare the prop types of every element it can
 * become and still could not express *"render whatever component the caller
 * already has"* — which is the case that actually arises, with `next/link`.
 * `asChild` inverts it: the caller brings the element and Slot merges onto it.
 *
 * Slot's merge is not symmetric and the asymmetry matters. Child props win over
 * slot props; `className` and `style` merge; event handlers COMPOSE, child
 * first. A caller's `onClick` is therefore never silently replaced.
 *
 * `Slot.Slottable` marks which child receives the props when there are several,
 * so the spinner renders *inside* the anchor rather than beside it — correct
 * markup, and the only arrangement where the layout survives.
 *
 * # disabled is handled twice, and the second way is incomplete on purpose
 *
 *     native <button>   the real `disabled` attribute. Unfocusable,
 *                       unclickable, announced. Nothing else needed.
 *
 *     asChild           `disabled` means nothing on an <a>, and Slot cannot
 *                       remove `href` — child props win, so passing
 *                       `href: undefined` does nothing. So: `aria-disabled`
 *                       for the announcement, `tabIndex={-1}` to leave the tab
 *                       order, `pointer-events: none` from `[data-disabled]`.
 *
 * That mitigation stops a click and stops tabbing to it. It does NOT stop Enter
 * if something focuses the anchor programmatically, and closing that gap needs
 * exactly the manufactured handler the section above forbids. So the rule is:
 * **do not render a link you do not want followed.** `asChild` with `disabled`
 * is a smell rather than a feature, and the gap is recorded rather than hidden.
 *
 * `data-disabled` carries the state to CSS so one selector covers both branches,
 * instead of `:disabled` plus an attribute selector that must be kept in step.
 *
 * # size="icon" requires aria-label, and the compiler enforces it
 *
 * `ButtonProps` is a union rather than one object. The `icon` size renders no
 * text, so a screen reader has nothing to announce — and that is the single most
 * common accessible-name failure in a component library. Making it a required
 * prop on that branch moves the rule from a review comment to a type error.
 *
 * # type defaults to "button"
 *
 * A `<button>` owned by a form defaults to `type="submit"`. Without this,
 *
 *     <form><Button onClick={apply}>Apply</Button></form>
 *
 * runs the handler AND submits — invisible until the component is first used
 * inside a form, and it then presents as a routing bug rather than a missing
 * attribute.
 *
 * # Why the default intent is secondary
 *
 * A page with two primary buttons has none. The default is the one that is
 * always safe to reach for, so the emphatic one has to be asked for by name.
 *
 * # Deliberately absent
 *
 * A `fullWidth` prop. That is the caller's layout, expressed where the layout
 * is, and a prop for it puts one arrangement's needs inside every button.
 *
 * An icon slot. `<Button><Icon/>Label</Button>` already works and needs no API.
 */
export {};
