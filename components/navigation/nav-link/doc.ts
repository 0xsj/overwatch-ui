/**
 * NavLink — almost no appearance, and one job: making `aria-current` a decision.
 *
 * # Why the appearance is not in here
 *
 * The rail's link is a 34px icon square, the sidebar's is a full-width labelled
 * row, and the canvas root switcher is a bordered chip with a count. They look
 * nothing alike and they are the same component, because **the reusable half of a
 * nav link is its semantics.**
 *
 * A `variant` union covering the three would put three screens' layout decisions
 * inside a primitive, and the fourth screen would want a fourth. The caller brings
 * the class; this brings the attribute nobody remembers.
 *
 * # `page` and `true` are not interchangeable
 *
 *     page    this IS the page. The sidebar's Report link on /findings/report
 *     true    current, with no more specific relationship. The rail's Findings
 *             link on /findings/report — the SECTION is current, its own page
 *             is not
 *
 * Both were already correct in this tree, in two files, with nothing recording why
 * they differed — which is the same as being correct by accident. `step`,
 * `location`, `date` and `time` are the remaining ARIA-valid values; the union
 * exists so nobody invents `aria-current="active"`, which means nothing.
 *
 * # The off state is absent, not false
 *
 * `aria-current="false"` is announced by some screen readers as though it said
 * something. A falsy `active` produces no attribute.
 *
 * # It does not read the router
 *
 * The rail and sidebar compare a pathname; the canvas root switcher compares a
 * query parameter. Matching is the caller's business and announcing is this
 * component's — and a component that called `usePathname` would drag a client
 * boundary onto every caller that did not need one.
 */
export {};
