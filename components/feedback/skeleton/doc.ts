/**
 * Skeleton — a bar where text has not arrived.
 *
 * # `aria-hidden`, and no live region
 *
 * A screen reader should hear the loading state ONCE, from whatever owns it — a
 * line of text saying so, or `aria-busy` on the region. Forty bars each
 * announcing themselves is the accessible version of a flashing screen.
 *
 * This is the opposite decision from `Alert`, and for the same reason: a message
 * about the system is worth announcing; a placeholder for one is not.
 *
 * # A pulse, not a sweep
 *
 * The travelling-highlight version needs a moving gradient, which costs a
 * compositor layer per bar. Forty of those in a table makes the loading state
 * slower than the data it is standing in for. Opacity animates on the compositor
 * for free.
 *
 * Wrapped in `prefers-reduced-motion: no-preference`, so the bars are still
 * bars for somebody who has asked for stillness.
 *
 * # `width` is a prop, and callers should vary it
 *
 * A column of identical bars reads as a pattern — a striped placeholder graphic
 * — rather than as text that has not arrived. Varying the widths is what makes
 * it read as content. The component cannot do that for a caller because it does
 * not know how many there are.
 *
 * # `block-size` defaults to `0.8em`
 *
 * Relative to the text it replaces, so a skeleton in a heading is heading-sized
 * without anybody passing a number. That is the whole reason it is `em` and not
 * a token.
 */
export {};
