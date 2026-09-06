/**
 * The style layer: what a colour is allowed to be, and who is allowed to win.
 *
 * # Cascade layers are the tier model, not tidiness
 *
 *     reset · token · base · primitive · composition · screen · override
 *
 * The order is the whole point. A screen's module always beats a primitive's
 * because it sits in a later layer, so a caller can override a primitive
 * WITHOUT raising specificity — no `!important`, no `.button.button`, no
 * ordering games in the bundler. Specificity inside a layer still applies;
 * across layers it does not, and that is what makes the rule followable
 * rather than merely stated.
 *
 * The alternative was one flat sheet with a naming convention. It was declined
 * because a convention is enforced by whoever reviews the diff, and this is
 * enforced by the engine.
 *
 * # Two colour tiers, and a component may only see one
 *
 * `primitives.css` is the palette and nothing else — raw values, no meaning.
 * `semantic.css` gives each value a job. A component reads `--ink-3`, never
 * `--neutral-500`, because a component that reaches into the palette has
 * pinned a colour to a theme and will be wrong in the other one.
 *
 * # Three theme states, and the third is the one that gets forgotten
 *
 *     explicit dark    :root[data-theme="dark"]  — the toggle
 *     explicit light   :root[data-theme="light"] — the toggle
 *     system default   neither stamped; prefers-color-scheme decides
 *
 * This tree is dark-first, so bare `:root` carries the DARK palette and the
 * light one is redefined twice: once inside `@media (prefers-color-scheme:
 * light)` guarded by `:not([data-theme="dark"])`, and once under
 * `[data-theme="light"]`. The guard is what lets an explicit dark choice beat
 * a light OS. Every token is defined on bare `:root` before either block
 * touches it — a token that exists only inside a media query does not exist in
 * the default state, which renders one theme's text on the other's ground.
 *
 * # The text ladder was measured, not chosen
 *
 * `--ink` through `--ink-4` are monotonic in prominence in BOTH themes, and the
 * bottom two moved after being measured against a render rather than eyeballed.
 * `--ink-4` carries timestamps, chart axis labels and facet counts — small text
 * that is information, not decoration — and an earlier pass had it at 2.81:1 in
 * light and 2.72:1 in dark. Both now clear 4.5:1 nominal. Reading a screenshot
 * missed it twice; sampling the pixels and computing the ratio found it in one
 * pass.
 *
 * # The accent is also the healthy state, and that is a constraint
 *
 * Green says "clickable" and green says "fresh". Nothing may therefore be
 * distinguished by hue alone: every state carries a glyph and a word as well —
 * `●` present, `—` none, `··` never checked. That rule is not a style
 * preference, it is the only thing keeping a status legible when the accent and
 * the success colour are the same family.
 *
 * # Deliberately absent
 *
 * A utility layer. The token tiers and the cascade order already decide what a
 * caller may override, and a utility layer competes with them for the same
 * decisions.
 *
 * A `--space-0`. Zero is zero; naming it invites `var(--space-0)` in places
 * that mean "no gap" and hides that from a reader.
 */
export {};
