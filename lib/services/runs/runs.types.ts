import type { Kind } from "@/lib/kernel";

/** Six states, and three of them end with no artifact for reasons that have
 *  nothing to do with each other. The fixture proposed these and the backend
 *  adopted them unchanged — `decisions/0033`. */
export type InvocationState =
  | "ok" | "failed" | "refused" | "skipped" | "running" | "pending";

export type Artifact = {
  artifact_id: string;
  /** `stdout` and `stderr` are SEPARATE rows. A tool that fills stderr with
   *  warnings has not lost its findings. */
  stream: "stdout" | "stderr";
  hash: string;
  /** A plain number and never omitted: `0` means it ran and wrote an EMPTY
   *  artifact, which is a result. "Nothing was written" is the whole object
   *  being absent. */
  bytes: number;
  truncated: boolean;
  media_type?: string;
};

/** One thing a step was AIMED AT — `decisions/0039`, and **this is where the
 *  scope proof lives**.
 *
 *  A step touches many things once a chain feeds itself, so a refused one needs
 *  somewhere to be. Permitted and refused arrive in ONE list rather than two,
 *  because an array of what was permitted was the obvious widening and it
 *  discards *"and these three were not"* — which is `0010`'s whole purpose. */
export type Candidate = {
  candidate_id: string;
  kind: Kind;
  value: string;
  /** A plain boolean, never omitted. `false` is the interesting half: it is the
   *  sentence a client's report cites, and omitting it would make a refusal
   *  indistinguishable from an unanswered question. */
  permitted: boolean;
  /** Which rule EXCLUDED this one. Absent when NOTHING permitted it, and those
   *  are different facts — `0010`'s default is that nothing is in scope until a
   *  rule says so. */
  refusal_rule?: string;
  refusal?: string;
};

export type Invocation = {
  invocation_id: string;
  step_id: string;
  tool_id: string;
  /** Its topological position, computed server-side. **Lay the graph out from
   *  this rather than re-deriving order from the chain** — the chain may have
   *  been edited since the run, and the run's record deliberately does not
   *  depend on it. */
  sequence: number;
  state: InvocationState;
  /** What RAN once it has run — and the UNSUBSTITUTED TEMPLATE while it has
   *  not, which changed with `decisions/0039`:
   *
   *      state: "pending"   ["httpx", "-u", "{{host}}"]      what WOULD run
   *      state: "ok"        ["httpx", "-u", "a.acme.test"]   what RAN
   *
   *  A preview of a two-step check now shows step two `pending` with its
   *  template visible rather than `skipped`. If a screen renders this as a
   *  command line, `{{host}}` appears in it — that is honest, and it should
   *  read as unresolved rather than as a bug. */
  argv: string[];
  binary?: string;
  /** ABSENT means NO PROCESS EVER EXISTED — render "no process ever started",
   *  because a blank reads as data loss and a dash reads as unknown. `0` means
   *  it ran and succeeded. */
  exit?: number;
  signal?: string;
  /** Which rule EXCLUDED the spawn. Absent when nothing PERMITTED it, and those
   *  are different facts — `decisions/0010`. The second is the common first-run
   *  case, and its message should offer adding a rule rather than explaining a
   *  rule that does not exist. */
  refusal_rule?: string;
  /** The other half: which rule ALLOWED it. Only one of the two is ever set. */
  permit_rule?: string;
  refusal?: string;
  skipped_because?: string;
  /** The tool was not on PATH. §Scope: *a tool off PATH looks like silence*. */
  unavailable?: string;
  /** What this step was aimed at. **Always present, never `null`** — an empty
   *  list means nothing is resolved yet, which is a different claim from a
   *  missing key.
   *
   *  Render the REFUSED ones. A step can be `ok` while a rule kept it off part
   *  of what it was pointed at, and *"we would have looked at these three and a
   *  rule said no"* is the half a client's report cites. */
  candidates: Candidate[];
  started_at?: string;
  duration_ms: number;
  artifacts: Artifact[];
};

export type Run = {
  run_id: string;
  workspace_id: string;
  target_id: string;
  check_id: string;
  /** **A run where every step was refused is `complete`, not failed.** It is a
   *  complete answer to "may we look at this", and rendering it as an error
   *  makes the scope proof read as a fault. */
  state: "planned" | "running" | "complete" | "stopped";
  /** ABSENT when a SCHEDULE started it — `decisions/0038`. "No person" is a
   *  fact, not a missing value.
   *
   *  Render it as **"scheduled"**, never "unknown" and never a blank beside a
   *  label that says who. A schedule is not a who: the gate asks *may this
   *  person start this run*, and there is no person — the authorisation
   *  happened earlier, when somebody wrote the interval and enabled it. */
  started_by?: string;
  started_at: string;
  finished_at?: string;
};

export type RunDetail = Run & { invocations: Invocation[] };

/** `next` is present ONLY when there is another page. The default page is 50 —
 *  it was one, briefly, with no `next` at all, so a caller that worked around
 *  that by passing an explicit limit or by treating a single result as normal
 *  is now the thing that is wrong. */
export type RunPage = { runs: Run[]; next?: string };

/** Which spawns one scope rule refused, and it is an OBJECT rather than the
 *  bare array it was — `decisions/0039`, breaking.
 *
 *  One rule refuses two shapes of thing now: a whole STEP, when nothing it was
 *  aimed at survived, and a single CANDIDATE inside a step that ran anyway. The
 *  second could not exist before a step could touch many things. */
export type Refusals = {
  invocations: Invocation[];
  candidates: {
    candidate_id: string;
    run_id: string;
    invocation_id: string;
    kind: Kind;
    value: string;
    refusal?: string;
  }[];
};
