/**
 * Dialog — content that takes the page over until it is dismissed.
 *
 * # The obligations, which are why this is never hand-rolled
 *
 * A dialog owes five things, and four of them are invisible until somebody
 * without a mouse tries to use it:
 *
 *     focus moves in           on open, to the content
 *     focus is trapped         Tab cannot leave, so the page behind is not
 *                              silently reachable
 *     focus returns            on close, to whatever opened it
 *     Escape closes            and so does a click on the overlay
 *     the page is inert        aria-hidden on everything else, so a screen
 *                              reader does not read the page underneath
 *
 * Radix does all five. A `position: fixed` div with a backdrop does none, looks
 * identical, and is what the mock's drawer is.
 *
 * # `DialogTitle` is not optional, and Radix will say so
 *
 * The title is the dialog's accessible name — Radix wires `aria-labelledby` to it
 * and logs a warning when it is missing. A dialog announced as "dialog" is a
 * dialog nobody can navigate to on purpose. `DialogDescription` is the same
 * mechanism for `aria-describedby` and *is* optional, because not every dialog has
 * a second sentence.
 *
 * # `side="right"` is a prop, not a Drawer component
 *
 * The mock has a record drawer that slides in from the right, and it is the same
 * object: identical focus trap, identical escape handling, identical labelling. It
 * differs in geometry — anchored to an edge, full height, square corners.
 *
 * A separate `Drawer` would duplicate all five obligations to change four CSS
 * properties, and the duplicate is the one that would fall behind. So the edge
 * sheet is a variant of the dialog, and the name says where it comes from rather
 * than what it looks like.
 *
 * # The close button is inside Content, not left to the caller
 *
 * Every dialog needs one, a caller who forgets it ships a dialog with no visible
 * exit, and it is the same 26px square every time. It carries `aria-label="Close"`
 * because an X is a picture rather than a word.
 *
 * The Escape key and the overlay click still work, and the button is for the
 * person who does not know that.
 *
 * # `modal={false}` and `overlay={false}` go together
 *
 * A record drawer on the entity canvas is the case: somebody opens a node, reads
 * it, and clicks the next node. A modal dialog makes that three actions —
 * dismiss, click, read — and it does that forty times in a sitting.
 *
 * Radix's `modal={false}` keeps the page interactive and stops trapping focus.
 * The overlay has to come off with it, because a non-modal dialog that still
 * paints a scrim leaves an invisible sheet of glass over a page it claims not to
 * be blocking — the clicks go nowhere and nothing on screen says why.
 *
 * They are two props rather than one because the primitive should not decide: a
 * confirmation is modal with a scrim, a drawer is neither, and a settings sheet
 * over a static page is reasonably modal WITHOUT a scrim.
 *
 * # The exit keyframes are separate, not `reverse` on the entrance
 *
 * Radix's Presence decides whether to wait for `animationend` by comparing the
 * computed `animation-name` before and after the state flips. `reverse` keeps the
 * name identical, so it sees no change and unmounts immediately.
 *
 * Measured: the drawer's entrance animated correctly and its exit did not happen
 * at all — the panel vanished, which reads as a bug in the close button rather
 * than as a missing animation. Separate `-out` keyframes fix it, and the fix is
 * invisible in the CSS unless you know why.
 *
 * The sheet slides from its edge; the centred dialog does not slide at all. A
 * drawer that fades in place reads as an overlay that appeared, and one that
 * slides reads as a panel that was already there — which is what a record beside
 * the thing it describes should read as.
 *
 * Every duration is a motion token, and those collapse to `0s` under
 * `prefers-reduced-motion`, so the reduced case needs no separate rule and cannot
 * be forgotten. A 0s animation still fires `animationend`, so the exit stays
 * correct there too.
 *
 * # Deliberately absent
 *
 * **A `size` prop.** One width, capped against the viewport. A dialog wide enough
 * to need a second size is usually a screen.
 */
export {};
