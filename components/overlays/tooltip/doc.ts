/**
 * Tooltip — a name you have run out of room for, and never more than that.
 *
 * # What it may not hold
 *
 * Anything a person needs in order to act. It does not exist on touch, cannot be
 * selected or copied, and is gone the moment the pointer moves. A rule, a
 * threshold, an error, a value — all of those belong on the page. The test is
 * whether somebody could complete the task without ever seeing it.
 *
 * # Compound, and it shipped flat first
 *
 * The first version took a `content` prop and wrapped its child, on the argument
 * that a tooltip has one string in one box and nothing to arrange. That argument
 * is not wrong and it lost to a better one: **every component in the catalogue
 * having the same shape is itself a design property.** A caller who has learned
 * `Dialog`/`DialogTrigger`/`DialogContent` should not have to remember that
 * exactly one component in the family takes a prop instead.
 *
 * It also reads better where it is actually used. The rail's tooltip carries two
 * elements, and as a `content={<>…</>}` prop that is a JSX fragment threaded
 * through a prop; as `<TooltipContent>` it is just children.
 *
 * The cost is real and small: two more lines per call site, and `TooltipTrigger`
 * is a pass-through that exists only so the set is uniform.
 *
 * # The duplication trap, which is the reason this file exists
 *
 * Radix wires the content to the trigger as `aria-describedby`. A control whose
 * `aria-label` already equals the tooltip text is therefore announced twice —
 * the rail gave *"Findings, Findings"* on keyboard focus.
 *
 * Neither obvious fix works. Dropping the `aria-label` leaves the control unnamed
 * whenever the tooltip is shut, which is almost always; and there is no switch to
 * keep the content out of the accessibility tree without defeating the point of
 * having a description at all.
 *
 * **The fix is to make the tooltip say something the label does not.** The rail's
 * carry each section's subtitle beside its name; the topbar's carries the keyboard
 * shortcut, which a label cannot. Better copy either way, which is the rare case
 * where the accessible answer and the nicer answer are the same edit.
 *
 * # asChild, so there is no wrapper
 *
 * A `<span>` around the rail's link would take a place in the flex column, add a
 * second focus target and break the 34px grid. The child is the trigger.
 *
 * # pointer-events: none on the content
 *
 * A tooltip is never deliberately pointed at, and one that intercepts a click
 * swallows the press meant for whatever is under it.
 *
 * # The provider is in the root layout
 *
 * It carries the 400ms delay and, more usefully, the skip-delay: once one has
 * opened, moving to a neighbour opens instantly, which is what makes scanning a
 * rail of seven bearable. A `Tooltip` rendered outside a provider throws rather
 * than degrading — a failure that would otherwise appear in one route group three
 * weeks after the component landed.
 */
export {};
