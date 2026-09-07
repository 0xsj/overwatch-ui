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
  /** The argv that ran, verbatim, as an array. Never a template. */
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
  /** ABSENT when a schedule started it. "No person" is a fact, not a missing
   *  value, and `null` would be the client's cue to render it as unknown. */
  started_by?: string;
  started_at: string;
  finished_at?: string;
};

export type RunDetail = Run & { invocations: Invocation[] };

export type RunPage = { runs: Run[]; next?: string };
