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
 * # Deliberately absent
 *
 * **An animation.** Radix publishes `data-state="open"/"closed"` and keeps the
 * element mounted through an exit animation, so it is a stylesheet change when it
 * is wanted. It is not here because motion on an overlay is a decision about the
 * product's feel, and nothing has been decided.
 *
 * **A `size` prop.** One width, capped against the viewport. A dialog wide enough
 * to need a second size is usually a screen.
 */
export {};
