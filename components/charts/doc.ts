/**
 * charts — two frames, six layouts, four encodings, wearing sixteen names.
 *
 *     _kernel/scale    linear · band · diverging · nice ticks. Pure
 *     _kernel/layout   force · concentric · circular · tiered · columns · grid
 *     _kernel/encode   area · categorical hue · diverging hue · shape
 *     plot-frame       axes, grid, rules, plot area
 *     graph-frame      nodes, edges, hulls, hover
 *     *.tsx            sixteen presets over those two
 *
 * # Why sixteen names and not sixteen components
 *
 * Read against a page of published figures, eleven node-link diagrams separate
 * on three questions and no more: does position mean anything, does shape carry
 * a class, and is there an annotation layer behind the graph. The five
 * statistical plots share one frame and differ in their mark. So a preset here
 * is a choice of layout and encodings, and a preset that needs its own component
 * is the signal that a FOURTH question exists — which is worth noticing rather
 * than absorbing quietly.
 *
 * # Performance, measured rather than assumed
 *
 * The folklore is that SVG dies around two thousand elements. Measured in this
 * application, on this machine, inserting marks and forcing layout:
 *
 *       500 marks    1 ms          10,000 marks   14 ms
 *     2,000 marks    4 ms          20,000 marks   29 ms
 *
 * So creation is linear and cheap, and the ceiling is not there. The cost that
 * matters is INTERACTION, and the measurement that matters is what a hover
 * costs. Two routes, N marks, style recalc forced:
 *
 *                    css toggle    per-mark write
 *       2,000 marks       2 ms          2 ms
 *      10,000 marks     7.4 ms        9.1 ms
 *      20,000 marks    14.8 ms         18 ms
 *
 * **They are close, and that is the honest result.** The browser recalculates
 * style for N elements either way. The reason this library still routes every
 * interaction through a `data-*` attribute and a CSS selector is not DOM
 * throughput — it is that the per-mark route in React also costs reconciliation,
 * a new array, and any measurement the renderer had cached.
 *
 * That is not theoretical. This codebase's entity canvas flickered on every
 * hover because the highlight lived in the node array: React Flow replaced all
 * fourteen nodes, lost their `measured` boxes, and twenty-three edges fell back
 * to a default radius for a frame. The DOM writes were never the problem; the
 * invalidation was.
 *
 * **The practical ceiling is about 10,000 interactive marks** — at 20,000 a
 * single hover costs 15 ms and the frame budget is 16.7. Above that the answer
 * is a canvas mark layer behind the same frames, or fewer marks. `Matrix` is the
 * one that gets there first, because a matrix is quadratic: 500 assets by 12
 * checks is 6,000 cells before anybody has done anything unusual.
 *
 * # Colour was computed, not chosen
 *
 * Every value in `styles/tokens/chart.css` went through the six-check validator
 * on each theme's own surface. The result that shaped the API: SIX categorical
 * slots pass when only adjacent pairs are compared and FAIL when any two might
 * be — teal against blue at ΔE 10.7 for normal vision, amber against green at
 * 7.1 for a deuteranope. Four pass all pairs on both themes.
 *
 * So `categorical()` returns `null` past the fourth slot rather than cycling. A
 * cycling palette is what makes a chart repaint its survivors when a filter
 * changes the series count, and a caller that gets `null` has to fold the
 * category into `other`, facet, or use small multiples — which is the correct
 * answer and not a limitation.
 *
 * # Determinism, and the one function that broke it
 *
 * Every layout is a pure function of its input, and the same graph must place
 * identically on the server and in the browser or React reports a hydration
 * mismatch. Single-shot layouts survive `Math.cos` because the output is
 * quantised. `force` does not: it is CHAOTIC, so a one-ULP difference between
 * Node's `Math.hypot` and the browser's is amplified by 220 iterations of
 * feedback into five pixels of divergence, and no rounding at the end can
 * recover it.
 *
 * The loop therefore contains no implementation-approximated function at all —
 * `sqrt` and `+ - * /` only, all exactly specified by IEEE-754 — and the seeding
 * is arithmetic on a hash rather than a point on a circle. That is why
 * `STACK.md`'s refusal of a graph library does not apply here: the objection was
 * to non-determinism, and determinism is a property this implementation has and
 * a physics library does not.
 *
 * # What this deliberately is not
 *
 * Not a replacement for `@xyflow/react`. The two canvases in this application
 * are APPLICATIONS — drag, minimap, pan, a node that is a React component — and
 * should keep it. A chart is a picture that has to print and render on a server,
 * and it should not carry a node editor's runtime to do that.
 *
 * Not a time-series library. There is no time scale, because a real one needs
 * calendar-aware ticks and that is the first thing here that would justify a
 * dependency rather than fifteen lines.
 */
export {};
