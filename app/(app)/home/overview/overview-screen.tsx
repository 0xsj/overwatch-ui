"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Panel, Stat } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import { PageHead } from "../../_components/page-head";
import { useContext } from "../../_hooks";
import {
  chainQuery, checksQuery, coverageQuery, runsQuery, targetsQuery,
} from "../../_queries";
import s from "../../surface/surface.module.css";

const TITLE = "Overview";
const SUB =
  "What do I know, how do I know it, and what have I not looked at. The third is the one nothing else answers, so it is the one this page leads with.";

export function OverviewScreen() {
  const { org, workspace, shell } = useContext();

  const coverageQ = useQuery({
    queryKey: keys.coverage(workspace ?? ""),
    queryFn: () => coverageQuery(workspace!),
    enabled: Boolean(workspace),
  });
  const runsQ = useQuery({
    queryKey: keys.runs.list(workspace ?? ""),
    queryFn: () => runsQuery(workspace!),
    enabled: Boolean(workspace),
  });
  const checksQ = useQuery({
    queryKey: keys.checks.list(org ?? ""),
    queryFn: () => checksQuery(org!),
    enabled: Boolean(org),
  });
  const targetsQ = useQuery({
    queryKey: keys.targets.list(workspace ?? "", false),
    queryFn: () => targetsQuery(workspace!, false),
    enabled: Boolean(workspace),
  });

  const checks = checksQ.data ?? [];

  /* A check that is enabled, on a clock, and wired to nothing looks scheduled
     and never runs — the scheduler skips it silently and there is no error
     anywhere. One chain read per candidate, and only for the candidates: this
     is the page somebody opens when they wonder why nothing is happening. */
  const chains = useQueries({
    queries: checks
      .filter((c) => !c.human && c.enabled)
      .map((c) => ({
        queryKey: keys.checks.chain(org ?? "", c.check_id),
        queryFn: () => chainQuery(org!, c.check_id),
        enabled: Boolean(org),
      })),
  });
  const candidates = checks.filter((c) => !c.human && c.enabled);
  const chainless = candidates.filter((_, n) => chains[n]?.data?.steps.length === 0);

  if (!workspace || !org) {
    return (
      <>
        <PageHead title={TITLE}>{SUB}</PageHead>
        <Alert tone="info">
          <Text size="sm">
            No engagement open. Everything below is measured over one.
          </Text>
        </Alert>
      </>
    );
  }

  const coverage = coverageQ.data ?? null;
  const runs = runsQ.data?.runs ?? [];
  const targets = targetsQ.data ?? [];
  const ratio =
    coverage && coverage.pairs > 0
      ? `${Math.round((coverage.fresh / coverage.pairs) * 100)}%`
      : "–";

  return (
    <>
      <PageHead title={shell?.context?.workspace.name ?? "Overview"}>{SUB}</PageHead>

      <div className={s.legend}>
        {/* NEVER and STALE are two numbers and are never summed. Nobody asked,
            versus the answer is old — different failures with different fixes. */}
        <Stat
          label="Never asked"
          value={coverage?.never ?? "–"}
          note="questions nobody has put to an asset yet"
          tone="warn"
        />
        <Stat label="Stale" value={coverage?.stale ?? "–"} note="asked, and the answer is older than the interval" />
        <Stat label="Current" value={ratio} note={coverage && coverage.pairs > 0 ? "fresh over applicable questions" : "nothing to divide — not zero"} />
        <Stat label="Assets" value={coverage?.assets ?? "–"} note="fragments carrying an accepted attribution" />
        <Stat label="Targets" value={targets.length} note="what everything else hangs off" />
      </div>

      {coverageQ.isError ? (
        <Alert tone="warn">
          <Text size="sm">
            Coverage could not be read. That is not the same as nothing having
            been checked, and this page will not render a ratio it did not
            receive.
          </Text>
        </Alert>
      ) : null}

      {chainless.length > 0 ? (
        <Alert tone="warn">
          <Text size="sm">
            <strong>
              {chainless.length} {chainless.length === 1 ? "check is" : "checks are"} enabled
              and wired to nothing.
            </strong>{" "}
            {chainless.map((c) => c.name).join(", ")} — the scheduler skips a
            chainless check silently every tick, so it looks scheduled and never
            runs. There is no error anywhere else to tell you.{" "}
            <Link href="/tools/checks">Wire one</Link>.
          </Text>
        </Alert>
      ) : null}

      {targets.length === 0 ? (
        <Alert tone="info">
          <Text size="sm">
            Nothing to look at yet. Scope hangs off a target, so nothing can run
            and nothing can be attributed until there is one —{" "}
            <Link href="/home/targets">add one</Link>.
          </Text>
        </Alert>
      ) : null}

      <Panel
        title="Lately"
        note="Newest first. A run nobody triggered is a schedule doing what somebody authorised when they enabled the check."
      >
        {runs.length === 0 ? (
          <Text size="sm" tone="tertiary">
            Nothing has run. Not the same as nothing having been asked.
          </Text>
        ) : (
          <div className={s.scroll}>
            <table className={s.table}>
              <tbody>
                {runs.slice(0, 8).map((r) => (
                  <tr key={r.run_id}>
                    <td>
                      <Link href={`/observability/runs?run=${encodeURIComponent(r.run_id)}`}>
                        {checks.find((c) => c.check_id === r.check_id)?.name ?? "a check"}
                      </Link>
                    </td>
                    <td className={s.value}>
                      {targets.find((t) => t.target_id === r.target_id)?.name ??
                        r.target_id.slice(0, 8)}
                    </td>
                    <td className={s.quiet}>{r.started_at}</td>
                    <td className={s.quiet}>{r.started_by ? "" : "scheduled"}</td>
                    <td className={s.quiet}>{r.state}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Alert tone="info">
        <Text size="sm">
          Everything here came from a tool you could run yourself. What is
          different is that the answers were kept, dated, and attached to
          something that says why they are yours —{" "}
          <Link href="/surface/coverage">the grid</Link> is where the third
          question gets its answer.
        </Text>
      </Alert>
    </>
  );
}
