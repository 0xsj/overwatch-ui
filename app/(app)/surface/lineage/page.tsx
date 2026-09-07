import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Panel, Presence } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { absent } from "@/lib/kernel";
import { clientFor, usingFixtures } from "@/lib/root";
import {
  listObservations, listSubjects, readLineage,
  type Lineage, type Observation, type Subject,
} from "@/lib/services/observed";
import { loadShell } from "../../_shell";
import { PageHead } from "../../_components/page-head";
import s from "../surface.module.css";

const TITLE = "Lineage";
const SUB =
  "One value, walked back to the bytes it was read out of: the parser version, the raw artifact, the exact command, and the scope rule that allowed the command to run. Four steps, and each is independently absent.";

export const metadata: Metadata = { title: TITLE };

/** The four steps, and what an ABSENCE at each one means.
 *
 *  This is the part a screen gets wrong by treating a missing step as an error.
 *  An invocation nothing refused has no rule to cite — which is the commonest
 *  shape there is, not a broken record. */
const STEPS = [
  { key: "mapping", label: "read by", absent: "no mapping — the value was written directly" },
  { key: "artifact", label: "out of", absent: "no artifact — nothing was kept" },
  { key: "invocation", label: "produced by", absent: "no invocation — nothing spawned" },
  { key: "rule", label: "permitted by", absent: "no rule cited — nothing refused it, and nothing had to" },
] as const;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; observation?: string }>;
}) {
  const { subject, observation } = await searchParams;
  const shell = await loadShell();
  const workspace = shell.context?.workspace;

  if (!workspace) {
    return (
      <>
        <PageHead title={TITLE}>{SUB}</PageHead>
        <Alert tone="info"><Text size="sm">No engagement open.</Text></Alert>
      </>
    );
  }

  const client = await clientFor("observed");
  const subjects: Subject[] = await listSubjects(client, workspace.workspace_id).catch(() => []);
  const chosen = subject ?? subjects[0]?.subject_value;

  /* An observation is ABOUT something — a read with no filter is a 400, and
     deliberately: there is no "every observation in the engagement" question. */
  const observations: Observation[] = chosen
    ? await listObservations(client, workspace.workspace_id, { subject: chosen }).catch(() => [])
    : [];

  const walked = observation ?? observations[0]?.observation_id;
  const lineage: Lineage | null = walked
    ? await readLineage(client, workspace.workspace_id, walked).catch(() => null)
    : null;

  return (
    <>
      <PageHead title={TITLE} mock={await usingFixtures("observed")}>{SUB}</PageHead>

      <Panel
        title="Subjects"
        note="What observations are ABOUT. Deliberately not the asset list — an asset is a fragment in a role carrying an accepted attribution, and these are just the things something was said about."
      >
        {subjects.length === 0 ? (
          <Text size="sm" tone="tertiary">Nothing observed yet.</Text>
        ) : (
          <div className={s.cells}>
            {subjects.map((sub) => (
              <Link
                key={`${sub.subject_kind}:${sub.subject_value}`}
                href={`/surface/lineage?subject=${encodeURIComponent(sub.subject_value)}`}
              >
                <Badge tone={sub.subject_value === chosen ? "accent" : "neutral"} mono>
                  {sub.subject_value} · {sub.observations}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </Panel>

      {chosen ? (
        <Panel
          title={`What was said about ${chosen}`}
          note="Not deduplicated. Two runs a day apart are two statements, and collapsing them would lose the second date — the state of each field is the first row per field, which the ordering already hands over."
        >
          <div className={s.scroll}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th scope="col">field</th>
                  <th scope="col">value</th>
                  <th scope="col">mapping</th>
                  <th scope="col">observed</th>
                  <th scope="col">recorded</th>
                </tr>
              </thead>
              <tbody>
                {observations.map((o) => (
                  <tr
                    key={o.observation_id}
                    className={s.row}
                    data-open={o.observation_id === walked}
                  >
                    <td>
                      <Link
                        href={`/surface/lineage?subject=${encodeURIComponent(chosen)}&observation=${encodeURIComponent(o.observation_id)}`}
                      >
                        {o.field}
                      </Link>
                    </td>
                    <td className={s.value}>{o.value}</td>
                    <td className={s.quiet}>v{o.mapping_version}</td>
                    {/* BOTH times, always. A re-extraction moves the second and
                        never the first, and one column cannot say that. */}
                    <td className={s.quiet}>{o.observed_at}</td>
                    <td className={s.quiet}>{o.recorded_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      {lineage ? (
        <Panel
          title={`${lineage.observation.field} = ${lineage.observation.value}`}
          note="Walked backwards. Every step below is something that actually happened, and a step that is missing says so rather than breaking the chain."
        >
          <div className={s.steps}>
            {STEPS.map((step) => {
              const value = lineage[step.key];
              return (
                <div key={step.key} className={s.step} data-absent={value === undefined}>
                  <span className={s.quiet}>{step.label}</span>
                  {value === undefined ? (
                    <span className={s.stepValue}>
                      <Presence of={absent()} />
                      <Text size="xs" tone="tertiary">{step.absent}</Text>
                    </span>
                  ) : step.key === "mapping" && lineage.mapping ? (
                    <span className={s.stepValue}>
                      <span className={s.mono}>{lineage.mapping.expression}</span>{" "}
                      <Badge mono>v{lineage.mapping.version}</Badge>{" "}
                      <Badge tone={lineage.mapping.state === "live" ? "accent" : "neutral"} mono>
                        {lineage.mapping.state}
                      </Badge>
                    </span>
                  ) : step.key === "artifact" && lineage.artifact ? (
                    <span className={s.stepValue}>
                      <span className={s.mono}>{lineage.artifact.hash}</span>{" "}
                      <Badge mono>
                        {lineage.artifact.stream} · {lineage.artifact.bytes} bytes
                      </Badge>
                      {lineage.artifact.truncated ? <Badge tone="warn">truncated</Badge> : null}
                    </span>
                  ) : step.key === "invocation" && lineage.invocation ? (
                    <span className={s.stepValue}>
                      <span className={s.mono}>{lineage.invocation.argv.join(" ")}</span>{" "}
                      <Badge mono>{lineage.invocation.state}</Badge>
                      {/* Absent means NO PROCESS EVER EXISTED. `0` means it ran
                          and succeeded, and a blank would read as data loss. */}
                      {lineage.invocation.exit === undefined ? (
                        <Text size="xs" tone="tertiary">no process ever started</Text>
                      ) : (
                        <Badge mono>exit {lineage.invocation.exit}</Badge>
                      )}
                    </span>
                  ) : step.key === "rule" && lineage.rule ? (
                    <span className={s.stepValue}>
                      <span className={s.mono}>{lineage.rule.pattern}</span>{" "}
                      <Badge mono>{lineage.rule.polarity} · {lineage.rule.gate}</Badge>
                      {/* Superseded and still returned. `0030` keeps a rule
                          forever precisely so a citation made at the time still
                          resolves — this badge is that record working. */}
                      {lineage.rule.superseded ? (
                        <Badge tone="neutral" mono>superseded — kept so this citation resolves</Badge>
                      ) : null}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Panel>
      ) : null}
    </>
  );
}
