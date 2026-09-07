"use client";

import { useState } from "react";
import { Badge, Mock, Panel } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/navigation";
import { Text } from "@/components/typography";
import type { Check, Run, SpawnPreview, ToolDef } from "@/lib/services/pipeline";
import { pinStepAction } from "../_actions";
import { FlowGraph, STATE_MEANING } from "./flow-graph";
import { StepDetail } from "./step-detail";
import s from "./check-workspace.module.css";

/** Editor and Executions over one check.
 *
 *  The split is n8n's and it survives the translation because our nouns already
 *  match: a `check` is the definition — *"a named question with its own
 *  interval"* — and a `run` is *"a pipeline against a target"*. Editor is the
 *  question; Executions is what happened when it was asked.
 *
 *  What is deliberately NOT here is n8n's third tab. Evaluations is where you
 *  score an automation's output; `coverage` already answers our version of that
 *  question and answers it across every check at once, so a per-check tab would
 *  be the same number in a worse place. */
export function CheckWorkspace({
  check: initial,
  tools,
  runs,
  preview,
}: {
  check: Check;
  tools: ToolDef[];
  runs: Run[];
  preview: SpawnPreview[];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(runs[0]?.run_id ?? null);

  /* A pin is held here and written through, rather than read back from the
     server after each drag. Dragging is continuous and a round trip is not, so
     waiting for one would make the node snap back for a frame — and the local
     value is the one the person is looking at. */
  const [check, setCheck] = useState<Check>(initial);

  const pin = (stepId: string, at: { x: number; y: number }) => {
    setCheck((c) => ({
      ...c,
      steps: c.steps.map((s) => (s.step_id === stepId ? { ...s, pin: at } : s)),
    }));
    void pinStepAction(check.check_id, stepId, at);
  };

  const run = runs.find((r) => r.run_id === runId) ?? null;
  const refusals = new Map(
    preview.filter((p) => p.verdict === "refused").map((p) => [p.step_id, p.reason ?? "refused"]),
  );

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
        {/* Draggable HERE and not on Executions. A run happened with the steps
            where they were; moving them afterwards would be editing the record
            of it rather than the plan. */}
        {/* The refusal preview, and the reason this is overwatch's canvas rather
            than a copy of n8n's. n8n has no notion of scope, so it cannot tell
            you which of your steps will never spawn — and `tools/add` already
            promises nothing runs until a person has read the command. This is
            the other half: reading which of those commands would be refused. */}
        {refusals.size > 0 ? (
          <Alert tone="warn">
            <Text size="sm">
              <strong>{refusals.size} of these steps would not spawn</strong> against
              the engagement that is open. A refusal is an answer rather than a
              fault — it is the scope gate doing what it is for.
            </Text>
            <ul className={s.reasons}>
              {preview
                .filter((p) => p.verdict === "refused")
                .map((p) => (
                  <li key={p.step_id}>
                    <span className={s.mono}>{p.argv}</span>
                    <Text size="xs" tone="tertiary">{p.reason}</Text>
                  </li>
                ))}
            </ul>
          </Alert>
        ) : null}

        <FlowGraph
          check={check}
          tools={tools}
          selected={selected}
          onSelect={setSelected}
          refusals={refusals}
          onPin={pin}
        />

        <StepDetail check={check} tools={tools} stepId={selected} preview={preview} />
      </TabsContent>

      <TabsContent value="executions">
        <div className={s.split}>
          <aside className={s.runs}>
            <Text size="xs" tone="quiet" className={s.runsHead}>
              {runs.length === 0 ? "No runs" : `${runs.length} runs`}
            </Text>
            {runs.map((r) => (
              <button
                key={r.run_id}
                type="button"
                className={s.run}
                data-state={r.state}
                data-selected={r.run_id === runId || undefined}
                aria-pressed={r.run_id === runId}
                onClick={() => { setRunId(r.run_id); setSelected(null); }}
              >
                <span className={s.runTarget}>{r.target}</span>
                <span className={s.runWhen}>
                  {r.started_at.slice(5, 16).replace("T", " ")}
                </span>
                <span className={s.runState}>{r.state}</span>
              </button>
            ))}
          </aside>

          <div className={s.detail}>
            {run ? (
              <>
                <FlowGraph
                  check={check}
                  tools={tools}
                  invocations={run.invocations}
                  selected={selected}
                  onSelect={setSelected}
                />
                <StepDetail
                  check={check}
                  tools={tools}
                  stepId={selected}
                  invocation={run.invocations.find((i) => i.step_id === selected)}
                />
              </>
            ) : (
              <Text size="sm" tone="tertiary">
                Nothing has run yet. Set up the chain, then ask the question.
              </Text>
            )}
          </div>
        </div>

        {/* A legend, because three of the six states end with no artifact and
            they are not the same event. Colour is never the only signal — every
            node prints its state as a word too. */}
        <Panel title="What a step's state means" actions={<Mock />}>
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
