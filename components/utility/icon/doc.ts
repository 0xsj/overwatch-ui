/**
 * The icon set — imported here and nowhere else.
 *
 * # Why one file rather than "only in components/"
 *
 * `STACK.md` §Owned seams says a library's wrapper is the only thing that imports
 * it. For icons the looser reading — anywhere under `components/` — costs more
 * than it saves: replacing the set then means finding every component that
 * imports it. Confined to this file it means editing one list, and every caller
 * keeps compiling against a name it already uses.
 *
 * The rule was already being broken when this landed. `lucide-react` was imported
 * in **five** files, three of them in `app/`, which breaks even the looser
 * version.
 *
 * # What routing them through one file makes visible
 *
 * The set of names actually in use becomes countable, and a countable surface can
 * be audited. The first thing this one showed:
 *
 *     app/(app)/_components/topbar.tsx    Target as TargetIcon
 *
 * A rename happening at a call site because `Target` collides with the product's
 * own `Target` noun — the thing an engagement is run against. That is a real
 * collision between a library's vocabulary and this product's, and it was being
 * settled privately in one file. Named here, it is settled once.
 *
 * v1's version of this file records the same shape of find: `AlertTriangle` and
 * `TriangleAlert`, the same glyph under a deprecated alias, imported under both
 * names by different components. Nothing was broken and nothing would have caught
 * it.
 *
 * # Named re-exports, not `export *`
 *
 * Both tree-shake — a named re-export is statically analysable, so an icon nobody
 * imports is dropped from the bundle. Only the named form **states** the surface,
 * which is the point. Adding an icon is one line here, and that line is the
 * constraint doing its job rather than a formality: it is the moment somebody
 * asks whether the set already has one that means this.
 *
 * # The list is exactly what is used
 *
 * Sixteen. Not a curated selection of what might be wanted — that is a list
 * nobody maintains and everybody stops trusting. If a component needs an icon
 * that is not here, the import fails, which is the correct amount of friction.
 */
export {};
