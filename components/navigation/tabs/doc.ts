/**
 * Tabs — switches a panel in place, and never a route.
 *
 * # The distinction, which the mock's own control hides
 *
 *     Flat | Chain      swaps content in place            -> Tabs
 *     Canvas | List     carries data-go, loads a page      -> two NavLinks
 *
 * Identical to look at. Using Tabs for the second announces `role="tab"` on
 * something that navigates, wires `aria-controls` to a `tabpanel` that does not
 * exist on the page being left, and puts arrow-key selection on a control where
 * arrow keys should do nothing.
 *
 * **The test is whether the URL changes.** If it does, it is navigation.
 *
 * # The tab stop is the LIST, not the trigger
 *
 *     [role="tablist"]   tabindex="0"     the single tab stop
 *     [role="tab"]       tabindex="-1"    until one is interacted with
 *
 * Roving tabindex, working. Tab enters the group once instead of stopping on every
 * tab, and arrow keys move within it. Written down because the obvious "fix" —
 * `tabindex="0"` on every trigger — is a regression that looks like an
 * improvement, and reading the triggers alone suggests the group is unreachable
 * when it is not.
 *
 * # activationMode is left automatic
 *
 * Arrow keys change the selected tab as they move, which is right when switching
 * is free and wrong when a tab triggers a fetch — arrowing past three tabs would
 * start three requests. The first tab set that loads something needs
 * `activationMode="manual"`.
 */
export {};
