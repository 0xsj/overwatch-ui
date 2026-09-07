/** What flows along an edge. A step consumes one kind and produces one, which
 *  is what makes a connection legal or not — and is the whole type system this
 *  editor has. Deliberately small: the moment it grows a general expression
 *  language this stops being a recon pipeline and becomes an automation engine. */
export type FeedKind = "domain" | "host" | "url" | "ip" | "cidr" | "finding";

/** A tool as the palette offers it. `decisions`-free: a tool is a definition and
 *  a field mapping, never an integration — so a node is a row somebody typed,
 *  not a plugin somebody released. */
export type ToolDef = {
  tool_id: string;
  name: string;
  /** What the person will read before anything spawns. `tools/add` §3: nothing
   *  runs until a person has read the command it will run. */
  argv: string;
  /** ABSENT on a source step — it is seeded from the target's scope rather than
   *  fed by an upstream tool. Never null. */
  consumes?: FeedKind;
  produces: FeedKind;
  /** Loud tools need `admin` on the workspace; passive ones need `write` —
   *  `decisions/0019`. Shown on the node because it decides who can run this. */
  loud: boolean;
};

/** One node of a check's chain. `x`/`y` are PINS, not a render: a person
 *  arranging the graph is stating a constraint, and a re-layout has to be able
 *  to ignore an unpinned node without moving a pinned one. Same reasoning as the
 *  entity canvas. */
export type Step = {
  step_id: string;
  tool_id: string;
  pin?: { x: number; y: number };
};

/** Data flow, and the ONLY edge kind here.
 *
 *  Worth stating because the entity canvas has two and only one of them is a
 *  claim. Nothing on this canvas is a claim about the world — an edge means
 *  "this tool's output was fed to that tool", which is a thing that happened to
 *  bytes, not something anybody asserted. */
export type Flow = { from: string; to: string };

/** A named question with its own interval — §Scope's `check`.
 *
 *  The chain is HOW the question gets answered; the question itself is the
 *  sentence a person reads on the coverage screen. Both are stored because
 *  "which tools ran" and "what were we asking" are different facts, and coverage
 *  is computed from the second. */
export type Check = {
  check_id: string;
  name: string;
  question: string;
  /** ISO-8601 duration. ABSENT means it runs when somebody asks and never on a
   *  clock — which is a real kind of check and not an unset field. */
  interval?: string;
  steps: Step[];
  flows: Flow[];
  enabled: boolean;
};

/** Six states, and three of them mean "produced nothing" for reasons that have
 *  nothing to do with each other.
 *
 *  §Scope refuses to collapse `skipped vs failed` — *"nobody ran it / it ran and
 *  broke"* — and scope's spawn gate adds a third: `refused`, where a rule said
 *  this tool may not touch this target. In a table these are three status
 *  strings that look alike. On a graph they are a node that never started, a
 *  node that broke, and a gate that did not open, and that is most of the
 *  argument for drawing a graph at all. */
export type InvocationState =
  | "ok"
  | "failed"
  | "refused"
  | "skipped"
  | "running"
  | "pending";

export type Invocation = {
  invocation_id: string;
  step_id: string;
  state: InvocationState;
  /** The actual argv, not the template. What ran, verbatim. */
  argv: string;
  /** ABSENT when the process never started — `refused`, `skipped`, `pending`.
   *  An exit code of 0 and no exit code at all are different facts. */
  exit?: number;
  /** ABSENT when nothing was written. `0` means it ran and produced an empty
   *  artifact, which is a result. */
  bytes?: number;
  artifact_id?: string;
  /** Present only on `refused`, and it names the RULE rather than apologising.
   *  A refusal is an answer. */
  refusal?: string;
  /** Present only on `skipped`, naming what upstream did not produce. */
  skipped_because?: string;
  started_at?: string;
  duration_ms?: number;
  /** How many observations were read out of this invocation's artifact.
   *  ABSENT when nothing was read; `0` when the mapping ran and matched
   *  nothing. */
  observations?: number;
};

export type Run = {
  run_id: string;
  check_id: string;
  target: string;
  state: "running" | "complete" | "stopped";
  started_at: string;
  invocations: Invocation[];
};

/** What the spawn gate would say, asked BEFORE anything runs.
 *
 *  This is the thing n8n structurally cannot do, because n8n has no notion of
 *  scope. `tools/add` already promises that nothing runs until a person has read
 *  the command; this is the other half — reading which of those commands would
 *  be refused, and on what. */
export type SpawnPreview = {
  step_id: string;
  argv: string;
  verdict: "permitted" | "refused";
  /** Present on `refused`. The rule, in the words the gate will use. */
  reason?: string;
};
