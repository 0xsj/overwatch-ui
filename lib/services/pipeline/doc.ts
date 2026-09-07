/**
 * pipeline — a check's chain of tools, and the runs of it. Nothing is served.
 *
 * # Why this is a second canvas at all, and how it avoids being the first one
 *
 * §Scope has ONE `canvas`: *"the node view over entities"*. There, a node is a
 * fragment and an edge is either an attribution (a claim somebody made) or a
 * derivation (something a tool read out of something else) — `decisions/0003`.
 *
 * Here a node is a PROGRAM and an edge is data flowing between two of them.
 * Nothing on this canvas is a claim about the world. Two graphs that look alike
 * and mean opposite things is the failure mode worth guarding against — "this
 * node is something we believe" against "this node is something we run" — so
 * the two are deliberately unalike:
 *
 *     entity canvas          pipeline canvas
 *     golden-angle spiral    columns by depth, left to right
 *     pills with a glyph     cards with a state stripe
 *     straight + dashed      orthogonal connectors
 *     two edge kinds         one, and it is not a claim
 *
 * The viewport is the reusable part — pan, zoom, fit. The node and edge
 * rendering is not, and sharing it is precisely how the two become one.
 *
 * # The layout has no trigonometry, on purpose
 *
 * Depth is the longest path from a source; a column per depth, stacked within
 * it. Deterministic from the graph alone, and it uses only `+ - * /` and
 * comparisons — all of which IEEE-754 specifies exactly.
 *
 * The entity canvas's spiral uses `Math.cos`, whose precision ECMAScript leaves
 * to the implementation, and that produced a hydration mismatch that took a
 * while to find. This layout cannot have that bug rather than being defended
 * against it.
 *
 * # Six invocation states, three of which produced nothing
 *
 *     ok        it ran and wrote bytes
 *     failed    it ran and broke
 *     refused   the spawn gate said this tool may not touch this target
 *     skipped   nobody ran it — upstream produced nothing to feed it
 *     running   in flight
 *     pending   waiting on something upstream
 *
 * `refused`, `skipped` and `failed` all end with no artifact and mean entirely
 * different things. §Scope refuses to collapse `skipped vs failed` — *"nobody
 * ran it / it ran and broke"* — and the spawn gate adds the third. In a table
 * they are three similar strings; on a graph they are a gate that did not open,
 * a node that never started, and a node that broke. That difference is most of
 * the argument for drawing this at all.
 *
 * # What is deliberately not modelled
 *
 * No conditionals, no loops, no expression language, no triggers, no
 * credentials. Each is n8n's product and none is ours — and the moment a
 * conditional exists, this is a general automation engine and every question
 * about it becomes somebody else's roadmap. Fan-out and fan-in are enough for
 * *subfinder → httpx → nuclei*, which is the shape this actually has.
 *
 * A check is a `Check` and not a `Workflow`, because §Scope already has the
 * noun: *"a named question with its own interval"*. The chain is HOW the
 * question is answered; the question is what `coverage` is computed from.
 */
export {};
