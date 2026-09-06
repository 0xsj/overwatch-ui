/**
 * ThemeToggle — three buttons, because the theme has three states and not two.
 *
 * # Why it is a composition rather than a primitive
 *
 * It holds state and it reaches for the document. A primitive in this tree does
 * neither: it takes props and returns markup, and stays renderable on the server.
 * This one is `"use client"` and mutates `documentElement`, so it sits a tier up —
 * `@layer composition` — and a screen may still beat it.
 *
 * # The third state is the default, and it is the one people forget
 *
 *     system   NO attribute on <html>. prefers-color-scheme decides
 *     light    data-theme="light"
 *     dark     data-theme="dark"
 *
 * `system` removes the attribute rather than writing `data-theme="system"`,
 * because the semantic layer's guard is `:root:not([data-theme="dark"])` inside
 * `@media (prefers-color-scheme: dark)` — a third attribute value would satisfy
 * that selector and work by accident, and then break the day somebody writes a
 * `[data-theme]` rule that assumes the attribute names a real palette.
 *
 * The state that matters is the ABSENCE of the attribute. Storing "system" as a
 * value would be the same mistake this product refuses one layer down, where an
 * unattempted check is not a check that returned nothing.
 *
 * # It ADOPTS the document's theme on mount; it does not assert over it
 *
 * The obvious shape writes the attribute from an effect keyed on the state:
 *
 *     useEffect(() => { apply(choice) }, [choice])   // WRONG
 *
 * That runs on mount with the initial state, so hydration **erases** whatever
 * `data-theme` the document already carried. Anything that set the attribute
 * before hydration — a persistence script, a server-rendered preference, a test
 * harness — is silently undone about 40ms after first paint, and the page then
 * flips to whatever `prefers-color-scheme` says.
 *
 * It was found by trying to screenshot the light theme: `data-theme="light"` was
 * stamped on `<html>` at build time, the CSS was verified correct in the shipped
 * bundle, and the render still came back `#121212`. The stylesheet was never the
 * problem.
 *
 * So the mount effect only READS, and the write happens in the click handler —
 * the one place a change is actually intended.
 *
 * # It does not persist, and that is a gap rather than a decision
 *
 * A reload returns to `system`. Persisting needs `localStorage` plus an inline
 * script in `<head>` to apply the stored value before first paint — without that
 * script the page flashes the wrong theme, which is worse than not persisting.
 * That script is a real decision about what runs before hydration and it is not
 * made yet. **The shape above is what makes it possible at all**: a component
 * that asserted its state on mount would erase the script's work every time.
 *
 * # Why `aria-pressed` and not a radio group
 *
 * Three toggle buttons where exactly one is pressed IS a radio group, and a real
 * `<fieldset>` of radios would be more correct. It is not that because the visual
 * is three icon buttons in a segmented control, and styling native radios into
 * that shape means hiding the input and painting the label — which is how a
 * control ends up unreachable by keyboard.
 *
 * `role="group"` with a label, plus `aria-pressed` per button, announces the state
 * of each and is navigable with Tab rather than with arrows. The trade is stated:
 * a radio group would be one tab stop, this is three.
 */
export {};
