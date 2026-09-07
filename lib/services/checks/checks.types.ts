import type { Targetable } from "@/lib/kernel";

/** §Scope's `check` — *"a named question with its own interval"* — sealed by
 *  `decisions/0032`. It belongs to the FIRM: "what ports are open" is a question
 *  the firm knows how to ask, and it is the same question for every client. */
export type Check = {
  check_id: string;
  org_id: string;
  name: string;
  question: string;
  /** The coverage screen's whole denominator, and non-empty.
   *
   *  `decisions/0011`'s ragged denominator made real: a check with
   *  `applies_to: ["host"]` produces NO CELL AT ALL for a `/24` — not a cell in
   *  state `never`. A dashed square means *a question nobody has asked*, and a
   *  dashed square that sometimes means *impossible* makes that legend false.
   *
   *  Declared, never derived from the source step's `consumes`: `consumes` is a
   *  fact about a PROGRAM and applicability is a claim about the SUBJECT, and
   *  the second stays true when the tool is uninstalled. */
  applies_to: Targetable[];
  /** SECONDS, and ABSENT for a check that runs when somebody asks.
   *
   *  Not an ISO-8601 duration: `P1M` is not a length of time. A "monthly" check
   *  is stale after 28, 29, 30 or 31 days depending on the month it last ran in,
   *  and that ambiguity lands exactly on the boundary where staleness is
   *  decided. Seconds are ugly on the wire and unambiguous; offering `6h`/`1d`/
   *  `1w` in the editor is a control mapping to a number, and that mapping is
   *  the client's.
   *
   *  Absent is a KIND of check and not an unset field. `READ BY YOU` is all
   *  seven kinds and no interval, so it never goes stale — there is no clock. */
  interval_seconds?: number;
  enabled: boolean;
  archived: boolean;
  created_at: string;
};

export type CheckInput = {
  name: string;
  question: string;
  applies_to: Targetable[];
  /** Omit, or `0`, for "when somebody asks". */
  interval_seconds?: number;
  enabled: boolean;
};

/** One step of a chain. `x`, `y` and `pinned` are FLAT.
 *
 *  A single optional `pin` object cannot carry both `(0, 0)` and "never moved"
 *  once somebody drags a node to the origin — the same distinction the entity
 *  canvas needed. */
export type Step = {
  step_id: string;
  tool_id: string;
  x: number;
  y: number;
  pinned: boolean;
};

export type Flow = { from: string; to: string };

export type Chain = {
  steps: Step[];
  flows: Flow[];
  /** The steps nothing feeds, seeded from the target's scope. **Computed
   *  server-side — do not reimplement it.** Two implementations of "which node
   *  starts" will disagree the first time somebody saves a disconnected
   *  subgraph, which is legal. */
  sources: string[];
};

/** A step being SAVED. `step_id` is empty for a new one: a browser cannot mint
 *  an id and should not have to. */
export type StepInput = {
  step_id?: string;
  tool_id: string;
  x: number;
  y: number;
  pinned: boolean;
};

/** An endpoint by id, or by INDEX into `steps` when it is a step being created
 *  in the same save — the editor draws an edge between two nodes it has just
 *  added and neither has an id yet. Mixed forms are legal.
 *
 *  The response returns the whole saved graph with real ids, and the client
 *  ADOPTS it rather than reconciling: an index is meaningful only inside the
 *  request that sent it. */
export type FlowInput =
  | { from: string; to: string }
  | { from: string; to_new: number }
  | { from_new: number; to: string }
  | { from_new: number; to_new: number };

export type ChainInput = { steps: StepInput[]; flows: FlowInput[] };
