/**
 * tenancy — who you are, whose firm this is, and which engagement is open.
 *
 * Every function here reaches a real endpoint, walked against the running server
 * on 2026-09-07 rather than transcribed from a document.
 *
 * # The three levels, and why the client had two
 *
 *     org        billing, membership, roles. One per account at signup
 *     workspace  the unit of work. CTF1, Acme Q3. Owns targets
 *     target     and everything hanging off it
 *
 * This client called the middle one a `target` until 2026-09-07 — `ShellContext`
 * carried `{ kind: "engagement" | "programme" | "personal" }` and the topbar drew
 * "ENGAGEMENT" as a chip. Both nouns exist in §Scope and they are different
 * things, so the collision was silent: every sentence still read correctly and
 * the wall was drawn one level too low.
 *
 * The `kind` chip went with it. No endpoint has ever sent a `kind` for a
 * workspace; it was invented by the mock. What the server does send is the
 * caller's own `access` on that workspace, which is more useful in the chrome
 * anyway — it is the answer to *why is this button not here*.
 *
 * # `access` is read from the workspace and never inferred from the role
 *
 * `effective = min(role ceiling, max(grants))` — `decisions/0019`. The org role
 * is a CEILING, not the answer. An `admin` with a `read` grant has `read` on that
 * engagement, and a screen that enables the judgement button because the role
 * says admin shows a control the server refuses.
 *
 * So there is no ceiling table in this client and there must not be one. The
 * server computes the `min` and sends the result per workspace; duplicating the
 * calculation here would be a second implementation of an authorisation rule,
 * which is the one kind of duplication that is a security bug rather than a
 * maintenance cost.
 *
 * # `none` is ABSENT, and that is the whole confidentiality story
 *
 * A workspace the caller cannot see is not in `/v1/me`. It must not be
 * reconstructed into a count, a switcher row, a search result or a breadcrumb —
 * a greyed-out row tells an analyst that a client they cannot see exists, and for
 * the client behind that wall that is the leak itself. The same reason
 * `GET /orgs/{id}/members` answers 404 for an org you are not in, one that does
 * not exist, and a malformed id: three inputs, one answer, so the id space cannot
 * be probed. Do not write an error screen that distinguishes them.
 *
 * # `orgs: []` is a state, not an error
 *
 * Registration is a chain and not a transaction — `decisions/0017`. The server
 * writes the account and publishes a fact; the org and the first workspace are
 * provisioned by subscribers, each in its own transaction, milliseconds later. So
 * `GET /v1/me` can legitimately answer with no orgs at all. In practice the
 * window is a few milliseconds and nobody sees it, which is exactly why the
 * crash on `orgs[0]` would ship.
 *
 * # Two status fields that are not the same field
 *
 * An account's `status` is `pending` until an address is proven. A membership's
 * `status` is `active` from the moment somebody is in the org. A person can be an
 * active member of a firm with a pending account, and the live server returns
 * precisely that. Nothing should branch on either: `verified` is the boolean the
 * server promises to keep meaning what it means.
 */
export {};
