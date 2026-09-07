/** Where an entry sits. There is NO org scope, and that absence is the design —
 *  see `doc.ts`. */
export type AuditScope = "system" | "account" | "workspace";

export type AuditEntry = {
  id: string;
  scope: AuditScope;
  /** `identity.account.created`, `org.created`. Dotted, domain first. */
  action: string;
  subject: string;
  /** `anonymous` on a registration, and that is CORRECT: the request arrives
   *  unauthenticated, so the row says so rather than back-filling the account it
   *  went on to create. Render it as "not signed in" — never blank, and never
   *  the account's own name. */
  actor: string;
  correlation_id: string;
  /** Always an object, never null. `{}` where there is nothing, so it can be
   *  indexed without a guard on every row. */
  detail: Record<string, unknown>;
  occurred_at: string;
};

/** A page of a ledger.
 *
 *  `next` is ABSENT when there is no more, which is how a caller decides whether
 *  to draw "load more". It is opaque — its internals are the server's and will
 *  change — and it is passed back as `?after=`.
 *
 *  There is no total and there will not be one. Counting an append-only ledger
 *  is a full scan whose answer is stale before it renders, and §Scope says an
 *  unmeasured total renders as `–` and never as a number nothing computed. So no
 *  "showing 1–50 of 1,284", and no page numbers: the ledger grows at the HEAD,
 *  so offset pagination silently re-shows rows above page one and hides rows
 *  below it. */
export type AuditPage = {
  entries: AuditEntry[];
  next?: string;
  /** Undocumented in `ALIGNMENT.md` and present on `/v1/me/activity` — measured
   *  2026-09-07. Optional here because `/v1/workspaces/{id}/audit` does not send
   *  it, and nothing renders it yet: it carries a `total`, which is the one
   *  thing that entry says the ledger will never have. Asked rather than
   *  assumed — see `STATUS.md`. */
  facets?: { facet: string; total: number }[];
};

/** One step of one act. Read as a story, so it arrives OLDEST FIRST. */
export type ChainStep = {
  action: string;
  subject: string;
  /** The indent. NON-CONTIGUOUS is legal: a caller may see part of a chain and
   *  is never told how much is missing, so step n may have no parent in the
   *  list. Draw what you are given and do not build a tree. */
  depth: number;
  /** A choice somebody made, as opposed to work the machinery did —
   *  `decisions/0014`. The two must not render identically. */
  decision: boolean;
  actor: string;
  occurred_at: string;
};

export type PageOptions = { after?: string; limit?: number; signal?: AbortSignal };
