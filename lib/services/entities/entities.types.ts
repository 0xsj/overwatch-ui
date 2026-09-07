/** ONE vocabulary, in `lib/kernel` — `decisions/0034`.
 *
 *  There is no fragment-specific kind list any more. `url` joined it and
 *  `domain` left it: a domain IS a host, and "the one we started from" is a
 *  role in a chain rather than a property of the thing. Re-exported here so the
 *  entity screens keep reading the name they already use. */
import type { Kind } from "@/lib/kernel";
export { KINDS as FRAGMENT_KINDS } from "@/lib/kernel";
export type FragmentKind = Kind;

export type Claimant = "rule" | "model" | "human";

export type ClaimState = "proposed" | "accepted" | "rejected";

/** FOUR states — `decisions/0009`. **`finding` is not one of them**: a fragment
 *  can be `watching` and carry an open finding at once, so the red marker is a
 *  derived badge beside the judgement and never a fifth value inside it. */
export type JudgementState = "unopened" | "triaged" | "watching" | "dismissed";

/** `by`, `at` and `reason` are ABSENT while unopened — nobody has ruled, so
 *  there is nobody and no time to name.
 *
 *  **Dismissal requires a reason and triage does not.** The server answers 400
 *  with *"dismissing needs a reason — a dismissal with no reason reads as
 *  `never looked at` in six months"*, which is the sentence to put under the
 *  field rather than a generic required-field message. */
export type Judgement = {
  state: JudgementState;
  by?: string;
  at?: string;
  reason?: string;
};

/** What one source said, seen through the entity it hangs off.
 *
 *  A fragment is NOT an asset — `decisions/0009`, and this is the distinction
 *  most likely to be lost. `GET /fragments` is everything a source produced;
 *  `GET /assets` is the ones carrying an accepted attribution to the target's
 *  root entity AND a targetable kind. A `person` fragment can carry an accepted
 *  attribution and is still not an asset. */
export type Fragment = {
  fragment_id: string;
  kind: FragmentKind;
  value: string;
  /** `observed` was read out of an artifact; `manual` was typed in — a `/24`
   *  written into a scope rule. */
  origin: "observed" | "manual";
  /** BOTH ABSENT on a manual fragment: nothing has seen it. Render the absence
   *  as `–`, never as a placeholder date and never as "never". */
  first_seen?: string;
  last_seen?: string;
  observations: number;
  judgement: Judgement;
  /** A human READ, and it is NOT the judgement — `decisions/0037`. Absent means
   *  nobody has looked, which is a different fact from nobody having ruled, and
   *  keeping them apart is the whole of `READ BY YOU` being a check. */
  read_at?: string;
  read_by?: string;
};

/** entity ↔ fragment. A CLAIM naming who PROPOSED it — `decisions/0008`. */
export type Attribution = {
  attribution_id: string;
  entity_id: string;
  fragment_id: string;
  /** NEVER rewritten by a decision. Who proposed it stays who proposed it. */
  claimant: Claimant;
  claimant_ref?: string;
  /** ABSENT unless the claimant is a MODEL. A rule's assignment is a category,
   *  not a probability, and a `1.0` here would destroy the distinction
   *  permanently. */
  confidence?: number;
  basis: string;
  state: ClaimState;
  decided_at?: string;
  /** ABSENT when a RULE decided — `0036` amends `0008` to *a **person**
   *  deciding writes `decided_by`*. Render the absence as "by a rule" or
   *  "deterministic", never as "unknown" and never as a blank beside a label
   *  that says who. */
  decided_by?: string;
  decided_note?: string;
};

/** A fragment in a ROLE — `decisions/0009` — and deliberately the fragment
 *  shape plus the claim that makes it one, because an asset is not a different
 *  kind of thing. */
export type Asset = Fragment & {
  attribution_id: string;
  claimant: Claimant;
  basis: string;
  root_entity_id: string;
  target_id: string;
};

export type Entity = {
  entity_id: string;
  kind: FragmentKind;
  label: string;
  /** Present only on a target's ROOT entity. */
  target_id?: string;
  judgement: Judgement;
};

/** The canvas. **The root is NOT among the nodes** — it is not a fragment, and
 *  every edge runs root → node, which is why the screen draws it apart. */
export type Canvas = {
  root: Entity;
  nodes: (Fragment & { edge: Attribution })[];
  /** The limit was reached. A canvas that silently drew half a graph would look
   *  like a smaller estate, which is the one way this screen can lie. */
  truncated: boolean;
};

export type FragmentDetail = Fragment & { attributions: Attribution[] };

/** A person's arrangement of one canvas, and **there is no endpoint for it.**
 *
 *  Kept as a type because the canvas still lets somebody drag a node and still
 *  has to remember where they put it. It lives in the browser: the server has
 *  no pin table, and inventing paths for one here would put a proposal back
 *  into a service whose every other route is now real. Read
 *  `lib/services/entities/doc.ts` before adding one. */
export type Pin = { fragment_id: string; x: number; y: number };
