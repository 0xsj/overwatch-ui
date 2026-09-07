/**
 * AlertDialog — a dialog that interrupts, for a decision with consequences.
 *
 * # Why it is a separate component and not a Dialog with a flag
 *
 * They look identical and behave differently in the two ways that matter:
 *
 *     Dialog          Escape closes it. A click on the overlay closes it.
 *                     Dismissing is free, because dismissing loses nothing
 *
 *     AlertDialog     the overlay does NOT close it, focus lands on the CANCEL
 *                     action rather than the content, and it is announced as
 *                     role="alertdialog". Dismissing is a choice, because there
 *                     is something to lose
 *
 * That is not styling. A stray click that discards an unsaved scope edit is the
 * bug this component exists to prevent, and it is prevented by the primitive
 * rather than by the caller remembering.
 *
 * # Action and Cancel are the whole API
 *
 * `AlertDialogAction` and `AlertDialogCancel` close the dialog when pressed, and
 * Radix puts initial focus on Cancel. Both take `asChild`, so the caller brings
 * its own `Button` and decides which one is `intent="danger"` — the component
 * does not assume the action is destructive, because "discard the draft" and
 * "publish the report" are both alerts and only one is red.
 *
 * # It shares the dialog's stylesheet on purpose
 *
 * `dialog.module.css`, imported directly. Two files with the same rules is two
 * files that drift, and the whole point of the pair is that a person cannot tell
 * them apart by looking — the difference is in what happens when they click
 * outside, which is exactly where a visual difference would mislead.
 *
 * # No close button
 *
 * `Dialog` puts an X in the corner; this deliberately does not. An alert dialog
 * asks a question, and a third way out that is neither answer is how somebody
 * dismisses a question they were supposed to answer. Cancel is the dismissal, and
 * it is a labelled choice.
 */
export {};
