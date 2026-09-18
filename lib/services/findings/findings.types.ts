import type { Kind } from "@/lib/kernel";

/** FOUR states, and `resolved` and `dismissed` must never become one chip.
 *
 *  One is a change to the world and the other is a change of mind, and a client
 *  report cites them differently — *"we fixed eleven"* and *"we decided eleven
 *  did not matter"* are not the same sentence to hand somebody.
 *
 *  **There is no transition back to `open`.** A finding reopens by being SEEN
 *  again, which is a fact about the estate rather than an opinion; sending
 *  `state: "open"` is a 400. */
export type FindingState = "open" | "triaged" | "resolved" | "dismissed";

export type Severity = "info" | "low" | "medium" | "high" | "critical";

/** `decisions/0004` on the wire — a severity is a CLAIM and names who assigned
 *  it. The absences are the point. */
export type Assessment = {
  /** NEVER absent. */
  claimant: "rule" | "model" | "human";
  actor?: string;
  /** **Only a model carries one.** A template asserting `high` is a category,
   *  not a probability, and a `1.0` beside a rule's assignment would destroy
   *  the distinction permanently. */
  confidence?: number;
  basis?: string;
  at: string;
  /** Present only once somebody has OVERRIDDEN the assessment, and it carries
   *  the whole prior claim. Render it: the correction is the signal. */
  superseded?: {
    severity: Severity;
    claimant: "rule" | "model" | "human";
    actor?: string;
    confidence?: number;
    basis?: string;
    at: string;
  };
};

/** ONE PROBLEM ON ONE FRAGMENT — `decisions/0041`.
 *
 *  **The board is not a scan log.** Thirty nightly matches on one URL are ONE
 *  row with `sightings: 30`, not thirty rows. Do not group or dedupe in the
 *  client: it is done, and doing it again would hide the count that is the only
 *  evidence a reader has that a fix did not hold. */
export type Finding = {
  finding_id: string;
  tool_id: string;
  /** What the TOOL calls this class of problem, and half the identity — it is
   *  what makes a rescan a sighting rather than a new row. */
  signature: string;
  /** The fragment the problem is ON, carried whole so a board renders without a
   *  second request. */
  fragment_id: string;
  fragment_kind: Kind;
  fragment_value: string;
  state: FindingState;
  /** REQUIRED on a dismissal, optional on a resolution — a fix needs no
   *  argument, because the thing is gone. */
  reason?: string;
  decided_by?: string;
  decided_at?: string;
  severity: Severity;
  severity_by: Assessment;
  /** The history one row carries instead of one row per scan. With no
   *  `regressed` state these are also the only evidence a fix did not hold — an
   *  old `first_seen` beside a large `sightings`. */
  first_seen: string;
  last_seen: string;
  sightings: number;
  /** The run that MOST RECENTLY saw it. Never absent: a finding this system
   *  cannot source would arrive looking trustworthy. */
  invocation_id: string;
  artifact_id: string;
};
