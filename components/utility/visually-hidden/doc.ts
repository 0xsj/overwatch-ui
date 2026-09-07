/**
 * VisuallyHidden — text for the accessibility tree and not for the picture.
 *
 * # Why not `display: none`, and why not `visibility: hidden`
 *
 * Both remove the element from the accessibility tree, which is the single thing
 * this component must never do. They are the two obvious answers and they are
 * exactly backwards: the goal is text that is *only* in the tree.
 *
 * The clipped box is the mechanism that survives: 1px, `overflow: hidden`,
 * `clip-path: inset(50%)`, `white-space: nowrap`. It stays laid out, so it stays
 * announced.
 *
 *     margin: -1px        the 1px box is pulled out of flow so it cannot open a
 *                         gap between two elements that are meant to touch
 *     white-space: nowrap a long string must not wrap to 200 lines inside a 1px
 *                         box; some engines grow the line box if it does
 *     border: 0           a border on a 1px box is a visible dot
 *
 * Every declaration is load-bearing. This is the one component in the tree where
 * deleting a line that "looks unnecessary" reintroduces a bug nobody will see.
 *
 * # Why not Radix's VisuallyHidden
 *
 * Radix has one and it is correct. It is not used because it inlines its own copy
 * of these rules, and the tree would then have two definitions of hidden text —
 * ours in `Mock`, theirs inside anything Radix renders. One is auditable.
 *
 * The rule the tree holds is *"radix is wrapped, never used raw"*. This is the
 * narrow case where the wrapper would add a dependency to own a class.
 *
 * # `focusable` is deliberately absent
 *
 * v1 shipped a `focusable` prop for the skip-link pattern: hidden text that
 * becomes visible when it takes focus. It was written here and then removed,
 * because the one candidate caller turned out not to need it — the shell's skip
 * link is a *styled control* when revealed, a bordered box on a raised surface,
 * not merely unhidden text. Wrapping it made the anchor lose the styling and the
 * reveal depend on `:focus-within`, which is worse than what it replaced.
 *
 * It comes back when something genuinely wants plain text to appear on focus.
 * Until then it is a prop with no caller, and `CLAUDE.md` §5 is about exactly
 * that.
 *
 * # `as` is a union and not `ElementType`
 *
 * Hidden text goes inside something, and the something decides what is legal.
 * `span` inside a paragraph, `li` inside a list, `legend` inside a fieldset. A
 * free `ElementType` would let a caller put a `div` inside a `p` and produce
 * invalid markup that hydrates differently on the server and the client.
 */
export {};
