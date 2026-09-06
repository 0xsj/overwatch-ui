/**
 * The entity canvas — the one screen where the data model is geometry.
 *
 * `decisions/0003` says an entity graph carries exactly two edge kinds and only
 * one of them is a claim. Everywhere else that is a sentence in a record; here it
 * is a solid line and a dotted arrow, and a reader who has never opened the
 * record can see that one of them has a confidence beside it and the other never
 * could.
 *
 * # The mock puts the claim on the node, and that is wrong
 *
 * `drafts/mock/overwatch.html` gives each node a `state`, a `claimant`, a `conf`
 * and a `basis`. Per `0003` those belong to the **attribution**, which is an edge:
 * a fragment is a thing, and the assertion that it belongs to this root is a
 * separate object with its own author. The transcription moved them, and the
 * shape is better for it — `Attribution` and `Derivation` are disjoint, so a
 * derivation *cannot* be given a confidence by a later edit, and the renderer's
 * one `switch` is exhaustive against `never`.
 *
 * # Known: the cert canvas draws derivations from its root
 *
 * `0003` says a derivation runs fragment → fragment. Six of the cert graph's ten
 * run from the root. That is not sloppiness in the fixture — the root there *is* a
 * certificate, and "SAN entry" genuinely runs from that certificate to a host. The
 * modelling question it exposes is real and unsettled: **an entity's own defining
 * fragment is not currently a node**, so the canvas lets the root stand in for it.
 * Recorded rather than quietly fixed, because fixing it either way changes a
 * sealed contract.
 *
 * # Layout is computed, arrangement is pinned
 *
 * The graph carries no coordinates. It is derived and it changes every run, so a
 * stored position is a write-path concern on an ingest pipeline: a run adding two
 * hundred fragments either lands them all at the origin or forces a re-layout that
 * destroys whatever arrangement existed.
 *
 * So `place()` is a pure deterministic function of the graph, and what persists is
 * a **pin** — "I decided this node goes here" — with everything unpinned laid out
 * around the pins. Six pinned nodes stay exactly where somebody put them while
 * tomorrow's forty new fragments flow around them. A full coordinate set has no
 * such property, which is the argument for pins and it is not a tidiness one.
 *
 * A slot belongs to a node's index in the server's ordering and is never
 * reassigned when something else is pinned. Pinning one node must not move every
 * other node, or the arrangement is not an arrangement.
 *
 * Pin coordinates are **layout units, not viewport pixels** — that is what makes
 * one survive a resize, a zoom and somebody else's monitor.
 *
 * # The neighbourhood, and why truncation is not a rendering concern
 *
 * `getGraph(root, { limit })`. The server decides what a neighbourhood is and
 * reports `total` against what it returned. The mock does the opposite — fetches
 * sixty-three and draws fourteen — and that framing stops working at four
 * thousand, where the client is already holding the thing it cannot draw.
 *
 * This is the only lever that scales, because **virtualisation does not work on a
 * graph**: a table renders thirty of four thousand rows because rows are
 * independent, and an edge connects to something off screen. A canvas does not
 * scale by drawing more cleverly. It scales by asking for less, which is why
 * `/entities/all` is the other half of this screen and not a second opinion about
 * it.
 *
 * "Ask for all 63" is a navigation, not a toggle: the URL carries the limit, so
 * the expensive view is one somebody chose and can link to.
 *
 * # Drag state is a ref
 *
 * `pointerdown` and the first `pointermove` can arrive in one task. Drag state in
 * `useState` therefore drops the beginning of every fast gesture, because the
 * move handler closes over a `null` that has not re-rendered yet. Only the live
 * position is state, because only it needs to paint.
 *
 * # Edges are clipped to the node boundary, at both ends
 *
 * Drawn centre to centre they run *under* the label they point at, and thirteen
 * of them converge under the root — the node the whole canvas is about. `clip()`
 * moves each endpoint to where the segment crosses that node's box. It has to
 * happen at both ends of every edge and not only at the root, because the same
 * crossing happens quietly on every other node and reads as clutter rather than
 * as a bug.
 *
 * A line can still pass *through* a node that happens to lie between its two
 * ends. That is unavoidable with straight edges, and the root is given an opaque
 * ground and a z-index so it is never read through — the accent tint it had
 * before is translucent, which is what let the lines show through it.
 *
 * # Wheel zoom, and the way back
 *
 * Anchored on the pointer: whatever is under the cursor stays under it, which is
 * the difference between zooming and being moved somewhere. The listener is
 * attached manually with `{ passive: false }` because React's `onWheel` cannot
 * `preventDefault`.
 *
 * The canvas is 600px tall inside a scrolling page, so a wheel handler that always
 * swallows the event traps somebody trying to scroll past it. The default is
 * prevented **only when the zoom actually moved**: at either limit the event falls
 * through and the page scrolls. That is the escape, and it is the reason the min
 * and max are not merely cosmetic.
 *
 * Panning is deliberately not clamped — a clamp fights a person arranging a
 * canvas, and `Fit` is the way back from anywhere.
 *
 * # Deliberately absent
 *
 * **Accept and reject.** The mock offers them in its drawer. They are the one
 * action here that changes what the record claims, they imply an audit entry, and
 * `0004` governs what an override must carry. That is its own slice, not a button.
 *
 * **Wheel zoom.** The canvas sits inside a scrolling page, and a wheel handler
 * that calls `preventDefault` traps the page scroll at the exact moment somebody
 * is trying to get past it. Buttons and background-drag, as the mock has.
 *
 * **A similarity edge.** §Scope refuses it, and this is the screen where the
 * refusal is legible: possible pairings grow with the square of the corpus while
 * real ones grow linearly.
 */
export {};
