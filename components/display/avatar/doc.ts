/**
 * Avatar — initials, derived in exactly one place.
 *
 * # Why it takes a name and not initials
 *
 * The sidebar derived its own, and a members table would have derived them
 * again. Two derivations disagree the first time somebody has three names, a
 * hyphen, or one name — and neither caller would ever find out, because each
 * looks right on its own screen.
 *
 * `initialsOf` is exported for the same reason: the day something needs the
 * initials without the circle, it takes them from here rather than writing the
 * split a third time.
 *
 * # One name gives one letter
 *
 *     "S. Jarratt"        SJ
 *     "Mary-Jane Okafor"  MO      hyphen splits, so not "MJ"
 *     "cron"              C       NOT "CC" — the naive version doubles it
 *     ""                  ?
 *
 * The `cron` case is the one that matters here: a service account, an automated
 * claimant, a rule. This product has non-human actors in its audit trail, so a
 * one-word name is not an edge case.
 *
 * # No image
 *
 * There is nowhere to upload one, no endpoint serves one, and a component with an
 * unreachable branch is a branch that will be wrong when something reaches it.
 * When avatars exist this gains a `src` and the initials become the fallback,
 * which is the shape everybody expects and there is no reason to build early.
 *
 * # `aria-hidden`, with the name in `title`
 *
 * It sits beside the name it abbreviates, every time. Announcing "S J" before
 * "S. Jarratt" is noise, and there is no case here where the avatar is the only
 * thing identifying somebody.
 */
export {};
