/** The ONE kind vocabulary — `decisions/0034`.
 *
 *  Fourteen names, and two facets of them. There is not a separate list for
 *  fragments, for what flows between tools, and for what coverage is measured
 *  over; there is one list and two subsets, and the subsets are named rather
 *  than open-coded.
 */
export const KINDS = [
  "org", "person", "cert", "asn", "host", "cidr", "ip", "repo",
  "email", "account", "key", "whois", "document", "url",
] as const;

export type Kind = (typeof KINDS)[number];

/** An ASSET — what coverage counts. `decisions/0009`: an asset is a fragment in
 *  a role, not a table, and this is the set of roles that can carry one. */
export const TARGETABLE = ["host", "cidr", "ip", "asn", "url", "repo", "email"] as const;
export type Targetable = (typeof TARGETABLE)[number];

/** A process can be aimed at it. Narrower than targetable: a repository and an
 *  address are things you can attribute and not things a scanner takes. */
export const SPAWNABLE = ["host", "cidr", "ip", "asn", "url"] as const;
export type Spawnable = (typeof SPAWNABLE)[number];

export const isTargetable = (k: string): k is Targetable =>
  (TARGETABLE as readonly string[]).includes(k);

export const isSpawnable = (k: string): k is Spawnable =>
  (SPAWNABLE as readonly string[]).includes(k);

/** What can travel along an edge between two tools: every kind, plus `finding`.
 *
 *  A wider list than `TARGETABLE` on purpose, and the difference is the point.
 *  Bytes between two programs can be anything; a coverage SUBJECT cannot be a
 *  finding, because a check consuming a finding is triage — a different question
 *  with a different denominator, and folding it in makes the ratio mean two
 *  things at once. `applies_to: ["finding"]` is a 400. */
export const FEED_KINDS = [...KINDS, "finding"] as const;
export type FeedKind = (typeof FEED_KINDS)[number];

/** `domain` was deleted on 2026-09-07 and this is the one to read carefully.
 *
 *  **A domain IS a host.** `acme.com` and `www.acme.com` are both hostnames;
 *  *"the one we started from"* is a role in a chain, not a property of the
 *  thing — which is `0009`'s own argument about assets, applied one level down.
 *
 *  Sending it anywhere is now a 400. Kept here as a one-way mapping so a stored
 *  value or a pasted URL from before the change resolves rather than throwing,
 *  and so the message a screen shows can be the server's own.
 *
 *  The sentence practitioners say — *"subfinder takes a domain and gives you
 *  hosts"* — is still true and is no longer a TYPE. A source step is one nothing
 *  feeds, which the chain response already reports as `sources`. */
export const RETIRED_KINDS: Record<string, Kind> = { domain: "host" };

export function normaliseKind(raw: string): Kind | null {
  const mapped = RETIRED_KINDS[raw] ?? raw;
  return (KINDS as readonly string[]).includes(mapped) ? (mapped as Kind) : null;
}
