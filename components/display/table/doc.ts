/**
 * Table — pure markup, and the four things a hand-rolled one always misses.
 *
 * Every screen the backend is currently building is a table: members, audit log,
 * targets, journal. This is the markup underneath all of them and it knows
 * nothing about the product.
 *
 * # It is always inside its own scroll container
 *
 * `Table` renders the wrapper itself rather than trusting a caller to add one. A
 * table is the one element that reliably outgrows its column, and a page that
 * scrolls sideways because of one is the failure this prevents by construction —
 * the wide-content rule, held by the component instead of by attention.
 *
 * # `<caption>`, visually hidden
 *
 * A table needs an accessible name; a screen reader announces the caption before
 * it and counts it in the table's summary. It is hidden by default because the
 * `<h1>` or panel heading above usually says the same thing to a sighted reader,
 * and repeating it is noise.
 *
 * Hidden, not absent. `aria-label` on the table would work and is invisible in
 * the markup — a caption is the element the platform provides for exactly this,
 * and it survives being copied into a document.
 *
 * # `scope="col"` by default
 *
 * A `<th>` with no scope is ambiguous in any table with row headers, and the
 * default is the case that is almost always right. A row header passes
 * `scope="row"` and is then saying something.
 *
 * # `numeric` is alignment AND tabular figures
 *
 * Right-aligned with `font-variant-numeric: tabular-nums`. A column of figures
 * that does not line up is a column nobody can read downward, which is the only
 * reason to put figures in a column.
 *
 * # Sticky heads need a background
 *
 * `position: sticky` alone lets rows scroll *through* the header. The rule sets
 * `--surface-panel` on the sticky cells, which is the bug everybody ships once.
 *
 * # Deliberately absent
 *
 * **Sorting, filtering, selection, pagination, virtualisation.** All of them are
 * `DataTable`, and `DataTable` waits on a decided list envelope —
 * `{items, next_cursor}` versus `{data, total, page}` decides its entire API, and
 * nothing has decided. Guessing here would put the guess in every screen.
 *
 * **A `rows` prop.** A table that takes data renders the product's shapes, and
 * this one deliberately does not know any.
 */
export {};
