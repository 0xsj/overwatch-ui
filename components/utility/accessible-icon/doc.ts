/**
 * AccessibleIcon — an icon that carries meaning, with the meaning attached.
 *
 * # The label is what it MEANS, not what it depicts
 *
 * "Delete", never "wastebasket". "Sort ascending", never "up arrow". A person
 * hearing the page read aloud needs the action, and the picture is an
 * implementation detail of how it was drawn for everyone else.
 *
 * `label` is required rather than optional. An icon carrying meaning with no
 * accessible name is the entire gap this component exists to close, and an
 * optional prop closes it only for people who remember.
 *
 * # It hides the child and adds a sibling, rather than labelling the child
 *
 *     cloneElement(child, { "aria-hidden": "true", focusable: "false" })
 *     <VisuallyHidden>{label}</VisuallyHidden>
 *
 * `aria-label` on the SVG would work in most screen readers and fail in some, and
 * it competes with any `<title>` the icon set already emits. Hiding the graphic
 * outright and putting real text beside it has no such ambiguity: there is one
 * accessible name and it is a text node.
 *
 * `focusable="false"` is for Internet Explorer's descendant — SVG elements are in
 * the tab order in some engines, and an `aria-hidden` element that can be focused
 * is a trap that reads as nothing.
 *
 * # `Children.only`
 *
 * It throws on two children, and that throw is the feature. Two icons with one
 * label is a caller who meant something else, and finding out at render is better
 * than shipping a button whose name describes half of it.
 *
 * # When NOT to use it
 *
 * Most icons in this tree are decorative and sit beside text that already names
 * the thing — the rail's section icons, the glyph in a `Badge`, the kind marker
 * on a canvas node. Those take `aria-hidden` directly. Wrapping them here would
 * make a screen reader say "Findings, Findings".
 *
 * The test is whether removing the icon removes information. `<Button
 * size="icon">` already forces an `aria-label` through its own types, which is
 * the same rule enforced one level up.
 */
export {};
