import { Badge, Panel } from "@/components/display";
import { Text } from "@/components/typography";
import type { Chain } from "@/lib/services/checks";
import type { Tool } from "@/lib/services/tooling";
import type { Invocation } from "@/lib/services/runs";
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
  chain,
  tools,
  stepId,
  invocation,
}: {
  chain: Chain;
  tools: Tool[];
  stepId: string | null;
  invocation?: Invocation;
}) {
  if (!stepId) return null;
  const step = chain.steps.find((x) => x.step_id === stepId);
  const tool = step && tools.find((t) => t.tool_id === step.tool_id);
  if (!tool) return null;


  return (
    <Panel
      title={tool.name}
      note={tool.consumes ? `${tool.consumes} → ${tool.produces ?? "nothing"}` : `scope → ${tool.produces ?? "nothing"}`}
      className={s.panel}
    >
      <dl className={s.facts}>
        <div className={s.fact}>
          <dt>Command</dt>
          <dd className={s.mono}>{invocation ? invocation.argv.join(" ") : tool.argv}</dd>
        </div>

        <div className={s.fact}>
          <dt>Intensity</dt>
          <dd>
            <Badge tone={tool.intensity === "loud" ? "warn" : "neutral"} mono>
              {tool.intensity}
            </Badge>
            <Text size="xs" tone="tertiary">
              {tool.intensity === "loud"
                ? "sends payloads, so the run gate is raised to admin on this engagement"
                : tool.intensity === "light"
                  ? "ordinary requests at recon volume — not distinguishable from a crawler"
                  : "touches the providers, never the target"}
            </Text>
          </dd>
        </div>


        {invocation ? (
          <>
            <div className={s.fact}>
              <dt>Outcome</dt>
              <dd>
                <Badge tone="neutral" mono>{invocation.state}</Badge>
                {invocation.refusal ? (
                  <Text size="xs" tone="tertiary">
                    {invocation.refusal}
                    {/* Which rule EXCLUDED it, versus nothing having PERMITTED
                        it. Different facts, and the second is the common
                        first-run case whose fix is adding a rule. */}
                    {invocation.refusal_rule
                      ? ` — rule ${invocation.refusal_rule}`
                      : " — nothing in scope permits it yet"}
                  </Text>
                ) : null}
                {invocation.unavailable ? (
                  <Text size="xs" tone="tertiary">
                    {invocation.unavailable} — a tool off PATH looks like silence
                  </Text>
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
              <dt>Artifacts</dt>
              <dd>
                {/* `stdout` and `stderr` are separate rows: a tool that fills
                    stderr with warnings has not lost its findings. `bytes: 0`
                    means it ran and wrote an EMPTY artifact; nothing written is
                    the whole object being absent. */}
                {invocation.artifacts.length === 0 ? (
                  <span className={s.never}>nothing written</span>
                ) : (
                  <span className={s.mono}>
                    {invocation.artifacts
                      .map((a) => `${a.stream} ${a.bytes} bytes${a.truncated ? " (truncated)" : ""}`)
                      .join(" · ")}
                  </span>
                )}
              </dd>
            </div>

            <div className={s.fact}>
              <dt>Observations</dt>
              <dd>
                {/* Not in the response AT ALL yet — nothing parses output, so
                    this renders as a dash and never as `0`. §Scope: a zero
                    nothing computed is not a zero. */}
                <span className={s.never}>– nothing parses output yet</span>
              </dd>
            </div>
          </>
        ) : null}
      </dl>
    </Panel>
  );
}
