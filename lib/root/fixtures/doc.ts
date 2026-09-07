/**
 * The fixtures — the whole product's data, when there is no server.
 *
 * Four files now, and it stopped being a detail of `lib/root` some time ago: it
 * answers three domains, holds mutable state, and generates data on demand.
 *
 * # A route returns `undefined` to mean "not mine"
 *
 * The memory client tries each route in order; `undefined` moves to the next, and
 * falling off the end is a 404 — exactly as a server would. That is why a missing
 * fixture presents as a missing *route* rather than as `undefined` arriving
 * somewhere far away with no explanation.
 *
 * The consequence, which has bitten once: a route that means to answer with
 * nothing must return `null`, not `undefined`. `POST /auth/reset-requests` does,
 * and the comment there is the reason.
 *
 * # `index.ts` is one array, and that is the point
 *
 * Every route in one list, in the order they are tried. A route that exists cannot
 * be unreachable because somebody forgot to register it — which is the failure a
 * per-file registration produces, and it looks exactly like a 404 from a path
 * typo.
 *
 * # State lives here, and it is per process
 *
 * `PINS` is a `Map` that survives across requests because the module does. A
 * server action writes it and a later render reads it, which is what makes the
 * canvas's pins round-trip through the seam for real rather than through local
 * component state.
 *
 * It is gone on restart, and that is stated on the screen rather than hidden: the
 * `mock` badge, and `shell-account`'s note about what the fixture can and cannot
 * do. Backing it with `localStorage` would make the fake remember something no
 * real server has been asked to remember yet.
 *
 * # Generated fragments are seeded, not random
 *
 * `mulberry(key.length * 7919 + total)` — the same canvas twice draws the same
 * sixty-three nodes. A random filler makes every reload a different picture, so
 * nobody can say whether a layout change improved anything.
 *
 * The generator exists because `total` has to be much larger than what is drawn:
 * the truncation notice is a claim about scale, and the only way to know whether
 * the canvas survives sixty-three nodes is to have sixty-three.
 *
 * # The default limit is what was written by hand
 *
 * Not a constant. `GRAPHS[key].nodes.length` — so the first view is the
 * neighbourhood somebody authored, and fillers appear only when a bigger `limit`
 * is asked for. An earlier version defaulted to 14 and silently padded the org
 * canvas with one generated node, which is a fixture lying about its own shape.
 *
 * # Credentials in plaintext, deliberately
 *
 * `sj@31m.example` / `correct-horse-battery`, in the source, at a `.example`
 * address that resolves nowhere. Hiding it behind an environment variable would
 * imply it protects something.
 */
export {};
