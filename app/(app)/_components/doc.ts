/**
 * The application chrome: a 48px rail, a 244px sidebar, a 46px topbar, and one
 * scroll container for everything else.
 *
 *     ┌────┬──────────┬───────────────────────────┐
 *     │    │ Findings │ 31m / Halcyon / …         │  topbar  — 46px, fixed
 *     │ ▣  ├──────────┼───────────────────────────┤
 *     │ ▤  │ Board    │                           │
 *     │ ▥  │ Report   │  <main>  the only thing    │
 *     │ ▦  │          │          that scrolls     │
 *     │    ├──────────┤                           │
 *     │    │ SJ  ☾    │                           │
 *     └────┴──────────┴───────────────────────────┘
 *
 * # Why this lives beside its routes and not in components/
 *
 * `components/` holds things a screen composes with. This is not that — it is the
 * frame *around* every screen in one route group, it imports that group's route
 * table, and it has exactly one caller. `app/(auth)/_components/auth-shell.tsx` is
 * the same decision one group over.
 *
 * The CSS is still in `@layer composition`, because the layer is about
 * precedence — a screen must be able to override the frame — and precedence has
 * nothing to do with where a file sits.
 *
 * `Mark` is the exception and went to `components/chrome/`: it is a glyph with no
 * knowledge of a route, and the sign-in screen wants it too.
 *
 * # The section is the first path segment, and that is the whole routing model
 *
 * `/findings/board` — `findings` is the rail's active section and `board` is the
 * sidebar's active page. `sectionFor` reads segment one and stops. No lookup
 * table maps a page back to its section, no context carries "where am I", and the
 * back button is correct for free because the URL is the state.
 *
 * The cost is that a page cannot move between sections without its URL changing,
 * which is the correct cost — its URL naming its section is the point.
 *
 * # The layout reads, the children render
 *
 * `layout.tsx` is a server component and awaits `getShellContext` once. It does
 * not re-run on navigation inside the group, so the breadcrumb is fetched on entry
 * and not on every click. `AppShell` is a client component taking `children` as a
 * prop, which is what keeps all 23 pages server components — the boundary is
 * around the frame, not around the content inside it.
 *
 * # What the mock has and this does not, on purpose
 *
 *     the run pill        no run exists, and a progress bar for nothing is a lie
 *     ⌘K search           the palette is a real screen's worth of behaviour
 *     "Run now"           there is no mutation to call
 *     sidebar counts      "14 assets" is a measured number and nothing measured
 *                         it. §Scope: an unmeasured total renders as `–`, never
 *                         as a figure somebody typed
 *     org/target switcher there is no second org and no list endpoint. The crumbs
 *                         are links to real screens rather than dead menus
 *     drawer · toasts     both need a screen that opens one
 *
 * Each of these is one component away and none of them is scaffolding today.
 *
 * # One thing here that the mock does NOT have
 *
 * The account menu, on the sidebar footer avatar. Every Settings page in the mock
 * is an *organisation* page — there is no profile, no password, no session list,
 * and no way to sign out of the product at all. `shell-account` has the argument;
 * the short version is that `account` is a §Scope noun and every human claim in
 * the record names one, so a screen showing what is attached to your name is owed
 * rather than optional.
 *
 * It is not under Settings, whose own subtitle is *"The organisation, and who may
 * see what"* — putting a password field on the screen that also holds target
 * access is how somebody edits the wrong thing. And it is not an eighth rail
 * section: the rail is for the work.
 *
 * **The cost, which is real:** the sidebar is `inert` when hidden, so the menu is
 * unreachable when the sidebar is collapsed, and it now holds sign-out and
 * preferences as well as the theme. The trigger moves to the topbar if collapsing
 * turns out to be common — one `className`, no structural change, which is why
 * finding out later is acceptable.
 *
 * # The two accessibility decisions that are not obvious
 *
 * **The hidden sidebar is `inert`, not just transparent.** `opacity: 0` hides it
 * from eyes and from nobody else: every link stays in the tab order and in the
 * accessibility tree, so a keyboard user tabs through six invisible links and a
 * screen reader reads a sidebar its user believes is closed. The mock has this
 * bug. `inert` removes it from both, and the 180ms during which the fade and the
 * semantics disagree is a better trade than either alternative — `display: none`
 * cannot animate, and `visibility` transitions discretely in only one direction.
 *
 * **A skip link, because there are sixteen controls before the content.** Rail
 * logo, seven sections, up to five pages, the account, three theme buttons. It
 * uses `:focus` rather than `:focus-visible` deliberately: a link that is off
 * screen until focused is already keyboard-only, and `:focus-visible` fails to
 * match under a programmatic `focus()`.
 *
 * # Two numbers that must agree and are written twice
 *
 * 960px, in `app-shell.module.css` (the grid drops to two columns) and in
 * `sidebar.module.css` (the sidebar goes). A media query cannot read a custom
 * property, so there is no token for it. If one changes and the other does not,
 * the sidebar occupies a column that no longer exists and the content wraps to a
 * second row.
 */
export {};
