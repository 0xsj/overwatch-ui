"use client";

import { useState, useTransition } from "react";
import { Badge, Panel } from "@/components/display";
import {
  Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/forms";
import { Alert } from "@/components/feedback";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/navigation";
import { Text } from "@/components/typography";
import type { Chain, ChainInput, Check } from "@/lib/services/checks";
import type { Tool } from "@/lib/services/tooling";
import type { Run, RunDetail as RunRecord } from "@/lib/services/runs";
import type { Target } from "@/lib/services/targets";
import {
  pinStepAction, previewAction, readRunAction, saveChainAction, startRunAction,
} from "../_actions";
import { keys } from "@/lib/query";
import { useAfterWrite } from "../../../_hooks";
import { RunDetail } from "../../../_components/run-detail";
import { FlowGraph, STATE_MEANING } from "./flow-graph";
import { StepDetail } from "./step-detail";
import s from "./check-workspace.module.css";

/** Editor and Executions over one check.
 *
 *  The split survives contact with the backend because the nouns matched: a
 *  `check` is the definition and belongs to the FIRM; a `run` is *"a pipeline
 *  against a target"* and belongs to the ENGAGEMENT. Editor is the question,
 *  Executions is what happened when it was asked — and they read different
 *  endpoints under different paths for exactly that reason.
 *
 *  There is no third tab. n8n's is Evaluations; `coverage` already answers our
 *  version and answers it across every check at once. */
export function CheckWorkspace({
  check,
  chain,
  tools,
  runs,
  targets,
  orgId,
  workspaceId,
  workspaceName,
}: {
  check: Check;
  chain: Chain;
  tools: Tool[];
  runs: Run[];
  targets: Target[];
  orgId: string;
  workspaceId: string | null;
  workspaceName: string | null;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [plan, setPlan] = useState<RunRecord | null>(null);
  const [opened, setOpened] = useState<RunRecord | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const afterWrite = useAfterWrite();
  /* The WHOLE graph, because a save sends the whole graph. Holding only the
     steps meant an edge drawn on screen had nowhere to live until a reload. */
  const [graph, setGraph] = useState(chain);
  const steps = graph.steps;
  /* Which target, and it is a real one.
   *
   *  This screen sent the WORKSPACE id where a target id belonged until
   *  2026-09-07 — a placeholder from before the client had a targets service,
   *  and one nothing could type-check because both are strings. It would have
   *  404'd against the live server on the first press. A target is an
   *  organisation or a person, never a hostname; a check is a question asked
   *  ABOUT one, so nothing here can run until one is chosen. */
  /* CHOSEN, not frozen. `useState(targets[0])` captured an empty list on the
     first render and never revisited it, so once the targets arrived by query
     the picker still read "pick a target" and the copy beside it said
     "Against null" — the initial state was computed before the data existed.
     Deriving the default means the first target is selected the moment there
     is one, and an explicit choice still wins. */
  const [picked, setPicked] = useState<string | null>(null);
  const targetId = picked ?? targets[0]?.target_id ?? null;
  const target = targets.find((t) => t.target_id === targetId);

  const pin = (stepId: string, at: { x: number; y: number }) => {
    setGraph((g) => ({
      ...g,
      steps: g.steps.map((st) =>
        st.step_id === stepId ? { ...st, x: at.x, y: at.y, pinned: true } : st,
      ),
    }));
    void pinStepAction(orgId, check.check_id, stepId, at);
  };

  /** Every edit sends the whole graph and ADOPTS what comes back.
   *
   *  Not reconciles — adopts. A step being created has no id and an edge onto
   *  it names it by INDEX, and that index is meaningful only inside the request
   *  that sent it. The response carries real ids for everything, so the only
   *  correct thing to do with local state afterwards is replace it.
   *
   *  A CYCLE is a 400 before anything is written, so this is also where that
   *  refusal surfaces — which is the right moment for it: the person just drew
   *  the edge that caused it. */
  const save = (next: ChainInput) =>
    start(async () => {
      setRefusal(null);
      const result = (await afterWrite(
        () => saveChainAction(orgId, check.check_id, next),
        [keys.checks.all(orgId)],
      )) as Awaited<ReturnType<typeof saveChainAction>>;
      if ("chain" in result) setGraph(result.chain);
      else setRefusal("message" in result ? result.message : "That was refused.");
    });

  const asInput = (): ChainInput => ({
    steps: graph.steps.map((st) => ({
      step_id: st.step_id,
      tool_id: st.tool_id,
      x: st.x,
      y: st.y,
      pinned: st.pinned,
    })),
    flows: graph.flows.map((f) => ({ from: f.from, to: f.to })),
  });

  /** A new step, and it carries no id — the server mints one. Placed to the
   *  right of everything so it does not land under an existing node. */
  const addStep = (toolId: string) => {
    const input = asInput();
    save({
      ...input,
      steps: [
        ...input.steps,
        {
          tool_id: toolId,
          x: Math.max(0, ...graph.steps.map((st) => st.x)) + 260,
          y: 0,
          pinned: false,
        },
      ],
    });
  };

  /** Why this edge cannot carry anything, or `null` if it can.
   *
   *  The SAME RULE the server enforces on save, applied while the edge is
   *  being drawn — `0032` deferred this and `0039` made it matter: a
   *  downstream step resolves its candidates from its feeders' observations
   *  FILTERED TO THE KIND ITS TOOL CONSUMES, so a mismatched edge yields zero
   *  candidates every time and the step reports "nothing upstream produced
   *  observations to feed it" — indistinguishable from a feeder that genuinely
   *  found nothing.
   *
   *  Refusing it here puts the message on the edge rather than on the save,
   *  which is where somebody can act on it. It is not a substitute for the
   *  server's check and does not pretend to be: a chain saved before today may
   *  be illegal and still load, so the editor can hold a graph it would refuse
   *  to draw. */
  const whyNot = (from: string, to: string): string | null => {
    const source = tools.find((t) => t.tool_id === steps.find((st) => st.step_id === from)?.tool_id);
    const target = tools.find((t) => t.tool_id === steps.find((st) => st.step_id === to)?.tool_id);
    if (!source || !target) return null;
    if (!source.produces) return "that step's tool produces nothing, so it cannot feed another";
    if (!target.consumes) return "that step's tool is seeded from the target and cannot be fed by another";
    if (source.produces !== target.consumes)
      return "that connection carries nothing: the two tools do not deal in the same kind";
    return null;
  };

  const connect = (from: string, to: string) => {
    if (graph.flows.some((f) => f.from === from && f.to === to)) return;
    const refused = whyNot(from, to);
    if (refused) { setRefusal(refused); return; }
    const input = asInput();
    save({ ...input, flows: [...input.flows, { from, to }] });
  };

  const ask = (act: () => Promise<{ plan: RunRecord } | { status: string; message?: string }>) =>
    start(async () => {
      setRefusal(null);
      const result = (await afterWrite(act, [
        keys.runs.all(workspaceId ?? ""),
      ])) as { plan: RunRecord } | { status: string; message?: string };
      if ("plan" in result) setPlan(result.plan);
      else setRefusal(result.message ?? "That was refused.");
    });

  /* The plan carries `refused` and `skipped` BEFORE any process existed, so
     these counts are readable the moment the response lands. */
  const refused = plan?.invocations.filter((i) => i.state === "refused") ?? [];

  /* Refusals INSIDE steps that ran anyway — `decisions/0039`. A step can be
     `ok` while a rule kept it off part of what it was pointed at, and counting
     only whole refused steps under-reports exactly as chains get longer than
     one step. These are the majority once they do. */
  const keptOff =
    plan?.invocations.flatMap((i) =>
      i.state === "refused" ? [] : i.candidates.filter((c) => !c.permitted),
    ) ?? [];

  return (
    <Tabs defaultValue="editor" className={s.tabs}>
      <TabsList>
        <TabsTrigger value="editor">Editor</TabsTrigger>
        <TabsTrigger value="executions">
          Executions
          {runs.some((r) => r.state === "running") ? <span className={s.live} /> : null}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="editor">
        {/* The preview, and the reason this is overwatch's canvas rather than a
            copy of n8n's. `tools/add` promises nothing runs until a person has
            read the command it will run; this is the other half — which of those
            commands would be refused, asked without spawning anything.

            It is the SAME walk the run does, so there is no second
            implementation to drift. */}
        <div className={s.previewBar}>
          {targets.length > 0 ? (
            <Select value={targetId ?? undefined} onValueChange={setPicked}>
              <SelectTrigger className={s.target}>
                <SelectValue placeholder="pick a target" />
              </SelectTrigger>
              <SelectContent>
                {targets.map((t) => (
                  <SelectItem key={t.target_id} value={t.target_id}>
                    {t.name} · {t.kind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Button
            size="sm"
            disabled={pending || !workspaceId || !targetId}
            onClick={() =>
              workspaceId &&
              targetId &&
              ask(() => previewAction(workspaceId, check.check_id, targetId))
            }
          >
            {pending ? "Asking" : "What would run?"}
          </Button>
          <Text size="xs" tone="quiet">
            {!workspaceId
              ? "No engagement open, so there is no scope to ask against."
              : targets.length === 0
                ? `Nothing to look at yet in ${workspaceName}. Scope hangs off a target, so there is no gate to ask until there is one.`
                : target
                  ? `Against ${target.name}. Nothing spawns — the gate is asked and nothing else.`
                  : "Reading the targets…"}
          </Text>
        </div>

        {refusal ? (
          <Alert tone="warn"><Text size="sm">{refusal}</Text></Alert>
        ) : null}

        {plan && keptOff.length > 0 ? (
          <Alert tone="warn">
            <Text size="sm">
              <strong>
                {keptOff.length} {keptOff.length === 1 ? "thing" : "things"} would be
                left out of steps that run anyway.
              </strong>{" "}
              A step is one process over many candidates, so a rule can keep it
              off part of what it was aimed at without stopping it.
            </Text>
            <ul className={s.reasons}>
              {keptOff.map((c) => (
                <li key={c.candidate_id}>
                  <span className={s.mono}>{c.value}</span>
                  <Text size="xs" tone="tertiary">
                    {c.refusal}
                    {c.refusal_rule
                      ? ` — rule ${c.refusal_rule.slice(0, 8)}`
                      : " — nothing in scope permits it yet"}
                  </Text>
                </li>
              ))}
            </ul>
          </Alert>
        ) : null}

        {plan && refused.length > 0 ? (
          <Alert tone="warn">
            <Text size="sm">
              <strong>{refused.length} of these steps would not spawn at all.</strong>{" "}
              Nothing they were aimed at survived the gate. A refusal is an answer
              rather than a fault — it is the scope gate doing what it is for.
            </Text>
            <ul className={s.reasons}>
              {refused.map((i) => (
                <li key={i.invocation_id}>
                  {/* Unresolved while pending — `{{host}}` here is honest, not
                      a bug: nothing has run, so there is nothing to substitute. */}
                  <span className={s.mono}>{i.argv.join(" ")}</span>
                  <Text size="xs" tone="tertiary">
                    {i.refusal}
                    {/* Two different facts: a rule EXCLUDED this, or NOTHING
                        permitted it. The second is the common first-run case and
                        its fix is adding a rule, not reading one. */}
                    {i.refusal_rule
                      ? ` — rule ${i.refusal_rule}`
                      : " — nothing in scope permits it yet"}
                  </Text>
                </li>
              ))}
            </ul>
          </Alert>
        ) : null}

        {/* Adding a step is picking a program; the edge is drawn. Both send the
            whole graph, so there is no dirty state to lose and no Save button
            to forget. */}
        <div className={s.previewBar}>
          <Select value="" onValueChange={addStep} disabled={pending}>
            <SelectTrigger className={s.target}>
              <SelectValue placeholder="Add a step" />
            </SelectTrigger>
            <SelectContent>
              {tools
                .filter((t) => !t.archived)
                .map((t) => (
                  <SelectItem key={t.tool_id} value={t.tool_id}>
                    {t.name} · {t.consumes ? `${t.consumes} → ` : "scope → "}
                    {t.produces ?? "nothing"}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Text size="xs" tone="quiet">
            Drag from a node&rsquo;s right edge onto another to feed it. A tool
            that consumes nothing has no left edge — it is a source, and nothing
            can feed it.
          </Text>
        </div>

        <FlowGraph
          chain={graph}
          tools={tools}
          invocations={plan?.invocations}
          selected={selected}
          onSelect={setSelected}
          onPin={pin}
          onConnect={connect}
        />

        <StepDetail
          chain={graph}
          tools={tools}
          stepId={selected}
          invocation={plan?.invocations.find((i) => i.step_id === selected)}
        />
      </TabsContent>

      <TabsContent value="executions">
        {runs.length === 0 ? (
          <Alert tone="info">
            <Text size="sm">
              Nothing has run yet. Ask what would run first — the plan is readable
              without spawning anything, and it is the same walk.
            </Text>
            {workspaceId && targetId ? (
              <Button
                size="sm"
                disabled={pending}
                onClick={() => ask(() => startRunAction(workspaceId, check.check_id, targetId))}
              >
                {pending ? "Starting" : `Run it against ${target?.name ?? "the target"}`}
              </Button>
            ) : null}
          </Alert>
        ) : (
          <div className={s.runs}>
            {runs.map((r) => (
              <button
                key={r.run_id}
                type="button"
                className={s.run}
                data-state={r.state}
                data-open={r.run_id === opened?.run_id}
                onClick={() =>
                  workspaceId &&
                  start(async () => {
                    if (opened?.run_id === r.run_id) { setOpened(null); return; }
                    const result = await readRunAction(workspaceId, r.run_id);
                    if ("detail" in result) setOpened(result.detail);
                    else
                      setRefusal(
                        "message" in result ? result.message : "That run could not be read.",
                      );
                  })
                }
              >
                {/* The target's NAME where there is one. A run against a target
                    that has since been archived still resolves — the row is
                    hidden from the picker, not deleted — but one from another
                    engagement will not, and an id is the honest fallback. */}
                <span className={s.runTarget}>
                  {targets.find((t) => t.target_id === r.target_id)?.name ??
                    r.target_id.slice(0, 8)}
                </span>
                <span className={s.runWhen}>{r.started_at.slice(5, 16).replace("T", " ")}</span>
                {/* A run where every step was refused is COMPLETE, not failed.
                    It is a complete answer to "may we look at this", and drawing
                    it as an error makes the scope proof read as a fault. */}
                <span className={s.runState}>{r.state}</span>
                {/* ABSENT means a SCHEDULE started it — `0038`. Never "unknown"
                    and never a blank beside a label that says who: the
                    authorisation happened earlier, when somebody wrote the
                    interval and enabled the check. */}
                {r.started_by ? null : <Badge tone="neutral" mono>scheduled</Badge>}
              </button>
            ))}

            {opened ? (
              <div className={s.opened}>
                <RunDetail invocations={opened.invocations} />
              </div>
            ) : null}
          </div>
        )}

        <Panel title="What a step's state means">
          <dl className={s.legend}>
            {(Object.keys(STATE_MEANING) as (keyof typeof STATE_MEANING)[]).map((k) => (
              <div key={k} className={s.legendRow}>
                <dt><Badge tone="neutral" mono>{k}</Badge></dt>
                <dd><Text size="xs" tone="tertiary">{STATE_MEANING[k]}</Text></dd>
              </div>
            ))}
          </dl>
        </Panel>
      </TabsContent>
    </Tabs>
  );
}
