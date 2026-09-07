import { AppError } from "@/lib/kernel";
import type { MemoryRoute } from "@/lib/http";
import type { Chain, ChainInput, Check, Step } from "@/lib/services/checks";
import type { Extraction, Lineage, Observation, Subject } from "@/lib/services/observed";
import type { Invocation, RunDetail } from "@/lib/services/runs";
import type { Rule, Target } from "@/lib/services/targets";
import type { Mapping, Tool } from "@/lib/services/tooling";

/* ─── Five domains in one file, and that is the point ──────────────────────
   `targets`, `tooling`, `checks`, `runs` and `observed` are separate services
   because they are separate endpoints under two different path roots. Their
   FIXTURES are one file because the data is one chain of citations: an
   observation names an invocation, which names a step, which names a tool; a
   run names a target; and a refusal cites one of that target's scope rules.
   Split across five files, those are five sets of ids maintained by hand, and
   they drift — at which point the lineage screen renders a dangling citation
   and the bug is in the fixture rather than in the thing it stands in for.

   All five are SERVED as of 2026-09-07, so nothing here is a proposal. These
   routes exist for a fixture persona, which has no account on the real server,
   and they reproduce the live contract rather than inventing one. Shapes read
   off `overwatch-backend/root/{tools,checks,runs,observations}.go`.

   Answers EVERY session, unlike `fixtures/access.ts`. That guard belongs where
   a real account seeing fixture rows would be one tenant's invented data on
   another's screen; `clientFor` already routes a real session to the server for
   all four of these, so nothing here can reach one.                        */

const notFound = () => new AppError({ kind: "not_found", message: "not found", status: 404 });

const T = (n: number) => `01a07bc0-7001-7000-9000-00000000000${n}`;
const C = (n: number) => `01a07bc1-7002-7000-9000-00000000000${n}`;
const S = (n: number) => `01a07bc2-7003-7000-9000-00000000000${n}`;
const R = (n: number) => `01a07bc3-7004-7000-9000-00000000000${n}`;
const I = (n: number) => `01a07bc4-7005-7000-9000-00000000000${n}`;
const A = (n: number) => `01a07bc5-7006-7000-9000-00000000000${n}`;
const M = (n: number) => `01a07bc6-7007-7000-9000-00000000000${n}`;
const O = (n: number) => `01a07bc7-7008-7000-9000-00000000000${n}`;
const G = (n: number) => `01a07bc8-7009-7000-9000-00000000000${n}`;

/* ─── targets ─────────────────────────────────────────────────────────────
   Two kinds and no more: `organisation` and `person`. A hostname is NEVER a
   target — it is something a tool said about one, and the distance between the
   two is the attribution question this product exists to answer.            */

const TARGET = "01a07bd0-700a-7000-9000-000000000001";
const SECOND_TARGET = "01a07bd0-700a-7000-9000-000000000002";

const TARGETS: Target[] = [
  {
    target_id: TARGET,
    name: "Halcyon Systems Ltd",
    kind: "organisation",
    archived: false,
    created_at: "2026-08-19T10:02:00Z",
  },
  {
    target_id: SECOND_TARGET,
    name: "A. Mercer",
    kind: "person",
    archived: false,
    created_at: "2026-08-30T14:41:00Z",
  },
];

/** Both gates, and one superseded row that is still returned.
 *
 *  The exclude is what makes the model visible: it beats the include it sits
 *  under, so `internal.halcyon.example` is out of scope for a spawn even though
 *  the wildcard above covers it. And the loud rule is separate from the passive
 *  one on purpose — a range in scope for passive collection is not thereby in
 *  scope for a loud scan. */
const RULES: Rule[] = [
  {
    rule_id: G(1),
    pattern: "*.halcyon.example",
    polarity: "include",
    gate: "spawn",
    kinds: ["host", "url"],
    tools: ["passive", "light"],
    created_at: "2026-08-19T10:04:00Z",
  },
  {
    rule_id: G(2),
    pattern: "internal.halcyon.example",
    polarity: "exclude",
    gate: "spawn",
    kinds: ["host", "url"],
    tools: ["passive", "light", "loud"],
    created_at: "2026-08-19T10:05:00Z",
  },
  {
    rule_id: G(3),
    pattern: "halcyon.example",
    polarity: "include",
    gate: "claim",
    // No `tools` at all: there are no processes on the claim gate, so it is
    // absent rather than empty or wildcard.
    kinds: ["host", "cert", "org", "email", "whois"],
    created_at: "2026-08-19T10:06:00Z",
  },
  {
    rule_id: G(4),
    pattern: "203.0.113.0/24",
    polarity: "include",
    gate: "spawn",
    kinds: ["cidr", "ip"],
    tools: ["passive"],
    created_at: "2026-08-19T10:07:00Z",
    // Superseded and still returned under `?all=1` — an invocation refusal from
    // before this date cites it by id, and dropping the row would BE the
    // citation dangling.
    superseded_at: "2026-09-01T09:14:00Z",
  },
];

/* ─── tools ───────────────────────────────────────────────────────────────
   `intensity` is three values and not a `loud` boolean. `light` is a real
   position: httpx at recon volume is what a crawler does, and calling it loud
   would put ordinary HTTP behind the same gate as template-driven probing.

   `consumes` ABSENT is a SOURCE tool — one seeded from the target's scope. It
   is not "any kind", and never `"*"`.                                       */

const TOOLS: Tool[] = [
  {
    tool_id: T(1),
    org_id: "",
    name: "subfinder",
    argv: "subfinder -d {host} -silent",
    intensity: "passive",
    produces: "host",
    success_exit_codes: [0],
    archived: false,
    created_at: "2026-08-18T09:22:00Z",
  },
  {
    tool_id: T(2),
    org_id: "",
    name: "httpx",
    argv: "httpx -u {host} -silent -json",
    intensity: "light",
    consumes: "host",
    produces: "url",
    success_exit_codes: [0],
    archived: false,
    created_at: "2026-08-18T09:23:00Z",
  },
  {
    tool_id: T(3),
    org_id: "",
    name: "naabu",
    argv: "naabu -host {host} -top-ports 100 -json",
    intensity: "light",
    consumes: "host",
    produces: "url",
    success_exit_codes: [0],
    archived: false,
    created_at: "2026-08-18T09:24:00Z",
  },
  {
    tool_id: T(4),
    org_id: "",
    name: "tlsx",
    argv: "tlsx -u {host} -json -san",
    intensity: "passive",
    consumes: "host",
    produces: "cert",
    success_exit_codes: [0],
    archived: false,
    created_at: "2026-08-18T09:25:00Z",
  },
  {
    tool_id: T(5),
    org_id: "",
    name: "nuclei",
    argv: "nuclei -u {url} -severity medium,high,critical -jsonl",
    intensity: "loud",
    consumes: "url",
    produces: "finding",
    // `decisions/0033`: nuclei exits 1 when it finds nothing. Treating that as a
    // failure turns "no vulnerabilities" into an error, which is the one answer
    // a scanner gives most often.
    success_exit_codes: [0, 1],
    archived: false,
    created_at: "2026-08-18T09:26:00Z",
  },
  {
    tool_id: T(6),
    org_id: "",
    name: "whois",
    argv: "whois {host}",
    intensity: "passive",
    consumes: "host",
    produces: "whois",
    success_exit_codes: [0],
    archived: false,
    created_at: "2026-08-18T09:27:00Z",
  },
  {
    // Archived, and the row STAYS: every invocation that ever ran names it, so
    // deleting it would strand those records. There is no reopen route — the
    // name is released on archive, so one would need the same collision refusal
    // reopening an engagement has.
    tool_id: T(7),
    org_id: "",
    name: "amass",
    argv: "amass enum -d {host} -json -",
    intensity: "light",
    produces: "host",
    success_exit_codes: [0],
    archived: true,
    created_at: "2026-08-18T09:28:00Z",
  },
];

const MAPPINGS: Mapping[] = [
  {
    mapping_id: M(1),
    tool_id: T(2),
    field: "http.status",
    expression: "status_code",
    version: 3,
    state: "live",
    created_at: "2026-08-19T11:04:00Z",
  },
  {
    mapping_id: M(2),
    tool_id: T(2),
    field: "http.title",
    expression: "title",
    version: 1,
    state: "live",
    created_at: "2026-08-19T11:05:00Z",
  },
  {
    // The correction. §Scope calls a correction *"a person fixing a mapping"*
    // and it gets no table of its own — it is this: version 2, live, with the
    // author already recorded as the caller who wrote it.
    mapping_id: M(3),
    tool_id: T(2),
    field: "http.server",
    expression: "webserver",
    version: 2,
    state: "live",
    created_at: "2026-09-02T08:41:00Z",
  },
  {
    // A draft: written, and nothing extracts through it yet. Which is why no
    // observation cites it and the mappings editor shows it as the next thing
    // to decide about rather than as a fault.
    mapping_id: M(6),
    tool_id: T(2),
    field: "http.tech",
    expression: "tech",
    version: 1,
    state: "draft",
    created_at: "2026-09-06T19:20:00Z",
  },
  {
    // The version O(3) cites. RETIRED and still returned — `listMappings`
    // answers with every version, because they are the history the citations
    // point at, and a screen that hides them makes a live lineage unresolvable.
    mapping_id: M(5),
    tool_id: T(2),
    field: "http.server",
    expression: "webserver_raw",
    version: 1,
    state: "retired",
    created_at: "2026-08-19T11:06:00Z",
  },
  {
    mapping_id: M(4),
    tool_id: T(4),
    field: "tls.san",
    expression: "tls.subject_an",
    version: 1,
    state: "live",
    created_at: "2026-08-20T15:12:00Z",
  },
];

/* ─── checks ──────────────────────────────────────────────────────────────
   Three, and the third is the one that proves the shape: `READ BY YOU` has no
   steps and no interval, so it never reports stale — both fall out of what it
   is rather than out of a special case.                                     */

export const CHECKS: Check[] = [
  {
    check_id: C(1),
    org_id: "",
    name: "web surface",
    question: "What is reachable over HTTP, and does anything on it have a known hole?",
    applies_to: ["host", "cidr"],
    interval_seconds: 86400,
    enabled: true,
    archived: false,
    created_at: "2026-08-18T09:30:00Z",
  },
  {
    check_id: C(2),
    org_id: "",
    name: "tls posture",
    question: "What certificates are presented, and what names do they claim?",
    applies_to: ["host", "ip"],
    interval_seconds: 604800,
    enabled: true,
    archived: false,
    created_at: "2026-08-18T09:31:00Z",
  },
  {
    check_id: C(3),
    org_id: "",
    name: "read by you",
    question: "Has a person actually looked at this asset and formed a view?",
    // Every targetable kind, because the question is askable about anything.
    applies_to: ["host", "cidr", "ip", "asn", "url", "repo", "email"],
    enabled: true,
    archived: false,
    created_at: "2026-08-18T09:32:00Z",
  },
];

/* A DIAMOND, deliberately: subfinder feeds both httpx and naabu, and both feed
   nuclei. Two paths joining is not a cycle and saves fine — the 400 is reserved
   for an actual loop. */
const CHAINS = new Map<string, Chain>([
  [
    C(1),
    {
      steps: [
        { step_id: S(1), tool_id: T(1), x: 0, y: 0, pinned: false },
        { step_id: S(2), tool_id: T(2), x: 260, y: -90, pinned: false },
        { step_id: S(3), tool_id: T(3), x: 260, y: 90, pinned: false },
        { step_id: S(4), tool_id: T(5), x: 520, y: 0, pinned: false },
      ],
      flows: [
        { from: S(1), to: S(2) },
        { from: S(1), to: S(3) },
        { from: S(2), to: S(4) },
        { from: S(3), to: S(4) },
      ],
      sources: [S(1)],
    },
  ],
  [
    C(2),
    {
      steps: [
        { step_id: S(5), tool_id: T(1), x: 0, y: 0, pinned: false },
        { step_id: S(6), tool_id: T(4), x: 260, y: 0, pinned: true },
      ],
      flows: [{ from: S(5), to: S(6) }],
      sources: [S(5)],
    },
  ],
  // No steps, no flows, no sources. The human check.
  [C(3), { steps: [], flows: [], sources: [] }],
]);

/* ─── runs ────────────────────────────────────────────────────────────────
   Four states in one run, and each ends with no artifact for a reason that has
   nothing to do with the others. `sequence` is the topological position the
   server computed; the graph is laid out from it rather than re-derived from
   the chain, because the chain may have been edited since.                  */

const INVOCATIONS: Invocation[] = [
  {
    invocation_id: I(1),
    step_id: S(1),
    tool_id: T(1),
    sequence: 0,
    state: "ok",
    argv: ["subfinder", "-d", "halcyon.example", "-silent"],
    binary: "/opt/homebrew/bin/subfinder",
    exit: 0,
    permit_rule: A(1),
    started_at: "2026-09-06T22:04:11Z",
    duration_ms: 8140,
    artifacts: [
      {
        artifact_id: A(1),
        stream: "stdout",
        hash: "sha256:4f1c9b0e",
        bytes: 2184,
        truncated: false,
        media_type: "text/plain",
      },
    ],
  },
  {
    invocation_id: I(2),
    step_id: S(2),
    tool_id: T(2),
    sequence: 1,
    state: "ok",
    argv: ["httpx", "-u", "api.halcyon.example", "-silent", "-json"],
    binary: "/opt/homebrew/bin/httpx",
    exit: 0,
    /* NO `permit_rule`, deliberately, and this is the one to read twice. An
       invocation nothing refused has no rule to cite — the commonest shape
       there is — and a lineage screen that renders that as an error makes the
       ordinary case look broken. */
    started_at: "2026-09-06T22:04:20Z",
    duration_ms: 3320,
    artifacts: [
      {
        artifact_id: A(2),
        stream: "stdout",
        hash: "sha256:9ab30d47",
        bytes: 5417,
        truncated: false,
        media_type: "application/x-ndjson",
      },
      // Ran, and wrote an EMPTY one. `0` is a result; nothing written is the
      // whole object being absent.
      { artifact_id: A(3), stream: "stderr", hash: "sha256:e3b0c442", bytes: 0, truncated: false },
    ],
  },
  {
    invocation_id: I(3),
    step_id: S(3),
    tool_id: T(3),
    sequence: 1,
    // Not on PATH. §Scope: a tool off PATH looks like silence, so it is said out
    // loud — and `exit` is absent because no process ever existed.
    state: "failed",
    argv: ["naabu", "-host", "api.halcyon.example", "-top-ports", "100", "-json"],
    unavailable: "naabu is not on PATH",
    started_at: "2026-09-06T22:04:20Z",
    duration_ms: 2,
    artifacts: [],
  },
  {
    invocation_id: I(4),
    step_id: S(4),
    tool_id: T(5),
    sequence: 2,
    // Refused, and NO rule to cite: nothing permitted it. That is the common
    // first-run case, and its fix is adding a rule rather than reading one.
    state: "refused",
    argv: ["nuclei", "-u", "https://api.halcyon.example", "-severity", "medium,high,critical", "-jsonl"],
    refusal: "no scope rule permits a loud spawn against api.halcyon.example",
    duration_ms: 0,
    artifacts: [],
  },
];

const RUNS: RunDetail[] = [
  {
    run_id: R(1),
    workspace_id: "",
    target_id: TARGET,
    check_id: C(1),
    // Complete. A run where a step was refused is a complete answer to "may we
    // look at this", and drawing it as an error makes the scope proof read as
    // a fault.
    state: "complete",
    started_by: "01a07b46-fa1c-7000-a870-000000000002",
    started_at: "2026-09-06T22:04:11Z",
    finished_at: "2026-09-06T22:04:31Z",
    invocations: INVOCATIONS,
  },
  {
    run_id: R(2),
    workspace_id: "",
    target_id: TARGET,
    check_id: C(2),
    state: "complete",
    // ABSENT: a schedule started it. "No person" is a fact, not a missing value.
    started_at: "2026-09-05T03:00:02Z",
    finished_at: "2026-09-05T03:00:19Z",
    invocations: [
      {
        invocation_id: I(5),
        step_id: S(5),
        tool_id: T(1),
        sequence: 0,
        state: "ok",
        argv: ["subfinder", "-d", "halcyon.example", "-silent"],
        exit: 0,
        started_at: "2026-09-05T03:00:02Z",
        duration_ms: 7710,
        artifacts: [
          { artifact_id: A(4), stream: "stdout", hash: "sha256:4f1c9b0e", bytes: 2184, truncated: false },
        ],
      },
      {
        invocation_id: I(6),
        step_id: S(6),
        tool_id: T(4),
        sequence: 1,
        // It ran and it broke. `skipped` would mean nobody ran it — the pair
        // §Scope keeps apart.
        state: "failed",
        argv: ["tlsx", "-u", "api.halcyon.example", "-json", "-san"],
        binary: "/opt/homebrew/bin/tlsx",
        exit: 2,
        started_at: "2026-09-05T03:00:10Z",
        duration_ms: 1180,
        artifacts: [
          { artifact_id: A(5), stream: "stderr", hash: "sha256:71dd2f18", bytes: 214, truncated: false },
        ],
      },
    ],
  },
];

/** The plan `POST /runs` and `POST /runs/preview` both answer with. Every step
 *  already has an invocation row and the gate has already been asked, so
 *  `refused` and `skipped` are present before any process exists. */
function plan(workspaceId: string, checkId: string, targetId: string): RunDetail {
  const chain = CHAINS.get(checkId) ?? { steps: [], flows: [], sources: [] };
  const depth = new Map<string, number>(chain.sources.map((id) => [id, 0]));
  for (let pass = 0; pass < chain.steps.length; pass += 1) {
    for (const f of chain.flows) {
      const from = depth.get(f.from);
      if (from !== undefined) depth.set(f.to, Math.max(depth.get(f.to) ?? 0, from + 1));
    }
  }
  return {
    run_id: R(9),
    workspace_id: workspaceId,
    target_id: targetId,
    check_id: checkId,
    state: "planned",
    started_by: "01a07b46-fa1c-7000-a870-000000000002",
    started_at: "2026-09-07T10:00:00Z",
    invocations: chain.steps.map((step, n) => {
      const tool = TOOLS.find((t) => t.tool_id === step.tool_id);
      const loud = tool?.intensity === "loud";
      return {
        invocation_id: `${I(9)}${n}`,
        step_id: step.step_id,
        tool_id: step.tool_id,
        sequence: depth.get(step.step_id) ?? 0,
        state: loud ? "refused" : "pending",
        argv: (tool?.argv ?? "").split(" "),
        refusal: loud
          ? "no scope rule permits a loud spawn against this target"
          : undefined,
        duration_ms: 0,
        artifacts: [],
      } satisfies Invocation;
    }),
  };
}

/* ─── observed ────────────────────────────────────────────────────────────
   `subjects` stands in for the asset list and is deliberately NOT one: an asset
   is a fragment in a role carrying an accepted attribution, and these are just
   the things observations are about.                                        */

const SUBJECTS: Subject[] = [
  {
    subject_kind: "host",
    subject_value: "api.halcyon.example",
    observations: 6,
    fields: 4,
    last_seen: "2026-09-06T22:04:23Z",
  },
  {
    subject_kind: "host",
    subject_value: "staging.halcyon.example",
    observations: 3,
    fields: 2,
    last_seen: "2026-09-06T22:04:24Z",
  },
  {
    subject_kind: "url",
    subject_value: "https://api.halcyon.example/v1",
    observations: 2,
    fields: 2,
    last_seen: "2026-09-06T22:04:25Z",
  },
];

const OBSERVATIONS: Observation[] = [
  {
    observation_id: O(1),
    subject_kind: "host",
    subject_value: "api.halcyon.example",
    field: "http.status",
    value: "200",
    invocation_id: I(2),
    artifact_id: A(2),
    mapping_id: M(1),
    mapping_version: 3,
    // BOTH times, always. A re-extraction moves `recorded_at` and never
    // `observed_at`, and a screen showing one cannot tell them apart.
    observed_at: "2026-09-06T22:04:23Z",
    recorded_at: "2026-09-06T22:04:24Z",
  },
  {
    observation_id: O(2),
    subject_kind: "host",
    subject_value: "api.halcyon.example",
    field: "http.title",
    value: "Halcyon API",
    invocation_id: I(2),
    artifact_id: A(2),
    mapping_id: M(2),
    mapping_version: 1,
    observed_at: "2026-09-06T22:04:23Z",
    recorded_at: "2026-09-06T22:04:24Z",
  },
  {
    observation_id: O(3),
    subject_kind: "host",
    subject_value: "api.halcyon.example",
    field: "http.server",
    value: "nginx",
    invocation_id: I(2),
    artifact_id: A(2),
    mapping_id: M(3),
    mapping_version: 2,
    observed_at: "2026-09-06T22:04:23Z",
    // Re-extracted after the mapping was corrected: a later `recorded_at`
    // against the same `observed_at`.
    recorded_at: "2026-09-07T08:12:40Z",
  },
  {
    observation_id: O(4),
    subject_kind: "host",
    subject_value: "staging.halcyon.example",
    field: "dns.a",
    value: "203.0.113.42",
    invocation_id: I(1),
    artifact_id: A(1),
    mapping_id: M(1),
    mapping_version: 3,
    observed_at: "2026-09-06T22:04:19Z",
    recorded_at: "2026-09-06T22:04:20Z",
  },
];

/** Four steps, each INDEPENDENTLY absent. An invocation nothing refused has no
 *  rule to cite, and rendering that as an error makes the commonest case look
 *  broken. */
function lineageOf(observationId: string): Lineage {
  const observation = OBSERVATIONS.find((o) => o.observation_id === observationId);
  if (!observation) throw notFound();
  const mapping = MAPPINGS.find((m) => m.mapping_id === observation.mapping_id);
  const invocation = INVOCATIONS.find((i) => i.invocation_id === observation.invocation_id);
  const artifact = invocation?.artifacts.find((a) => a.artifact_id === observation.artifact_id);
  return {
    observation,
    mapping: mapping && {
      mapping_id: mapping.mapping_id,
      field: mapping.field,
      expression: mapping.expression,
      version: mapping.version,
      state: mapping.state,
    },
    artifact: artifact && {
      artifact_id: artifact.artifact_id,
      stream: artifact.stream,
      hash: artifact.hash,
      bytes: artifact.bytes,
      truncated: artifact.truncated,
    },
    invocation: invocation && {
      invocation_id: invocation.invocation_id,
      run_id: R(1),
      tool_id: invocation.tool_id,
      argv: invocation.argv,
      binary: invocation.binary,
      state: invocation.state,
      exit: invocation.exit,
      started_at: invocation.started_at,
    },
    // Absent for the observation whose invocation nothing refused and nothing
    // explicitly permitted — the commonest shape, and not an error.
    rule: invocation?.permit_rule
      ? {
          rule_id: invocation.permit_rule,
          pattern: "*.halcyon.example",
          polarity: "include",
          gate: "spawn",
          // TRUE and still returned: `0030` keeps a rule forever precisely so a
          // citation made at the time still resolves.
          superseded: true,
        }
      : undefined,
  };
}

/** `fields_seen = mapped + left_alone`, all counted in PATHS so the identity
 *  holds. `observations` is the separate question — one flattened path can
 *  become many observations, so it is not a fourth term of the same sum. */
const EXTRACTION: Extraction = {
  fields_seen: 31,
  mapped: 12,
  left_alone: 19,
  observations: 6,
  fields: 4,
  left_alone_paths: [
    { path: "tls.issuer_cn", seen: 14, sample: "R11" },
    { path: "tech[]", seen: 11, sample: "nginx" },
    { path: "cdn_name", seen: 9, sample: "cloudflare" },
    { path: "response_time", seen: 31, sample: "412ms" },
    { path: "hash.body_md5", seen: 31 },
  ],
};

/* ─── routes ──────────────────────────────────────────────────────────────
   Two path roots, and which one a noun lives under is `decisions/0031`. A tool
   and a check are what the FIRM can do, so they are under `/orgs`; a run and an
   observation are claims about a CLIENT, so they keep the narrow key.       */

const match = (path: string, pattern: RegExp) => pattern.exec(path);

export const workRoutes: MemoryRoute[] = [
  /* targets and scope */
  (req) => {
    const m = match(req.path, /^\/workspaces\/([^/]+)\/targets$/);
    if (!(req.method === "GET" && m)) return undefined;
    const all = req.params.archived === 1 || req.params.archived === "1";
    return all ? TARGETS : TARGETS.filter((t) => !t.archived);
  },
  (req) => {
    const m = match(req.path, /^\/workspaces\/([^/]+)\/targets\/([^/]+)\/scope$/);
    if (!(req.method === "GET" && m)) return undefined;
    const all = req.params.all === 1 || req.params.all === "1";
    return all ? RULES : RULES.filter((r) => !r.superseded_at);
  },

  /* tools */
  (req) => {
    const m = match(req.path, /^\/orgs\/([^/]+)\/tools$/);
    if (!(req.method === "GET" && m)) return undefined;
    const org = decodeURIComponent(m[1]);
    // INCLUDES archived; it does not select them.
    const all = req.params.archived === 1 || req.params.archived === "1";
    return TOOLS.filter((t) => all || !t.archived).map((t) => ({ ...t, org_id: org }));
  },
  (req) => {
    const m = match(req.path, /^\/orgs\/([^/]+)\/tools\/([^/]+)\/mappings$/);
    if (!(req.method === "GET" && m)) return undefined;
    return MAPPINGS.filter((x) => x.tool_id === decodeURIComponent(m[2]));
  },

  /* checks */
  (req) => {
    const m = match(req.path, /^\/orgs\/([^/]+)\/checks$/);
    if (!(req.method === "GET" && m)) return undefined;
    const org = decodeURIComponent(m[1]);
    const all = req.params.archived === 1 || req.params.archived === "1";
    return CHECKS.filter((c) => all || !c.archived).map((c) => ({ ...c, org_id: org }));
  },
  (req) => {
    const m = match(req.path, /^\/orgs\/([^/]+)\/checks\/([^/]+)\/chain$/);
    if (!(req.method === "GET" && m)) return undefined;
    const chain = CHAINS.get(decodeURIComponent(m[2]));
    if (!chain) throw notFound();
    return chain;
  },
  (req) => {
    const m = match(req.path, /^\/orgs\/([^/]+)\/checks\/([^/]+)\/chain$/);
    if (!(req.method === "PUT" && m)) return undefined;
    const checkId = decodeURIComponent(m[2]);
    const existing = CHAINS.get(checkId);
    if (!existing) throw notFound();
    const input = req.body as ChainInput;

    /* The server DIFFS rather than replacing, and this reproduces that: a step
       arriving with an id keeps it. A run records which step produced which
       invocation, and an id that churned under a save would make that record
       point at nothing. */
    let minted = 0;
    const steps: Step[] = input.steps.map((st) => ({
      step_id: st.step_id || S(90 + (minted += 1)),
      tool_id: st.tool_id,
      x: st.x,
      y: st.y,
      pinned: st.pinned,
    }));
    // An index is meaningful only inside the request that sent it, which is why
    // the response carries the whole graph with real ids and the client adopts
    // it rather than reconciling.
    const at = (i: number) => steps[i]?.step_id ?? "";
    const flows = input.flows.map((f) => ({
      from: "from" in f ? f.from : at(f.from_new),
      to: "to" in f ? f.to : at(f.to_new),
    }));
    const fed = new Set(flows.map((f) => f.to));
    const next: Chain = {
      steps,
      flows,
      sources: steps.filter((st) => !fed.has(st.step_id)).map((st) => st.step_id),
    };
    CHAINS.set(checkId, next);
    return next;
  },

  /* runs */
  (req) => {
    const m = match(req.path, /^\/workspaces\/([^/]+)\/runs$/);
    if (!(req.method === "GET" && m)) return undefined;
    const workspace = decodeURIComponent(m[1]);
    // A cursor and no total — `next` absent is the last page, which is the one
    // thing a caller can rely on.
    return { runs: RUNS.map(({ invocations: _drop, ...r }) => ({ ...r, workspace_id: workspace })) };
  },
  (req) => {
    const m = match(req.path, /^\/workspaces\/([^/]+)\/runs\/preview$/);
    if (!(req.method === "POST" && m)) return undefined;
    const body = req.body as { check_id: string; target_id: string };
    return plan(decodeURIComponent(m[1]), body.check_id, body.target_id);
  },
  (req) => {
    const m = match(req.path, /^\/workspaces\/([^/]+)\/runs$/);
    if (!(req.method === "POST" && m)) return undefined;
    const body = req.body as { check_id: string; target_id: string };
    return plan(decodeURIComponent(m[1]), body.check_id, body.target_id);
  },
  (req) => {
    const m = match(req.path, /^\/workspaces\/([^/]+)\/runs\/([^/]+)$/);
    if (!(req.method === "GET" && m)) return undefined;
    const run = RUNS.find((r) => r.run_id === decodeURIComponent(m[2]));
    if (!run) throw notFound();
    return { ...run, workspace_id: decodeURIComponent(m[1]) };
  },

  /* observed */
  (req) => {
    const m = match(req.path, /^\/workspaces\/([^/]+)\/subjects$/);
    if (!(req.method === "GET" && m)) return undefined;
    return SUBJECTS;
  },
  (req) => {
    const m = match(req.path, /^\/workspaces\/([^/]+)\/observations$/);
    if (!(req.method === "GET" && m)) return undefined;
    const { subject, kind, invocation } = req.params as Record<string, string | undefined>;
    /* An observation is ABOUT something. `subject` or `invocation` — and `kind`
       alone is a 400 here exactly as it is on the server, because it qualifies
       a subject and is not a question on its own. Accepting it here would make
       the fixture the permissive one, which is the direction that hurts: a
       screen written against it would 400 the day it met the real thing. */
    if (!subject && !invocation) {
      throw new AppError({
        kind: "invalid",
        message: "an observation is about something",
        status: 400,
      });
    }
    return OBSERVATIONS.filter(
      (o) =>
        (!subject || o.subject_value === subject) &&
        (!kind || o.subject_kind === kind) &&
        (!invocation || o.invocation_id === invocation),
    );
  },
  (req) => {
    const m = match(req.path, /^\/workspaces\/([^/]+)\/observations\/([^/]+)\/lineage$/);
    if (!(req.method === "GET" && m)) return undefined;
    return lineageOf(decodeURIComponent(m[2]));
  },
  (req) => {
    const m = match(req.path, /^\/workspaces\/([^/]+)\/invocations\/([^/]+)\/extraction$/);
    if (!(req.method === "GET" && m)) return undefined;
    return EXTRACTION;
  },
];
