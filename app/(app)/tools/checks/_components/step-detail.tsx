import { Badge, Panel } from "@/components/display";
import { Text } from "@/components/typography";
import type { Check, Invocation, SpawnPreview, ToolDef } from "@/lib/services/pipeline";
import s from "./step-detail.module.css";

/** One step, and the fields it carries depend on what actually happened to it.
 *
 *  The whole discipline here is ABSENT versus ZERO. An exit code of `0` and no
 *  exit code at all are different facts — one process ran and succeeded, the
 *  other never existed. `bytes: 0` is an empty artifact; absent means nothing
 *  was written. `observations: 0` means the mapping ran and matched nothing.
 *  Rendering any of those as a dash-or-zero collapse loses the distinction the
 *  product is built on. */
export function StepDetail({
  check,
  tools,
  stepId,
  invocation,
  preview,
}: {
  check: Check;
  tools: ToolDef[];
  stepId: string | null;
  invocation?: Invocation;
  preview?: SpawnPreview[];
}) {
  if (!stepId) return null;
  const step = check.steps.find((x) => x.step_id === stepId);
  const tool = step && tools.find((t) => t.tool_id === step.tool_id);
  if (!tool) return null;

  const verdict = preview?.find((p) => p.step_id === stepId);

  return (
    <Panel
      title={tool.name}
      note={tool.consumes ? `${tool.consumes} → ${tool.produces}` : `scope → ${tool.produces}`}
      className={s.panel}
    >
      <dl className={s.facts}>
        <div className={s.fact}>
          <dt>Command</dt>
          <dd className={s.mono}>{invocation?.argv ?? tool.argv}</dd>
        </div>

        {tool.loud ? (
          <div className={s.fact}>
            <dt>Volume</dt>
            <dd>
              <Badge tone="warn" mono>loud</Badge>
              <Text size="xs" tone="tertiary">
                sends payloads, so it needs admin on this engagement
              </Text>
            </dd>
          </div>
        ) : null}

        {verdict ? (
          <div className={s.fact}>
            <dt>Spawn gate</dt>
            <dd>
              <Badge tone={verdict.verdict === "refused" ? "warn" : "accent"} mono>
                {verdict.verdict}
              </Badge>
              {verdict.reason ? (
                <Text size="xs" tone="tertiary">{verdict.reason}</Text>
              ) : null}
            </dd>
          </div>
        ) : null}

        {invocation ? (
          <>
            <div className={s.fact}>
              <dt>Outcome</dt>
              <dd>
                <Badge tone="neutral" mono>{invocation.state}</Badge>
                {invocation.refusal ? (
                  <Text size="xs" tone="tertiary">{invocation.refusal}</Text>
                ) : null}
                {invocation.skipped_because ? (
                  <Text size="xs" tone="tertiary">{invocation.skipped_because}</Text>
                ) : null}
              </dd>
            </div>

            <div className={s.fact}>
              <dt>Exit</dt>
              <dd>
                {invocation.exit === undefined ? (
                  <span className={s.never}>no process ever started</span>
                ) : (
                  <span className={s.mono}>{invocation.exit}</span>
                )}
              </dd>
            </div>

            <div className={s.fact}>
              <dt>Artifact</dt>
              <dd>
                {invocation.bytes === undefined ? (
                  <span className={s.never}>nothing written</span>
                ) : (
                  <span className={s.mono}>
                    {invocation.bytes} bytes · {invocation.artifact_id}
                  </span>
                )}
              </dd>
            </div>

            <div className={s.fact}>
              <dt>Observations</dt>
              <dd>
                {invocation.observations === undefined ? (
                  // Never measured renders as a dash and never as `0` — §Scope:
                  // a zero nothing computed is not a zero.
                  <span className={s.never}>– nothing was read</span>
                ) : invocation.observations === 0 ? (
                  <span className={s.mono}>0 — the mapping ran and matched nothing</span>
                ) : (
                  <span className={s.mono}>{invocation.observations}</span>
                )}
              </dd>
            </div>
          </>
        ) : null}
      </dl>
    </Panel>
  );
}
