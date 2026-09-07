/**
 * Switch — a setting that takes effect when you press it.
 *
 * # Switch, Checkbox and Toggle are three different things
 *
 *     Switch     role="switch". A state of the SYSTEM, applied immediately.
 *                "Refuse loud tools outside the declared range"
 *     Checkbox   role="checkbox". A value in a FORM, applied when submitted.
 *                "Include withdrawn invitations" beside a Save button
 *     Toggle     a button with aria-pressed. A view or a mode, not data.
 *                A filter chip, a formatting mark
 *
 * They are interchangeable to look at and none of the three substitutes for
 * another. The test that separates the first two: **does pressing it change
 * anything before you press Save?** If yes it is a switch; if it waits for a
 * submit it is a checkbox in a form.
 *
 * Getting it wrong is not cosmetic — a switch in a form is announced as a switch
 * and implies its change has already happened, so somebody navigates away
 * believing they have saved.
 *
 * # No indeterminate
 *
 * A switch is on or off. There is no third state to announce, which is the other
 * difference from a checkbox and the reason the two cannot share an
 * implementation.
 *
 * # The thumb transition is the only animation in the catalogue
 *
 * `transform` on the thumb, `--dur-1`. It is here rather than in `Dialog` or
 * `Tooltip` because a switch that jumps gives no feedback about which way it
 * moved, and direction is the whole affordance.
 */
export {};
