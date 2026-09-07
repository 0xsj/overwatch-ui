/**
 * Portal — render into a different part of the document.
 *
 * A thin pass-through over Radix's, and the wrapper exists for the reason every
 * wrapper here exists: `radix-ui` is an owned seam, so `components/` imports it
 * and nothing else does. A screen that imported `radix-ui/Portal` directly would
 * work, and would be the first crack in the only rule that makes the library
 * replaceable.
 *
 * # Why a portal at all
 *
 * An overlay rendered where it sits in the tree inherits that place's `overflow`,
 * `transform` and stacking context. A dropdown inside a scrolling table is then
 * clipped by the table; a tooltip inside the entity canvas — which has a
 * `transform` on the field — gets that transform applied to it and lands
 * somewhere else entirely. Both are the same bug and neither is fixable with
 * z-index.
 *
 * Radix's is used rather than `createPortal` directly because it is SSR-safe: it
 * renders nothing on the server and mounts on the client, instead of reaching for
 * `document.body` during a server render.
 *
 * # Built before its callers, deliberately
 *
 * Nothing portals yet. It is here because every overlay in the catalogue needs it
 * and building them without it would produce four private copies — the same
 * argument that made the catalogue worth building up front rather than one screen
 * at a time.
 */
export {};
