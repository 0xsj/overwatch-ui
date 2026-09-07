import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Panel } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { clientFor, usingFixtures } from "@/lib/root";
import { listRules, listTargets, type Rule, type Target } from "@/lib/services/targets";
import { loadShell } from "../../_shell";
import { PageHead } from "../../_components/page-head";
import s from "../surface.module.css";

const TITLE = "Scope";
const SUB =
  "Two gates, not one. Spawn says what a tool may touch and failing it is a refusal; claim says what the engagement covers and failing it is no scope proof. Exclude beats include on both.";

export const metadata: Metadata = { title: TITLE };

const GATE_MEANING = {
  spawn: "what a tool may touch. Failing it is a refusal, and the invocation records which rule",
  claim: "what the engagement covers. Failing it is no scope proof on a finding",
} as const;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ target?: string; all?: string }>;
}) {
  const { target, all } = await searchParams;
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

  const client = await clientFor("targets");
  const targets: Target[] = await listTargets(client, workspace.workspace_id).catch(() => []);
  const chosen = target ?? targets[0]?.target_id;

  /* Reading scope is a RECORD read, so `read` is enough and a CLOSED engagement
     still answers. `all` brings back superseded rules, which is the history an
     invocation's refusal cites — wanted here, and not in an editor. */
  const rules: Rule[] = chosen
    ? await listRules(client, workspace.workspace_id, chosen, { all: all === "1" }).catch(() => [])
    : [];

  const spawn = rules.filter((r) => r.gate === "spawn");
  const claim = rules.filter((r) => r.gate === "claim");

  return (
    <>
      <PageHead title={TITLE} mock={await usingFixtures("targets")}>{SUB}</PageHead>

      {targets.length === 0 ? (
        <Alert tone="info">
          <Text size="sm">
            No targets in {workspace.name}. Scope hangs off a target rather than
            off the engagement, so there is nothing to scope yet —{" "}
            <Link href="/home/targets">add one</Link>.
          </Text>
        </Alert>
      ) : (
        <div className={s.cells}>
          {targets.map((t) => (
            <Link key={t.target_id} href={`/surface/scope?target=${encodeURIComponent(t.target_id)}`}>
              <Badge tone={t.target_id === chosen ? "accent" : "neutral"} mono>
                {t.name}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      {(["spawn", "claim"] as const).map((gate) => {
        const list = gate === "spawn" ? spawn : claim;
        return (
          <Panel key={gate} title={`${gate} rules`} note={GATE_MEANING[gate]}>
            {list.length === 0 ? (
              <Text size="sm" tone="tertiary">
                {gate === "spawn"
                  ? "Nothing permits a spawn. Every invocation against this target will be refused — and the refusal will say nothing permits it rather than naming a rule, because there is none to name."
                  : "Nothing is claimed. A finding here would carry no scope proof."}
              </Text>
            ) : (
              <div className={s.scroll}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th scope="col">pattern</th>
                      <th scope="col">polarity</th>
                      <th scope="col">kinds</th>
                      <th scope="col">intensity</th>
                      <th scope="col">written</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((r) => (
                      <tr key={r.rule_id} data-open={Boolean(r.superseded_at)}>
                        <td className={s.value}>{r.pattern}</td>
                        <td>
                          {/* Exclude BEATS include, whatever order they were
                              written in. Said here rather than implied by
                              position in the table. */}
                          <Badge tone={r.polarity === "exclude" ? "warn" : "accent"} mono>
                            {r.polarity}
                          </Badge>
                        </td>
                        <td className={s.quiet}>{r.kinds.join(" · ")}</td>
                        <td className={s.quiet}>
                          {/* ABSENT on a claim rule — there are no processes on
                              that gate, so it is absent rather than empty or a
                              wildcard. A range in scope for passive collection
                              is not thereby in scope for a loud scan. */}
                          {r.tools ? r.tools.join(" · ") : "— no processes on this gate"}
                        </td>
                        <td className={s.quiet}>
                          {r.created_at}
                          {r.superseded_at ? (
                            <Badge tone="neutral" mono>superseded</Badge>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        );
      })}

      {chosen ? (
        <Alert tone="info">
          <Text size="sm">
            <strong>A rule is never edited.</strong> Deleting one supersedes it and
            keeps the row forever, because an invocation&rsquo;s refusal and a
            finding&rsquo;s scope proof both cite it by id — dropping the row would
            be the citation dangling.{" "}
            <Link href={`/surface/scope?target=${encodeURIComponent(chosen)}&all=${all === "1" ? "0" : "1"}`}>
              {all === "1" ? "hide superseded" : "show superseded"}
            </Link>
          </Text>
        </Alert>
      ) : null}
    </>
  );
}
