/**
 * Panel — a bordered region of the page, with an optional head.
 *
 * The most-used shape in the product: forty-three of them in the mock. It is
 * deliberately the least opinionated thing here — a border, a radius, a surface,
 * and somewhere to put a title.
 *
 * # `title` is omitted from the HTML attributes, and that is load-bearing
 *
 *     Omit<HTMLAttributes<HTMLDivElement>, "title">
 *
 * The DOM's `title` is a tooltip string. This one is a heading that takes markup.
 * Leaving both in place makes the prop type an intersection of `string` and
 * `ReactNode`, which accepts only a string — so `title={<span>…</span>}` fails to
 * compile with an error that names neither cause. It cost a build to find and the
 * `Omit` is the whole fix.
 *
 * # `bleed`, because a table brings its own edges
 *
 * The default body has padding. A table, a canvas or a list of rows draws its own
 * boundaries and wants to meet the panel's border exactly; padding under it reads
 * as a misalignment rather than as space. One boolean, because there is no third
 * answer.
 *
 * # The head is not a SectionLabel
 *
 * `Stat` uses `SectionLabel` for its key and this does not, which looks
 * inconsistent and is not. A panel's title is a **name for a region** at reading
 * size, and it sits in a bar with a border and an actions slot; a section label is
 * a ten-pixel uppercase key naming a value. Sharing the class would tie two things
 * that are about to want different sizes.
 *
 * # What it is not
 *
 * It is not the elevated surface. `surface.module.css` is for things that float
 * *above* the page and go away — a menu, a tooltip, a dialog — and the shadow is
 * the difference. A panel is part of the page and stays.
 *
 * # Deliberately absent
 *
 * A `tone`. A panel that needs to be alarming is an `Alert` inside a panel, or an
 * `Alert` instead of one. Tinting the container makes every row inside it fight
 * the tint.
 *
 * A collapsed state. That is `disclosure/collapsible`, which is a different
 * component with a different set of keyboard obligations.
 */
export {};
