"use client";

import { useState, useTransition } from "react";
import { Badge, Panel } from "@/components/display";
import {
  Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/forms";
import { Alert } from "@/components/feedback";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/navigation";
import { Text } from "@/components/typography";
import type { Chain, Check } from "@/lib/services/checks";
import type { Tool } from "@/lib/services/tooling";
import type { Run, RunDetail } from "@/lib/services/runs";
import type { Target } from "@/lib/services/targets";
import { pinStepAction, previewAction, startRunAction } from "../_actions";
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
  const [plan, setPlan] = useState<RunDetail | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [steps, setSteps] = useState(chain.steps);
  /* Which target, and it is a real one.
   *
   *  This screen sent the WORKSPACE id where a target id belonged until
   *  2026-09-07 — a placeholder from before the client had a targets service,
   *  and one nothing could type-check because both are strings. It would have
   *  404'd against the live server on the first press. A target is an
   *  organisation or a person, never a hostname; a check is a question asked
   *  ABOUT one, so nothing here can run until one is chosen. */
  const [targetId, setTargetId] = useState<string | null>(targets[0]?.target_id ?? null);
  const targetName = targets.find((t) => t.target_id === targetId)?.name ?? null;

  const pin = (stepId: string, at: { x: number; y: number }) => {
    setSteps((all) =>
      all.map((st) => (st.step_id === stepId ? { ...st, x: at.x, y: at.y, pinned: true } : st)),
    );
    void pinStepAction(orgId, check.check_id, stepId, at);
  };

  const ask = (act: () => Promise<{ plan: RunDetail } | { status: string; message?: string }>) =>
    start(async () => {
      setRefusal(null);
      const result = await act();
      if ("plan" in result) setPlan(result.plan);
      else setRefusal(result.message ?? "That was refused.");
    });

  /* The plan carries `refused` and `skipped` BEFORE any process existed, so
     these counts are readable the moment the response lands. */
  const refused = plan?.invocations.filter((i) => i.state === "refused") ?? [];

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
            <Select value={targetId ?? undefined} onValueChange={setTargetId}>
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
                : `Against ${targetName}. Nothing spawns — the gate is asked and nothing else.`}
          </Text>
        </div>

        {refusal ? (
          <Alert tone="warn"><Text size="sm">{refusal}</Text></Alert>
        ) : null}

        {plan && refused.length > 0 ? (
          <Alert tone="warn">
            <Text size="sm">
              <strong>{refused.length} of these steps would not spawn.</strong> A
              refusal is an answer rather than a fault — it is the scope gate doing
              what it is for.
            </Text>
            <ul className={s.reasons}>
              {refused.map((i) => (
                <li key={i.invocation_id}>
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

        <FlowGraph
          chain={{ ...chain, steps }}
          tools={tools}
          invocations={plan?.invocations}
          selected={selected}
          onSelect={setSelected}
          onPin={pin}
        />

        <StepDetail chain={{ ...chain, steps }} tools={tools} stepId={selected} />
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
                {pending ? "Starting" : `Run it against ${targetName}`}
              </Button>
            ) : null}
          </Alert>
        ) : (
          <div className={s.runs}>
            {runs.map((r) => (
              <div key={r.run_id} className={s.run} data-state={r.state}>
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
                {r.started_by ? null : <Badge tone="neutral" mono>scheduled</Badge>}
              </div>
            ))}
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
