import { AppError } from "@/lib/kernel";
import type { MemoryRoute } from "@/lib/http";
import type { Check, Run, SpawnPreview, ToolDef } from "@/lib/services/pipeline";

/* ─── Nothing here is served. `tool`, `check`, `run` and `invocation` are all
       UNBUILT in §Scope, so this is the whole implementation and it exists so
       the shape can be argued with before a backend commits to it.

   Answers EVERY session, unlike `fixtures/access.ts`, and the difference is the
   whole point. `access` refuses a real session because the SERVER serves
   access — a real account seeing fixture invitations would be one tenant's
   invented data on another's screen. Nothing serves `pipeline`, there is no real
   data for these rows to be confused with, and none of them is tenant data:
   they are invented tool definitions and invented runs.

   That guard was copied here from `access` without its reasoning coming along,
   and the cost was the entire surface — signed in for real, every check
   answered 404. The yellow mock badge is what tells somebody this is invented;
   an empty page tells them the product is broken.                          */

const TOOLS: ToolDef[] = [
  {
    tool_id: "subfinder",
    name: "subfinder",
    argv: "subfinder -d {domain} -silent",
    produces: "host",
    loud: false,
  },
  {
    tool_id: "httpx",
    name: "httpx",
    argv: "httpx -u {host} -silent -json",
    consumes: "host",
    produces: "url",
    loud: false,
  },
  {
    tool_id: "nuclei",
    name: "nuclei",
    argv: "nuclei -u {url} -severity medium,high,critical",
    consumes: "url",
    produces: "finding",
    // Loud: it sends payloads. `decisions/0019` puts loud tools behind `admin`
    // on the workspace, which is why the node says so.
    loud: true,
  },
  {
    tool_id: "tlsx",
    name: "tlsx",
    argv: "tlsx -u {host} -json -san",
    consumes: "host",
    produces: "domain",
    loud: false,
  },
  {
    tool_id: "naabu",
    name: "naabu",
    argv: "naabu -host {host} -top-ports 100",
    consumes: "host",
    produces: "url",
    loud: true,
  },
];

/** subfinder fans out to three, and two of those three do not produce anything
 *  — for entirely different reasons. That asymmetry is the fixture's whole
 *  point: it is what a table renders as three similar rows. */
const CHECK: Check = {
  check_id: "chk_attribution",
  name: "Attribution sweep",
  question: "What is reachable under this org's domains, and does any of it answer?",
  interval: "PT24H",
  enabled: true,
  steps: [
    { step_id: "s1", tool_id: "subfinder" },
    { step_id: "s2", tool_id: "httpx" },
    { step_id: "s3", tool_id: "tlsx" },
    { step_id: "s4", tool_id: "naabu" },
    { step_id: "s5", tool_id: "nuclei" },
  ],
  flows: [
    { from: "s1", to: "s2" },
    { from: "s1", to: "s3" },
    { from: "s1", to: "s4" },
    { from: "s2", to: "s5" },
  ],
};

const SECOND: Check = {
  check_id: "chk_cert_watch",
  name: "Certificate watch",
  question: "Has a new name appeared on a certificate we already know about?",
  // No interval: it runs when somebody asks. An absent interval is a real kind
  // of check, not an unset field.
  enabled: false,
  steps: [{ step_id: "t1", tool_id: "tlsx" }],
  flows: [],
};

const RUNS: Run[] = [
  {
    run_id: "run_0192",
    check_id: "chk_attribution",
    target: "northbeam.example",
    state: "complete",
    started_at: "2026-09-07T09:04:11Z",
    invocations: [
      {
        invocation_id: "inv_1",
        step_id: "s1",
        state: "ok",
        argv: "subfinder -d northbeam.example -silent",
        exit: 0,
        bytes: 4127,
        artifact_id: "art_9f2c",
        started_at: "2026-09-07T09:04:11Z",
        duration_ms: 8420,
        observations: 63,
      },
      {
        invocation_id: "inv_2",
        step_id: "s2",
        state: "ok",
        argv: "httpx -silent -json",
        exit: 0,
        bytes: 18944,
        artifact_id: "art_3a01",
        started_at: "2026-09-07T09:04:20Z",
        duration_ms: 14100,
        // It ran, the mapping ran, and it matched nothing. `0` is a result and
        // is not the same as the field being absent.
        observations: 0,
      },
      {
        invocation_id: "inv_3",
        step_id: "s3",
        state: "failed",
        argv: "tlsx -json -san",
        // It RAN and broke. There is an exit code, which is what separates this
        // from the two below.
        exit: 127,
        started_at: "2026-09-07T09:04:20Z",
        duration_ms: 90,
      },
      {
        invocation_id: "inv_4",
        step_id: "s4",
        state: "refused",
        argv: "naabu -top-ports 100",
        // A rule said no. No exit code, because no process ever existed — and
        // the reason names the rule rather than apologising.
        refusal: "scope excludes 198.51.100.0/24, and every host resolved into it",
        started_at: "2026-09-07T09:04:20Z",
      },
      {
        invocation_id: "inv_5",
        step_id: "s5",
        state: "skipped",
        argv: "nuclei -severity medium,high,critical",
        // Nobody ran it. Upstream produced nothing to feed it, which is neither
        // a break nor a refusal.
        skipped_because: "httpx produced no urls, so there was nothing to scan",
      },
    ],
  },
  {
    run_id: "run_0191",
    check_id: "chk_attribution",
    target: "northbeam.example",
    state: "running",
    started_at: "2026-09-07T10:31:02Z",
    invocations: [
      {
        invocation_id: "inv_6",
        step_id: "s1",
        state: "ok",
        argv: "subfinder -d northbeam.example -silent",
        exit: 0,
        bytes: 4210,
        artifact_id: "art_1d77",
        started_at: "2026-09-07T10:31:02Z",
        duration_ms: 7980,
        observations: 64,
      },
      { invocation_id: "inv_7", step_id: "s2", state: "running", argv: "httpx -silent -json", started_at: "2026-09-07T10:31:10Z" },
      { invocation_id: "inv_8", step_id: "s3", state: "running", argv: "tlsx -json -san", started_at: "2026-09-07T10:31:10Z" },
      { invocation_id: "inv_9", step_id: "s4", state: "pending", argv: "naabu -top-ports 100" },
      { invocation_id: "inv_10", step_id: "s5", state: "pending", argv: "nuclei -severity medium,high,critical" },
    ],
  },
];

/** What the spawn gate would say, before anything runs.
 *
 *  Two refusals with different causes, because that is the case a person needs
 *  to see: one is about the TARGET and one is about the CALLER. Both come back
 *  as a refusal and neither is an error.
 *
 *  The caller one states the RULE and never the caller's level. A real endpoint
 *  resolves the level from the bearer; this fixture has no identity for a real
 *  session, so a sentence like "and you hold write" is a claim it cannot make —
 *  and it made it, on a screen whose own chrome said `admin` two inches above.
 *  Saying what the gate requires is true for everybody and contradicts
 *  nothing. */
const PREVIEW: SpawnPreview[] = [
  { step_id: "s1", argv: "subfinder -d northbeam.example -silent", verdict: "permitted" },
  { step_id: "s2", argv: "httpx -silent -json", verdict: "permitted" },
  { step_id: "s3", argv: "tlsx -json -san", verdict: "permitted" },
  {
    step_id: "s4",
    argv: "naabu -top-ports 100",
    verdict: "refused",
    reason: "scope excludes 198.51.100.0/24 — exclude beats include, so this never spawns",
  },
  {
    step_id: "s5",
    argv: "nuclei -severity medium,high,critical",
    verdict: "refused",
    reason: "a loud tool needs admin on this engagement — the gate resolves that per caller",
  },
];

const CHECKS = new Map(
  [CHECK, SECOND].map((c) => [c.check_id, structuredClone(c)] as const),
);

const notFound = () => new AppError({ kind: "not_found", message: "not found", status: 404 });

export const pipelineRoutes: MemoryRoute[] = [
  (req) => {
    if (!(req.method === "GET" && req.path === "/tools")) return undefined;
    return TOOLS;
  },
  (req) => {
    if (!(req.method === "GET" && req.path === "/checks")) return undefined;
    return [...CHECKS.values()];
  },
  (req) => {
    const match = /^\/checks\/([^/]+)$/.exec(req.path);
    if (!(req.method === "GET" && match)) return undefined;
    return CHECKS.get(decodeURIComponent(match[1])) ?? (() => { throw notFound(); })();
  },
  (req) => {
    const match = /^\/checks\/([^/]+)$/.exec(req.path);
    if (!(req.method === "PUT" && match)) return undefined;
    const next = req.body as Check;
    CHECKS.set(next.check_id, next);
    return next;
  },
  (req) => {
    const match = /^\/checks\/([^/]+)\/runs$/.exec(req.path);
    if (!(req.method === "GET" && match)) return undefined;
    const id = decodeURIComponent(match[1]);
    return RUNS.filter((r) => r.check_id === id);
  },
  (req) => {
    const match = /^\/checks\/([^/]+)\/spawn-preview$/.exec(req.path);
    if (!(req.method === "GET" && match)) return undefined;
    return PREVIEW;
  },
  (req) => {
    const match = /^\/runs\/([^/]+)$/.exec(req.path);
    if (!(req.method === "GET" && match)) return undefined;
    const run = RUNS.find((r) => r.run_id === decodeURIComponent(match[1]));
    if (!run) throw notFound();
    return run;
  },
];
