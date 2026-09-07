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
  /** One bucket per action prefix, and TWO rules that are easy to get wrong.
   *
   *  **The counts ignore the facet filter, on purpose.** Filter to `scope` and
   *  every other facet keeps its real count — which is what lets a reader leave
   *  a facet they have entered. Counting the filtered set would show every other
   *  bucket as zero, and a UI that hides zero-count facets would then remove the
   *  way back from the page. So render this AS GIVEN and never recompute it from
   *  the visible entries.
   *
   *  **It arrives with the FIRST page only.** It describes the whole set and
   *  does not change as you page, so it is absent once `after` is supplied.
   *  Absent means "keep the ones you have", never "there are no facets". */
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

export type PageOptions = {
  after?: string;
  limit?: number;
  /** An action's FIRST segment — `identity`, `org`, `workspace`. An unknown one
   *  is an empty page and a 200, not an error, so a stale bookmark shows nothing
   *  rather than a failure screen. */
  facet?: string;
  signal?: AbortSignal;
};
