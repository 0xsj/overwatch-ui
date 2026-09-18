import { AppError } from "@/lib/kernel";
import type { MemoryRoute } from "@/lib/http";
import type { Chain, ChainInput, Check, CheckInput, Step } from "@/lib/services/checks";
import type { Extraction, Lineage, Observation, Subject } from "@/lib/services/observed";
import type { Invocation, RunDetail } from "@/lib/services/runs";
import type { Finding } from "@/lib/services/findings";
import type { Report, Revision, Section } from "@/lib/services/reports";
import type { Rule, RuleInput, Target } from "@/lib/services/targets";
import type { Mapping, MappingInput, Tool, ToolInput } from "@/lib/services/tooling";

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

let minted = 0;
const nextId = () => `01a07bcf-${(++minted).toString(16).padStart(4, "0")}-7000-9000-000000000000`;
const O = (n: number) => `01a07bc7-7008-7000-9000-00000000000${n}`;
const G = (n: number) => `01a07bc8-7009-7000-9000-00000000000${n}`;
const N = (n: number) => `01a07bc9-700b-7000-9000-${n.toString().padStart(12, "0")}`;

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

/* A placeholder is DOUBLE-braced, and this was single-braced until 2026-09-07.
   `run/domain.Argv` splits the template on whitespace and then substitutes any
   `{{...}}` field; `{host}` matches nothing, so it reaches the process as the
   literal string `{host}` and the tool scans a hostname that does not exist.
   Confirmed against the live server, which answered `["whois","{host}"]`.

   The NAME inside the braces is not bound to anything — `{{host}}`, `{{url}}`
   and `{{target}}` are the same placeholder, because a source step has exactly
   one input. It reads as documentation, not as a variable. */
const TOOLS: Tool[] = [
  {
    tool_id: T(1),
    org_id: "",
    name: "subfinder",
    argv: "subfinder -d {{host}} -silent",
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
    argv: "httpx -u {{host}} -silent -json",
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
    argv: "naabu -host {{host}} -top-ports 100 -json",
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
    argv: "tlsx -u {{host}} -json -san",
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
    argv: "nuclei -u {{url}} -severity medium,high,critical -jsonl",
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
    argv: "whois {{host}}",
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
    argv: "amass enum -d {{host}} -json -",
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
    role: "attribute",
    created_at: "2026-08-19T11:04:00Z",
  },
  {
    mapping_id: M(2),
    tool_id: T(2),
    field: "http.title",
    expression: "title",
    version: 1,
    state: "live",
    role: "attribute",
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
    role: "attribute",
    created_at: "2026-09-02T08:41:00Z",
  },
  {
    /* THE MAPPING THAT DRAWS AN EDGE. httpx echoes what it was given in
       `.input`, and `derived_from` is what turns that echo into a derivation —
       fragment → fragment, "read out of". It is refused outright on a tool
       whose `consumes` is empty: a source has no input to have read anything
       out of. */
    mapping_id: M(7),
    tool_id: T(2),
    field: "input",
    expression: "input",
    version: 1,
    state: "live",
    role: "derived_from",
    created_at: "2026-09-08T09:14:00Z",
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
    role: "attribute",
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
    role: "attribute",
    created_at: "2026-08-19T11:06:00Z",
  },
  {
    mapping_id: M(4),
    tool_id: T(4),
    field: "tls.san",
    expression: "tls.subject_an",
    version: 1,
    state: "live",
    role: "attribute",
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
    human: false,
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
    human: false,
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
    // A FLAG, not "has no chain". The check below it is also chainless and is
    // NOT human — it reports `never` forever, correctly, because it cannot run.
    human: true,
    archived: false,
    created_at: "2026-08-18T09:32:00Z",
  },
];

/* ─── The check that looks scheduled and never runs ───────────────────────
   Enabled, on a six-hour clock, and nothing wired to it. The backend used to
   retry it every tick and starve the queue; it skips it now, which is right and
   is INVISIBLE without a hint on this screen. */
CHECKS.push({
  check_id: C(4),
  org_id: "",
  name: "asn ranges",
  question: "What ranges are announced by the organisation's ASN?",
  applies_to: ["asn"],
  interval_seconds: 21600,
  enabled: true,
  human: false,
  archived: false,
  created_at: "2026-09-06T16:02:00Z",
});

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
    // A SOURCE step has exactly one candidate: the target.
    candidates: [
      { candidate_id: N(1), kind: "host", value: "halcyon.example", permitted: true },
    ],
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
    /* THE CASE WORTH READING. The step is `ok` and a rule still kept it off
       part of what it was pointed at — three permitted, one excluded by a rule,
       one that nothing permitted at all. Those last two are different facts and
       the second is `0010`'s default. */
    candidates: [
      { candidate_id: N(2), kind: "host", value: "api.halcyon.example", permitted: true },
      { candidate_id: N(3), kind: "host", value: "staging.halcyon.example", permitted: true },
      {
        candidate_id: N(4),
        kind: "host",
        value: "internal.halcyon.example",
        permitted: false,
        refusal_rule: G(2),
        refusal: "rule internal.halcyon.example excludes internal.halcyon.example",
      },
      {
        candidate_id: N(5),
        kind: "host",
        value: "vendor.example",
        permitted: false,
        // NO rule. Nothing permitted it — the commonest refusal there is.
        refusal: "nothing in this target's scope permits vendor.example",
      },
      { candidate_id: N(6), kind: "host", value: "cdn.halcyon.example", permitted: true },
    ],
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
    candidates: [
      { candidate_id: N(7), kind: "host", value: "api.halcyon.example", permitted: true },
    ],
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
    // NOTHING survived, so the whole STEP is refused rather than one candidate
    // inside it. Both shapes cite the same rule and they are not the same event.
    candidates: [
      {
        candidate_id: N(8),
        kind: "url",
        value: "https://api.halcyon.example",
        permitted: false,
        refusal: "no scope rule permits a loud spawn against api.halcyon.example",
      },
    ],
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
        candidates: [
          { candidate_id: N(9), kind: "host", value: "halcyon.example", permitted: true },
        ],
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
        candidates: [
          { candidate_id: N(10), kind: "host", value: "api.halcyon.example", permitted: true },
        ],
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
/** The SAME render `issue` freezes. One function, so a preview cannot drift
 *  from the document — and a DISABLED section is ABSENT rather than present and
 *  empty, because an empty section reads as "we looked and there was nothing". */
function revisionOf(report: Report): Revision {
  return {
    revision_id: N(51),
    report_id: report.report_id,
    issued_at: "2026-09-08T12:00:00Z",
    issued_by: "sj@31m.example",
    withheld: report.sections.filter((x) => !x.enabled).map((x) => x.title),
    sections: report.sections
      .filter((x) => x.enabled)
      .map((x) => ({ key: x.key, title: x.title, number: x.number!, body: null })),
  };
}

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
      const source = chain.sources.includes(step.step_id);
      return {
        invocation_id: `${I(9)}${n}`,
        step_id: step.step_id,
        tool_id: step.tool_id,
        sequence: depth.get(step.step_id) ?? 0,
        state: loud ? "refused" : "pending",
        /* The UNSUBSTITUTED template, and that is the point at preview time —
           `decisions/0039`. Nothing has run, so there is nothing to substitute,
           and a `{{host}}` on the screen reads as unresolved rather than as a
           bug. A downstream step is `pending` here rather than `skipped`;
           `skipped` now means its feeders ran and produced nothing it eats. */
        argv: (tool?.argv ?? "").split(" "),
        refusal: loud
          ? "no scope rule permits a loud spawn against this target"
          : undefined,
        duration_ms: 0,
        /* A SOURCE step has exactly one candidate — the target. A downstream
           one has an EMPTY list, which says nothing is resolved yet, and that
           is a different claim from a missing key. */
        candidates: source
          ? [{
              candidate_id: `${N(20)}${n}`,
              kind: "host" as const,
              value: TARGETS[0]?.name ?? "the target",
              permitted: !loud,
              refusal: loud
                ? "no scope rule permits a loud spawn against this target"
                : undefined,
            }]
          : [],
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

/* ─── findings — `decisions/0041` ────────────────────────────────────────
   Three rows, and each carries a fact the board is built to keep apart. One has
   thirty sightings against an old first_seen, which is the only evidence a
   reader gets that a fix did not hold. One was dismissed WITH a reason. One had
   its severity overridden by a person, and the prior claim is kept beside it
   because the correction is the signal.                                     */

const FINDINGS: Finding[] = [
  {
    finding_id: N(40),
    tool_id: T(5),
    signature: "CVE-2021-44228",
    fragment_id: N(41),
    fragment_kind: "url",
    fragment_value: "https://api.halcyon.example/v1",
    state: "open",
    severity: "critical",
    severity_by: {
      claimant: "rule",
      basis: "reported by CVE-2021-44228",
      at: "2026-09-06T22:05:00Z",
      // No confidence: a template asserting `critical` is a CATEGORY.
    },
    first_seen: "2026-08-21T03:00:00Z",
    last_seen: "2026-09-06T22:05:00Z",
    sightings: 30,
    invocation_id: I(4),
    artifact_id: A(2),
  },
  {
    finding_id: N(42),
    tool_id: T(5),
    signature: "exposed-git-directory",
    fragment_id: N(43),
    fragment_kind: "url",
    fragment_value: "https://staging.halcyon.example/.git/",
    state: "triaged",
    severity: "high",
    severity_by: {
      claimant: "human",
      actor: "sj@31m.example",
      basis: "the repository is public anyway, but the config leaks a token",
      at: "2026-09-07T09:40:00Z",
      // The correction is the signal, so what it replaced is kept.
      superseded: {
        severity: "medium",
        claimant: "rule",
        basis: "reported by exposed-git-directory",
        at: "2026-09-06T22:05:00Z",
      },
    },
    first_seen: "2026-09-06T22:05:00Z",
    last_seen: "2026-09-06T22:05:00Z",
    sightings: 1,
    invocation_id: I(4),
    artifact_id: A(2),
  },
  {
    finding_id: N(44),
    tool_id: T(5),
    signature: "missing-hsts",
    fragment_id: N(45),
    fragment_kind: "url",
    fragment_value: "https://cdn.halcyon.example/",
    state: "dismissed",
    // REQUIRED on a dismissal. Without it this reads as `never looked at` in
    // six months, which is what the server refuses.
    reason: "static asset host, no session ever travels over it",
    decided_by: "sj@31m.example",
    decided_at: "2026-09-07T10:02:00Z",
    severity: "low",
    severity_by: {
      claimant: "rule",
      basis: "reported by missing-hsts",
      at: "2026-09-06T22:05:00Z",
    },
    first_seen: "2026-09-06T22:05:00Z",
    last_seen: "2026-09-06T22:05:00Z",
    sightings: 4,
    invocation_id: I(4),
    artifact_id: A(2),
  },
];

/* ─── reports — `decisions/0042` ─────────────────────────────────────────
   SEVEN sections always, with `enabled` on each. The two that ship OFF are the
   ones a screen most needs to draw, and `coverage` cannot be turned off at all
   — so it carries no toggle rather than a toggle that is refused.           */

const SECTIONS: Section[] = [
  { key: "summary", title: "Summary", enabled: true, number: 1, mandatory: false, withheld: false },
  {
    key: "coverage",
    title: "Coverage — what was and was not looked at",
    enabled: true,
    number: 2,
    // The one that cannot be off. Turning it off is a 400 whose message is the
    // thesis: a report without it claims completeness it did not measure.
    mandatory: true,
    withheld: false,
  },
  { key: "assets", title: "Assets and how they were attributed", enabled: true, number: 3, mandatory: false, withheld: false },
  { key: "findings", title: "Findings", enabled: true, number: 4, mandatory: false, withheld: false },
  { key: "scope", title: "Scope as it stood", enabled: true, number: 5, mandatory: false, withheld: false },
  {
    key: "invocation_log",
    title: "Invocation log, including refusals",
    enabled: false,
    mandatory: false,
    withheld: true,
    warning:
      "removes the SCOPE PROOF. It is the record of what did not run, and \"did you stay in scope\" is answered from it",
  },
  {
    key: "artifacts",
    title: "Raw artifacts",
    enabled: false,
    mandatory: false,
    withheld: true,
    warning:
      "hands over the bytes a scanner produced against the client's estate. Generating a report and receiving its artifacts are two capabilities, which is why these are two toggles",
  },
];

const REPORTS: Report[] = [
  {
    report_id: N(50),
    workspace_id: "",
    target_id: TARGET,
    title: "Halcyon — Q3 engagement",
    prepared_by: "S. Jarratt",
    period_start: "2026-07-01T00:00:00Z",
    period_end: "2026-09-30T00:00:00Z",
    sections: SECTIONS,
    revisions: 1,
    created_at: "2026-09-07T14:00:00Z",
  },
];

/* ─── routes ──────────────────────────────────────────────────────────────
   Two path roots, and which one a noun lives under is `decisions/0031`. A tool
   and a check are what the FIRM can do, so they are under `/orgs`; a run and an
   observation are claims about a CLIENT, so they keep the narrow key.       */

const match = (path: string, pattern: RegExp) => pattern.exec(path);

export const workRoutes: MemoryRoute[] = [
  /* reports */
  (req) => {
    const m = match(req.path, /^\/workspaces\/([^/]+)\/reports$/);
    if (!(req.method === "GET" && m)) return undefined;
    return REPORTS.map((r) => ({ ...r, workspace_id: decodeURIComponent(m[1]) }));
  },
  (req) => {
    const m = match(req.path, /^\/workspaces\/([^/]+)\/reports\/([^/]+)$/);
    if (!(req.method === "GET" && m)) return undefined;
    const found = REPORTS.find((r) => r.report_id === decodeURIComponent(m[2]));
    if (!found) throw notFound();
    return { ...found, workspace_id: decodeURIComponent(m[1]) };
  },
  (req) => {
    const m = match(req.path, /^\/workspaces\/([^/]+)\/reports\/([^/]+)\/sections\/([^/]+)$/);
    if (!(req.method === "PUT" && m)) return undefined;
    const found = REPORTS.find((r) => r.report_id === decodeURIComponent(m[2]));
    if (!found) throw notFound();
    const key = decodeURIComponent(m[3]);
    const section = found.sections.find((x) => x.key === key);
    if (!section) throw notFound();
    const { enabled } = req.body as { enabled: boolean };
    /* The refusal whose message IS the thesis. A report that can omit what it
       did not look at is a report that can claim completeness it never had. */
    if (section.mandatory && !enabled)
      throw new AppError({
        kind: "invalid",
        status: 400,
        message:
          "coverage cannot be turned off — a report that omits what was not looked at claims a completeness it did not measure",
      });
    section.enabled = enabled;
    // Numbers RENUMBER over the enabled set: disable the second and 3–7 become
    // 2–6. A stored number would be wrong the moment a toggle moved.
    let n = 0;
    for (const x of found.sections) x.number = x.enabled ? ++n : undefined;
    return found;
  },
  (req) => {
    const m = match(req.path, /^\/workspaces\/([^/]+)\/reports\/([^/]+)\/preview$/);
    if (!(req.method === "GET" && m)) return undefined;
    const found = REPORTS.find((r) => r.report_id === decodeURIComponent(m[2]));
    if (!found) throw notFound();
    return revisionOf(found);
  },
  (req) => {
    const m = match(req.path, /^\/workspaces\/([^/]+)\/reports\/([^/]+)\/revisions$/);
    if (!(req.method === "POST" && m)) return undefined;
    const found = REPORTS.find((r) => r.report_id === decodeURIComponent(m[2]));
    if (!found) throw notFound();
    found.revisions += 1;
    return revisionOf(found);
  },

  /* findings. Sorted WORST FIRST then newest — server-side, because a board
     sorted by time puts a critical from Tuesday under an info from today. */
  (req) => {
    const m = match(req.path, /^\/workspaces\/([^/]+)\/findings$/);
    if (!(req.method === "GET" && m)) return undefined;
    const state = req.params.state as string | undefined;
    const order = ["critical", "high", "medium", "low", "info"];
    return FINDINGS.filter((f) => !state || f.state === state).sort(
      (a, b) =>
        order.indexOf(a.severity) - order.indexOf(b.severity) ||
        b.last_seen.localeCompare(a.last_seen),
    );
  },
  (req) => {
    const m = match(req.path, /^\/workspaces\/([^/]+)\/findings\/([^/]+)\/state$/);
    if (!(req.method === "PUT" && m)) return undefined;
    const found = FINDINGS.find((f) => f.finding_id === decodeURIComponent(m[2]));
    if (!found) throw notFound();
    const b = req.body as { state?: string; reason?: string };
    // A finding reopens by being SEEN again, never by being asked to.
    if (b.state === "open")
      throw new AppError({
        kind: "invalid", status: 400,
        message: "a finding reopens by being seen again, not by being reopened",
      });
    if (b.state === "dismissed" && !b.reason?.trim())
      throw new AppError({
        kind: "invalid", status: 400,
        message: "dismissing needs a reason — a dismissal with no reason reads as `never looked at` in six months",
      });
    found.state = b.state as Finding["state"];
    found.reason = b.reason || undefined;
    found.decided_by = "sj@31m.example";
    found.decided_at = "2026-09-08T12:00:00Z";
    return found;
  },
  (req) => {
    const m = match(req.path, /^\/workspaces\/([^/]+)\/findings\/([^/]+)\/severity$/);
    if (!(req.method === "PUT" && m)) return undefined;
    const found = FINDINGS.find((f) => f.finding_id === decodeURIComponent(m[2]));
    if (!found) throw notFound();
    const b = req.body as { severity?: Finding["severity"]; basis?: string };
    /* `basis` is REQUIRED: replacing somebody else's assessment is a
       disagreement, and one with no stated reason records that somebody
       disagreed without saying why they were right. */
    if (!b.basis?.trim())
      throw new AppError({
        kind: "invalid", status: 400,
        message: "say why — an override with no basis records a disagreement with no argument",
      });
    found.severity_by = {
      claimant: "human",
      actor: "sj@31m.example",
      basis: b.basis,
      at: "2026-09-08T12:00:00Z",
      superseded: { ...found.severity_by, severity: found.severity },
    };
    found.severity = b.severity ?? found.severity;
    return found;
  },

  /* targets and scope */
  (req) => {
    const m = match(req.path, /^\/workspaces\/([^/]+)\/targets$/);
    if (!(req.method === "POST" && m)) return undefined;
    const body = req.body as { name: string; kind: Target["kind"] };
    const made: Target = {
      target_id: nextId(),
      name: body.name,
      kind: body.kind,
      archived: false,
      created_at: "2026-09-08T12:00:00Z",
    };
    TARGETS.push(made);
    return made;
  },
  (req) => {
    const m = match(req.path, /^\/workspaces\/([^/]+)\/targets\/([^/]+)$/);
    if (!(req.method === "DELETE" && m)) return undefined;
    const found = TARGETS.find((t) => t.target_id === decodeURIComponent(m[2]));
    if (!found) throw notFound();
    // HIDDEN, not deleted: every run, observation and attribution names it.
    found.archived = true;
    return null;
  },
  (req) => {
    const m = match(req.path, /^\/workspaces\/([^/]+)\/targets\/([^/]+)\/reopen$/);
    if (!(req.method === "POST" && m)) return undefined;
    const found = TARGETS.find((t) => t.target_id === decodeURIComponent(m[2]));
    if (!found) throw notFound();
    found.archived = false;
    return found;
  },
  (req) => {
    const m = match(req.path, /^\/workspaces\/([^/]+)\/targets$/);
    if (!(req.method === "GET" && m)) return undefined;
    const all = req.params.archived === 1 || req.params.archived === "1";
    return all ? TARGETS : TARGETS.filter((t) => !t.archived);
  },
  (req) => {
    const m = match(req.path, /^\/workspaces\/([^/]+)\/targets\/([^/]+)\/scope$/);
    if (!(req.method === "POST" && m)) return undefined;
    const body = req.body as RuleInput;
    const made: Rule = {
      rule_id: nextId(),
      pattern: body.pattern,
      polarity: body.polarity,
      gate: body.gate,
      kinds: body.kinds,
      // ABSENT on a claim rule rather than empty: there are no processes on
      // that gate, so an empty array would be a claim nobody made.
      tools: body.gate === "spawn" ? body.tools : undefined,
      created_at: "2026-09-08T12:00:00Z",
    };
    RULES.push(made);
    return made;
  },
  (req) => {
    const m = match(req.path, /^\/workspaces\/([^/]+)\/targets\/([^/]+)\/scope\/([^/]+)$/);
    if (!(req.method === "DELETE" && m)) return undefined;
    const found = RULES.find((r) => r.rule_id === decodeURIComponent(m[3]));
    if (!found) throw notFound();
    /* SUPERSEDE, not delete — `0030`. The row keeps its id forever, because an
       invocation's refusal and a finding's scope proof both cite it, and a
       citation that stopped resolving would be the ledger failing at the one
       job it has. */
    found.superseded_at = "2026-09-08T12:00:00Z";
    return null;
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
    const m = match(req.path, /^\/orgs\/([^/]+)\/tools$/);
    if (!(req.method === "POST" && m)) return undefined;
    const body = req.body as ToolInput;
    // 201 with the row as stored. `success_exit_codes` is echoed here and NOT
    // on the live server, which drops it in the projection — the fixture is
    // deliberately the correct one, because the client reads both through
    // `successCodes` and a fixture that reproduced the bug would hide it.
    const made: Tool = {
      tool_id: nextId(),
      org_id: decodeURIComponent(m[1]),
      name: body.name,
      argv: body.argv,
      intensity: body.intensity,
      consumes: body.consumes,
      produces: body.produces,
      success_exit_codes: body.success_exit_codes ?? [0],
      archived: false,
      created_at: "2026-09-07T12:00:00Z",
    };
    TOOLS.push(made);
    return made;
  },
  (req) => {
    const m = match(req.path, /^\/orgs\/([^/]+)\/tools\/([^/]+)$/);
    if (!(req.method === "DELETE" && m)) return undefined;
    const toolId = decodeURIComponent(m[2]);
    const tool = TOOLS.find((t) => t.tool_id === toolId);
    if (!tool) throw notFound();
    /* REFUSED while a live check still runs it, and the refusal NAMES the
       checks. "You cannot archive this tool" with no reason is a dead end; the
       fix exists and is the reader's. */
    const using = [...CHAINS.entries()]
      .filter(([, chain]) => chain.steps.some((st) => st.tool_id === toolId))
      .map(([id]) => CHECKS.find((c) => c.check_id === id)?.name ?? id);
    if (using.length > 0)
      throw new AppError({
        kind: "conflict",
        status: 409,
        message: `this tool is still used by ${using.join(", ")}`,
      });
    tool.archived = true;
    return null;
  },
  (req) => {
    const m = match(req.path, /^\/orgs\/([^/]+)\/tools\/([^/]+)\/mappings$/);
    if (!(req.method === "GET" && m)) return undefined;
    return MAPPINGS.filter((x) => x.tool_id === decodeURIComponent(m[2]));
  },
  (req) => {
    const m = match(req.path, /^\/orgs\/([^/]+)\/tools\/([^/]+)\/mappings$/);
    if (!(req.method === "POST" && m)) return undefined;
    const toolId = decodeURIComponent(m[2]);
    const body = req.body as MappingInput;
    /* A version, never an edit — and promoting RETIRES the incumbent first, so
       "exactly one live per field" holds. The retired row stays: every
       observation it made cites it. */
    /* A source tool has NO INPUT to have read anything out of, so the server
       refuses this outright. The editor should grey the option rather than let
       somebody type an expression and then read a 400. */
    if (body.role === "derived_from" && !TOOLS.find((t) => t.tool_id === toolId)?.consumes)
      throw new AppError({
        kind: "invalid",
        status: 400,
        message: "derived_from needs a tool that consumes something",
      });
    /* ONE LIVE PER ROLE, for the four roles the server indexes that way —
       `mapping_one_subject`, `_signature`, `_severity`, `_source`. The fixture
       retired only by FIELD until 2026-09-08, so a second live `subject` under
       a different field was accepted here and refused by a unique index there:
       a fixture that is MORE PERMISSIVE than the server, which is the one way
       these are allowed to differ and the one way that costs somebody a day. */
    const role = body.role ?? "attribute";
    if (body.promote && role !== "attribute") {
      const held = MAPPINGS.find(
        (x) => x.tool_id === toolId && x.role === role && x.state === "live" && x.field !== body.field,
      );
      if (held)
        throw new AppError({
          kind: "conflict",
          status: 409,
          message: `this tool already has a live ${role} mapping on ${held.field}`,
        });
    }
    const prior = MAPPINGS.filter((x) => x.tool_id === toolId && x.field === body.field);
    if (body.promote) for (const old of prior) if (old.state === "live") old.state = "retired";
    const made: Mapping = {
      mapping_id: nextId(),
      tool_id: toolId,
      field: body.field,
      expression: body.expression,
      version: prior.length + 1,
      state: body.promote ? "live" : "draft",
      // Absent means `attribute` — the harmless one: a mapping nobody thought
      // about reads a value and changes nothing else.
      role: body.role ?? "attribute",
      created_at: "2026-09-07T12:00:00Z",
    };
    MAPPINGS.push(made);
    return made;
  },
  (req) => {
    const m = match(req.path, /^\/orgs\/([^/]+)\/tools\/([^/]+)\/mappings\/([^/]+)\/promote$/);
    if (!(req.method === "POST" && m)) return undefined;
    const mapping = MAPPINGS.find((x) => x.mapping_id === decodeURIComponent(m[3]));
    if (!mapping) throw notFound();
    for (const other of MAPPINGS)
      if (other.tool_id === mapping.tool_id && other.field === mapping.field && other.state === "live")
        other.state = "retired";
    mapping.state = "live";
    return mapping;
  },

  /* checks */
  (req) => {
    const m = match(req.path, /^\/orgs\/([^/]+)\/checks$/);
    if (!(req.method === "POST" && m)) return undefined;
    const body = req.body as CheckInput;
    const made: Check = {
      check_id: nextId(),
      org_id: decodeURIComponent(m[1]),
      name: body.name,
      question: body.question,
      applies_to: body.applies_to,
      // 0 and absent are the same kind of check — "when somebody asks" — and
      // storing a zero would read as an interval of no length.
      interval_seconds: body.interval_seconds || undefined,
      enabled: body.enabled,
      human: body.human,
      archived: false,
      created_at: "2026-09-08T12:00:00Z",
    };
    CHECKS.push(made);
    // A human check has no chain to wire, and a new one starts empty either
    // way — which is exactly the state the list warns about.
    CHAINS.set(made.check_id, { steps: [], flows: [], sources: [] });
    return made;
  },
  (req) => {
    const m = match(req.path, /^\/orgs\/([^/]+)\/checks\/([^/]+)$/);
    if (!(req.method === "PATCH" && m)) return undefined;
    const found = CHECKS.find((c) => c.check_id === decodeURIComponent(m[2]));
    if (!found) throw notFound();
    const body = req.body as CheckInput;
    Object.assign(found, {
      name: body.name,
      question: body.question,
      applies_to: body.applies_to,
      interval_seconds: body.interval_seconds || undefined,
      enabled: body.enabled,
      human: body.human,
    });
    return found;
  },
  (req) => {
    const m = match(req.path, /^\/orgs\/([^/]+)\/checks\/([^/]+)$/);
    if (!(req.method === "DELETE" && m)) return undefined;
    const found = CHECKS.find((c) => c.check_id === decodeURIComponent(m[2]));
    if (!found) throw notFound();
    found.archived = true;
    return null;
  },
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
    /* A minted id must be unique across REQUESTS, not just within one. A
       per-request counter re-issued the same id on every save, so two steps
       added one after the other collided — React deduped them by key and the
       second silently never appeared. The graph looked like the add had done
       nothing, and there was no error anywhere. */
    const steps: Step[] = input.steps.map((st) => ({
      step_id: st.step_id || nextId(),
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
    /* A CYCLE is a 400 BEFORE anything is written. A diamond — two paths
       joining — is not a cycle and saves fine, which is why this walks the
       graph rather than counting edges. Reproduced here because a fixture that
       accepted one would let somebody build a chain the real server refuses. */
    const out = new Map<string, string[]>();
    for (const f of flows) out.set(f.from, [...(out.get(f.from) ?? []), f.to]);
    const seen = new Set<string>();
    const onPath = new Set<string>();
    const cycles = (at: string): boolean => {
      if (onPath.has(at)) return true;
      if (seen.has(at)) return false;
      seen.add(at);
      onPath.add(at);
      for (const next of out.get(at) ?? []) if (cycles(next)) return true;
      onPath.delete(at);
      return false;
    };
    if (steps.some((st) => cycles(st.step_id)))
      throw new AppError({ kind: "invalid", status: 400, message: "the chain has a cycle" });

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
