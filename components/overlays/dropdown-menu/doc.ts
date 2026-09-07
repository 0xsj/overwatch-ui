/**
 * DropdownMenu — a menu of ACTIONS, opened by a control the person chose to press.
 *
 * # What it is not
 *
 *     DropdownMenu   actions. "Sign out", "Delete". Not a form control, and the
 *                    thing it opens over does not hold a value
 *     Select         a value, bound to a form. Has a name, submits, and is
 *                    announced as a combobox
 *     Popover        arbitrary content, including inputs. Not a menu, so arrow
 *                    keys do not move between its children
 *
 * They look identical and are three different widgets to a screen reader. Using a
 * menu for a value is the most common of the three mistakes: it announces the
 * options as commands, and there is nothing for a form to submit.
 *
 * # Why every part is wrapped when most of them add nothing
 *
 * `DropdownMenu` and `DropdownMenuTrigger` are pass-throughs. They exist because
 * `radix-ui` is an owned seam: a caller that imported `Root` directly and our
 * `Content` beside it would work, and would make the library un-replaceable one
 * import at a time. The rule is only enforceable if it has no exceptions,
 * including the ones that would cost nothing today.
 *
 * # Content portals itself, and that is not optional
 *
 * `Primitive.Portal` wraps `Primitive.Content` here rather than being left to the
 * caller. A menu rendered in place inherits its ancestors' `overflow` and
 * `transform`: inside a scrolling table it is clipped, and inside the entity
 * canvas — whose field carries a `transform` — it is displaced, because a
 * transform creates a containing block that no `z-index` escapes.
 *
 * Both are bugs a caller finds late and diagnoses as something else. Making the
 * portal part of `Content` means the failure cannot be reached.
 *
 * # data-highlighted, never :hover
 *
 * Radix drives pointer and keyboard through one attribute, so exactly one item is
 * lit at a time. Styling `:hover` instead produces the classic two-cursor bug: the
 * keyboard cursor on one item and the mouse highlight on another, with Enter
 * activating the one that is not under the pointer.
 *
 * # The width is measured from the trigger
 *
 * `--radix-dropdown-menu-trigger-width` — a menu narrower than the control that
 * opened it reads as a different object rather than as that control expanding.
 * Floored at 200px so a small trigger does not produce an unreadable menu, and
 * capped against the available width so it never opens off-screen.
 *
 * # `destructive` is a boolean and not a tone
 *
 * There is one destructive action per menu or the menu is badly designed, so
 * there is nothing to enumerate. Colour is not the whole signal either: it is
 * `--crit` text with a `--crit-tint` highlight, so the state is visible in the
 * highlight as well as the ink.
 *
 * # Deliberately absent
 *
 * `Sub`/`SubTrigger`/`SubContent`, `CheckboxItem`, `RadioItem`, `RadioGroup`,
 * `Group` and `Shortcut`. v1 ships all of them; each is a few lines and none has
 * a caller here. They are listed rather than forgotten — a checkbox item is what
 * a column picker wants and a radio group is what a density preference wants, and
 * both arrive with the screen that needs them.
 */
export {};
