/**
 * Select — a value bound to a form. The third of the three that look identical.
 *
 * # Select, DropdownMenu, Popover
 *
 *     Select         a VALUE. Announced as a combobox, has a name, submits
 *     DropdownMenu   ACTIONS. Its items are commands and nothing holds a value
 *     Popover        ARBITRARY content, including inputs
 *
 * Using a menu where a value belongs is the most common of the three mistakes: the
 * options are announced as commands and there is nothing for a form to send.
 *
 * # Why not a native <select>
 *
 * A native select cannot be styled inside — no icons, no two-line options, no
 * grouping that matches the rest of the system — and its popup is drawn by the
 * operating system, so it ignores the theme entirely. Radix's is a listbox that
 * looks like the rest of the catalogue and keeps the keyboard behaviour: type to
 * jump, arrows to move, Enter to choose, Escape to cancel.
 *
 * The cost is real and worth naming: it is not a real `<select>`, so a browser's
 * native mobile picker is gone, and it needs JavaScript to open. A form that must
 * work without JS wants the native element.
 *
 * # The listbox is never narrower than the trigger
 *
 * `--radix-select-trigger-width`. A value that appears to change width when the
 * menu opens reads as two different controls.
 *
 * # `position="popper"` by default
 *
 * Radix's other mode aligns the selected item over the trigger, which is the macOS
 * behaviour and puts the list on top of the thing you are reading. Popper puts it
 * below, which matches every other overlay here.
 *
 * # Deliberately absent
 *
 * `SelectGroup`, `SelectScrollUpButton` and `SelectScrollDownButton`. Radix has
 * them; no list here is long enough to scroll or heterogeneous enough to group,
 * and both arrive with the screen that needs them.
 */
export {};
