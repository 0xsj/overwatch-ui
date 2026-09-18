import { Badge } from "@/components/display";
import { Text } from "@/components/typography";
import type { Invocation } from "@/lib/services/runs";
import s from "./run-detail.module.css";

/** One run's invocations, and what each was aimed at.
 *
 *  Shared by the check's Executions tab and the engagement-wide run list on
 *  purpose. A second rendering of candidates would drift, and the thing it
 *  would drift on is the half that matters: whether refused ones are shown.
 *
 *  **A step can be `ok` and a rule can still have kept it off part of what it
 *  was pointed at** — `decisions/0039` — so this never filters to the permitted
 *  ones, and the count reads `3 of 5` rather than the step's own state. */
export function RunDetail({ invocations }: { invocations: Invocation[] }) {
  return (
    <div className={s.steps}>
      {invocations.map((i) => {
        const refused = i.candidates.filter((c) => !c.permitted);
        return (
          <div key={i.invocation_id} className={s.step} data-state={i.state}>
            <span className={s.head}>
              <Badge tone="neutral" mono>{i.state}</Badge>
              {/* Unresolved while pending — the template, not a failure to
                  substitute. Nothing has run, so there is nothing to put in. */}
              <code className={s.argv}>{i.argv.join(" ")}</code>
              {i.exit === undefined ? null : <Badge mono>exit {i.exit}</Badge>}
            </span>

            {i.unavailable ? (
              <Text size="xs" tone="tertiary">
                {i.unavailable} — a tool off PATH looks like silence, which is
                why it is said out loud rather than left as a missing result.
              </Text>
            ) : null}

            {refused.length > 0 ? (
              <ul className={s.refused}>
                {refused.map((c) => (
                  <li key={c.candidate_id}>
                    <span className={s.argv}>{c.value}</span>
                    <Text size="xs" tone="tertiary">
                      {c.refusal}
                      {/* A rule EXCLUDED it, versus nothing having PERMITTED
                          it. The second is the default and the commonest, and
                          its fix is adding a rule rather than reading one. */}
                      {c.refusal_rule
                        ? ` — rule ${c.refusal_rule.slice(0, 8)}`
                        : " — nothing in scope permits it yet"}
                    </Text>
                  </li>
                ))}
              </ul>
            ) : null}

            <Text size="xs" tone="quiet">
              {i.candidates.length === 0
                ? "nothing resolved — this step was aimed at nothing"
                : `${i.candidates.length - refused.length} of ${i.candidates.length} permitted`}
              {i.artifacts.length > 0
                ? ` · ${i.artifacts.map((a) => `${a.stream} ${a.bytes} bytes`).join(" · ")}`
                : " · nothing written"}
            </Text>
          </div>
        );
      })}
    </div>
  );
}
