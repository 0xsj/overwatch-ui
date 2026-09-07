/**
 * access — invitations, roles and grants. Nothing here is served.
 *
 * `decisions/0019` sealed the model on 2026-09-07 and not one command that writes
 * it exists over HTTP. `ALIGNMENT.md` is explicit: *"There is no invite endpoint
 * and no way to change a role or a grant. Members and grants can only be created
 * directly in the database today."*
 *
 * So this folder exists to be the domain `lib/root` never puts a server behind.
 * That is its whole reason for being separate from `tenancy`: the adapter choice
 * is per domain, so a directory boundary is how "real" and "proposed" stay
 * distinguishable without a flag, a comment convention, or somebody remembering.
 *
 * # Invite and grant are one flow, against the obvious instinct
 *
 * An invitation that carries no grant lands somebody in an org where they can see
 * NOTHING — `0019` made an empty grant set mean `none`, and `none` means
 * invisible. Technically correct, and the same terrible first screen `0012` §7
 * named about an empty workspace at signup.
 *
 * So an invitation carries an OPTIONAL first grant: *"invite kit@ as a member,
 * with read on Acme Q3."* One flow, one email, one accepted state. Building
 * invite and grant as two independent slices produces a working invite that
 * nobody should use on its own.
 *
 * Optional rather than required, because an invitation with no grant is a real
 * thing to send: it is how you add an `admin` who manages people and is granted
 * engagements separately. Which is the point `0019` makes about admin — promoting
 * somebody to handle invitations must not hand them every client's wall.
 *
 * # One verb for grant, because `none` is a level
 *
 * `setGrant` covers add, change and revoke. Writing `none` and revoking are the
 * same act from the caller's side, and two verbs would let a screen express
 * "granted, at none" as a state distinct from having no row — which is exactly
 * the distinction that must not exist, because both mean the engagement is
 * invisible.
 *
 * # What the fixture enforces that the backend cannot
 *
 * An org must never lose its last owner. `org.ErrLastOwner` is declared in the
 * backend, raised inside both storage adapters, and unreachable — no app-layer
 * code calls the method that would trigger it, because there has never been a
 * second member to demote one. The fixture refuses, so the screen has an error
 * path before the server is able to produce one.
 *
 * That is the one place a fixture here is allowed to be more capable than the
 * server, and it is allowed because the rule is sealed rather than invented.
 * Everywhere else a fixture more helpful than the server is the wrong kind of
 * wrong — see `lib/root/fixtures/identity.ts`, which reproduces the server's
 * unhelpfulness deliberately.
 *
 * # What is NOT modelled, and is not modelled here either
 *
 * `guest` and `client` need a time box. `0019` names both as roles that require
 * one and did not build it; nothing stores an expiry and nothing expires. The
 * screens say so rather than drawing an end date the server cannot keep — an
 * invitation's `expires_at` is the LINK expiring, which is a different fact.
 */
export {};
