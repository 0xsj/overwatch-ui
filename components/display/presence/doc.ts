/**
 * Presence — found · looked-for-and-absent · never-looked-for.
 *
 * The most-repeated rule in the product, and the one it exists to hold.
 * The workspace scope document lists it twice among the four pairs that must never collapse
 * into one field:
 *
 *     never checked  vs  found nothing     nobody asked / asked and got no answer
 *     never checked  vs  not applicable    nobody asked / there is no question
 *
 * A screen that renders the first two identically has told somebody an asset is
 * clean when in fact nothing looked at it. That is the failure this product is
 * about, appearing in a table cell.
 *
 * # It is a union, and there is deliberately no `fromNullable`
 *
 *     Presence<T> = { present, value } | { absent } | { unattempted }
 *
 * A `T | null` cannot say which of the two empty states it is, so a helper that
 * turned one into the other would make the collapse a one-liner and put it behind
 * a friendly name. Whoever knows which state it is has to say so — usually the
 * server, which is the only party that knows whether a check ran.
 *
 * The type lives in `lib/kernel` and not here: it is vocabulary, shared by
 * services that produce it and components that render it, and the kernel is the
 * tier both may import. `Presence<ReactNode>` is how this component narrows it.
 *
 * # Three signals, and colour is the fourth
 *
 *     present      ●   the value          ink, accent glyph
 *     absent       —   none               ink-3, quiet glyph
 *     unattempted  ··  never checked      ink-4, ITALIC, dotted underline
 *
 * Glyph, word and typography — each state is distinguishable with the colour
 * removed, which is the same rule `Badge` holds and matters more here, because
 * the two states that look alike are exactly the two that must not.
 *
 * The italic and the dotted underline are doing the work. Two greys are two
 * greys; an italic with a dotted rule under it is a different *kind* of thing,
 * and that reads at a glance in a column of forty rows.
 *
 * # `compact` hides the word, and never drops it
 *
 * A dense table wants the glyph alone. The word moves into a `VisuallyHidden`
 * rather than disappearing — a screen reader still hears "none" or "never
 * checked", because the distinction is the point and a bare glyph carries none
 * of it.
 *
 * # Deliberately absent
 *
 * **A fourth state for "not applicable".** §Scope names it — an ASN has no TLS,
 * per `0011` — and it is genuinely different from "nobody asked". It is not here
 * because nothing produces it yet, and a fourth arm added now would be a guess
 * about how the server spells it. When it lands it is one member and one glyph,
 * and every `switch` over the union fails to compile until it is handled, which
 * is the property the union was chosen for.
 *
 * **A `tone` prop.** The state IS the tone. A caller that wants an `unattempted`
 * cell to look reassuring is defeating the component.
 */
export {};
