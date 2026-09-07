/**
 * ledger — the audit trail and the journal, which are readable and not writable.
 *
 *     GET /v1/me/activity              my account's entries
 *     GET /v1/workspaces/{id}/audit    one engagement's, needs `read` on it
 *     GET /v1/chains/{correlation}     what else was part of one act
 *
 * # There is no org-wide audit log, and that is a decision rather than a gap
 *
 * An entry's scope is `system`, `account` or `workspace`, and it carries no org
 * id. So "the audit log for my firm" is not a question this table can answer —
 * and it is not one it should. An org-wide feed lists rows about engagements the
 * reader may not be on, which is exactly the wall `0005` exists to keep: an
 * analyst must not be able to infer the shape of a client they are not working
 * for.
 *
 * This client had `settings/audit-log` in ORG settings, which is the wrong level
 * by one — the same error, and for the same reason, as calling a workspace a
 * target. It is `home/audit-log` now: `home` is the section whose subtitle is
 * already *"this engagement at a glance"*.
 *
 * The honest org-shaped version, if one is ever wanted, is a switcher across the
 * workspaces the caller can see — which `/v1/me` already gives — and never a
 * single unfiltered feed.
 *
 * # A cursor, and the two things not to build
 *
 * `next` is opaque, absent when there is no more, and passed back as `?after=`.
 *
 * **No total.** Counting an append-only ledger is a full scan whose answer is
 * stale before it renders. `CLAUDE.md` says an unmeasured total renders as `–`
 * and never as a number nothing computed, so there is no "showing 1–50 of
 * 1,284".
 *
 * **No page numbers.** The ledger grows at the head, so offset pagination
 * silently re-shows rows above page one and hides rows below it. That failure is
 * invisible — the page looks full and correct — which is why it is worth a
 * paragraph rather than a comment.
 *
 * # A chain is a story, so it reads forwards
 *
 * Oldest first, with a `depth` for the indent and a `decision` flag separating a
 * choice somebody made from work the machinery did — `0014`. One registration
 * comes back as three steps across three domains, joined by one correlation id,
 * which is `decisions/0017`'s chain made visible.
 *
 * **Depths can be non-contiguous.** A caller may see part of a chain and is
 * never told how much is missing, so step *n* may have no parent in the list.
 * The renderer indents by depth and does not build a tree — a tree would need a
 * parent, and inventing one is how a partial view becomes a wrong claim.
 *
 * # `actor: "anonymous"` is not a missing value
 *
 * A registration arrives unauthenticated, so the row honestly says nobody was
 * signed in rather than back-filling the account it went on to create. It
 * renders as "not signed in" — never blank, which reads as data loss, and never
 * as the account's own name, which would be a false claim about who acted.
 */
export {};
