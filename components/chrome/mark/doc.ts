/**
 * Mark — the product glyph: four arcs opening outward from a centre dot.
 *
 * It is drawn rather than imported as an asset because it is inlined at three
 * sizes and takes `currentColor` from whatever it sits in — the rail tints it
 * with the accent, a disabled state would grey it, and a file cannot do either
 * without a second copy.
 *
 * `aria-hidden` is unconditional and there is no `title` prop. Everywhere this
 * appears it sits beside or inside something that already has an accessible name,
 * and a second announcement of the product name on every screen is noise. A caller
 * that needs it named names it on the wrapper.
 */
export {};
