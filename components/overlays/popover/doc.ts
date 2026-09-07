/**
 * Popover — arbitrary content beside the page. Not a menu, and not a dialog.
 *
 * # Not a menu
 *
 *     DropdownMenu   ACTIONS. Arrow keys move between items, which are commands
 *     Select         a VALUE, bound to a form
 *     Popover        ARBITRARY content, including things you can put a cursor in
 *
 * A filter panel with three inputs and an Apply button is a popover. Putting it in
 * a menu makes every input a menu item, so arrow keys move focus off the field
 * somebody is typing in.
 *
 * # Not a dialog
 *
 *     Dialog     traps focus, hides the page behind it, demands a decision
 *     Popover    focus moves in, Escape closes, a click outside dismisses — and
 *                the page stays reachable and is NOT aria-hidden
 *
 * That is the whole difference: a popover is beside the page, a dialog is over it.
 * Getting it backwards is how a filter panel ends up blocking the table it
 * filters.
 *
 * # PopoverAnchor
 *
 * Position against something other than the trigger — a table row, a canvas node —
 * so a toolbar button can open a popover pointing at the row it acts on. Exported
 * now because the alternative when it is wanted is a second component.
 *
 * # No caller
 *
 * The topbar's org and target crumbs are the obvious ones, and they are
 * deliberately links rather than switchers because there is no second organisation
 * and no list endpoint. When that lands, this is the component.
 */
export {};
