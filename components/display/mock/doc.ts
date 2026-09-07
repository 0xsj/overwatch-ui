/**
 * Mock — the badge that says a number on this screen was not measured.
 *
 * The product refuses to overstate what it knows: an unmeasured total renders as
 * `–` and never as `0`, a source `observed` rather than `knew`, and a severity
 * names who assigned it. A screen of convincing fixture data with no marking is
 * the same error one level up, and it is the one most likely to be believed —
 * because it looks finished.
 *
 * So it is a component rather than a habit. One word, one colour, one import.
 * Hand-rolling a warn `Badge` per screen produces "sample", "demo", "fixture" and
 * "placeholder" within a month, and then none of them can be searched for.
 *
 * # Two claims that look the same and are not
 *
 *     the topbar's badge     this BUILD has no server. Gated on `usingFixtures`,
 *                            because that is a fact `lib/root` actually knows
 *
 *     a screen's badge       THIS screen's endpoint is a proposal. Declared by
 *                            the screen, and NOT gated on anything
 *
 * The second is deliberately manual. Gating a screen badge on `usingFixtures`
 * would remove it the day a backend appears — including from the screens whose
 * endpoints that backend does not serve, which is most of them for a long while.
 * A badge left on real data understates confidence; a badge removed from fixture
 * data overstates it. Only one of those is safe to get wrong.
 *
 * # Why the reason is in the DOM and not only in `title`
 *
 * `title` is a tooltip: it is not reliably announced by screen readers, it does
 * not appear on touch, and it is invisible in a screenshot. The word "mock" alone
 * is four letters of jargon. The full sentence is in a visually hidden span, so
 * the badge reads as *"mock — Fixture data. Nothing here was measured…"* to
 * anything that is not a pointer.
 *
 * # Yellow, and not red
 *
 * `--warn`, not `--crit`. Fixture data is not an error and not a failure; it is a
 * statement about provenance. Red is reserved for something being wrong, and
 * spending it here would make the real ones quieter.
 */
export {};
