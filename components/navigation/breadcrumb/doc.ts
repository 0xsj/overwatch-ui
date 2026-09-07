/**
 * Breadcrumb — an ordered list that announces its length and your position.
 *
 * # Why the markup carries the meaning
 *
 * A row of anchors separated by slashes is, to a screen reader, a row of anchors
 * separated by slashes. A real `<ol>` inside `nav[aria-label="Breadcrumb"]` is
 * announced as *"list, 3 items, item 2"* — which is the entire information a
 * breadcrumb carries beyond its words.
 *
 * The separators are `role="presentation"` and `aria-hidden`, because a slash read
 * aloud between every crumb stands in for a relationship the list already states.
 *
 * # The last crumb is not a link
 *
 * `BreadcrumbPage` is a `span` with `aria-current="page"`, plus `role="link"` and
 * `aria-disabled` so it is still announced as part of the trail rather than as
 * loose text. A link to where you already are is a link that does nothing, and
 * somebody following it finds that out the hard way.
 *
 * # Our own topbar ends differently, on purpose
 *
 * It ends in a `Badge` — the engagement kind — with no current-page crumb at all.
 * The trail there is *org → target*, and the page is named by its own heading. A
 * third crumb repeating the `<h1>` is a crumb that is always redundant.
 *
 * # `aria-label="Breadcrumb"` is hard-coded
 *
 * Two breadcrumbs on one page would be two landmarks with one name. No screen has
 * two; the day one does, this takes a prop.
 */
export {};
