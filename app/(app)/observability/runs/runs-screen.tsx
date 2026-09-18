"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Badge, Panel, Stat } from "@/components/display";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import { PageHead } from "../../_components/page-head";
import { RunDetail as RunDetailView } from "../../_components/run-detail";
import { NoWorkspace, Query, useContext } from "../../_hooks";
import { checksQuery, runQuery, runsQuery, targetsQuery } from "../../_queries";
import s from "../../surface/surface.module.css";

const TITLE = "Runs";
const SUB =
  "A run is a pipeline against a target; an invocation is one process inside it. Both are kept, including the ones that failed and the ones that were refused — a run where every step was refused is complete, not failed.";

export function RunsScreen() {
  const { org, workspace } = useContext();
  const run = useSearchParams().get("run");

  const runs = useQuery({
    queryKey: keys.runs.list(workspace ?? ""),
    queryFn: () => runsQuery(workspace!),
    enabled: Boolean(workspace),
  });
  const checks = useQuery({
    queryKey: keys.checks.list(org ?? ""),
    queryFn: () => checksQuery(org!),
    enabled: Boolean(org),
  });
  const targets = useQuery({
    queryKey: keys.targets.list(workspace ?? "", true),
    queryFn: () => targetsQuery(workspace!, true),
    enabled: Boolean(workspace),
  });
  const opened = useQuery({
    queryKey: keys.runs.one(workspace ?? "", run ?? ""),
    queryFn: () => runQuery(workspace!, run!),
    enabled: Boolean(workspace && run),
    /* THE REASON THIS LIBRARY IS HERE. A run answers 202 with a plan and
       nothing has spawned; without a poll it reads `running` until somebody
       reloads. The interval stops the moment it is not running, so a finished
       run is not asked about again. */
    refetchInterval: (q) =>
      q.state.data && q.state.data.state === "running" ? 2000 : false,
  });

  if (!workspace) {
    return (
      <>
        <PageHead title={TITLE}>{SUB}</PageHead>
        <NoWorkspace what="A run" />
      </>
    );
  }

  const nameOfCheck = (id: string) =>
    checks.data?.find((c) => c.check_id === id)?.name ?? id.slice(0, 8);
  const nameOfTarget = (id: string) =>
    targets.data?.find((t) => t.target_id === id)?.name ?? id.slice(0, 8);

  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>

      <Query of={runs} label="the run list">
        {(page) => {
          /* SCHEDULED versus started by a person — two numbers rather than one
             total, because "nobody triggered these" is the interesting half
             once the fifth lifecycle is running. */
          const scheduled = page.runs.filter((r) => !r.started_by).length;
          return (
            <>
              <div className={s.legend}>
                <Stat label="Runs" value={page.runs.length} note="this page — there is no total on the wire" />
                <Stat label="Scheduled" value={scheduled} note="started by a check's own clock, with no person to name" />
                <Stat
                  label="Started by somebody"
                  value={page.runs.length - scheduled}
                  note="a person asked, and the gate asked whether they may"
                />
              </div>

              <Panel
                title="Everything that has run here"
                note="Newest first. A run that was wholly refused is a complete answer to “may we look at this”, so it is not drawn as an error."
              >
                {page.runs.length === 0 ? (
                  <Text size="sm" tone="tertiary">
                    Nothing has run. That is not the same as nothing having been
                    asked — a check with no chain is skipped silently every tick,
                    and the checks list is where that shows.
                  </Text>
                ) : (
                  <div className={s.scroll}>
                    <table className={s.table}>
                      <thead>
                        <tr>
                          <th scope="col">check</th>
                          <th scope="col">target</th>
                          <th scope="col">started</th>
                          <th scope="col">by</th>
                          <th scope="col">state</th>
                        </tr>
                      </thead>
                      <tbody>
                        {page.runs.map((r) => (
                          <tr key={r.run_id} className={s.row} data-open={r.run_id === run}>
                            <td>
                              <Link href={`/observability/runs?run=${encodeURIComponent(r.run_id)}`}>
                                {nameOfCheck(r.check_id)}
                              </Link>
                            </td>
                            <td className={s.value}>{nameOfTarget(r.target_id)}</td>
                            <td className={s.quiet}>{r.started_at}</td>
                            <td>
                              {/* A schedule is not a who. Never "unknown", and
                                  never a blank beside a label that says who. */}
                              {r.started_by ? (
                                <span className={s.quiet}>{r.started_by.slice(0, 8)}</span>
                              ) : (
                                <Badge tone="neutral" mono>scheduled</Badge>
                              )}
                            </td>
                            <td><Badge tone="neutral" mono>{r.state}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {page.next ? (
                  <Text size="xs" tone="quiet">
                    There is another page. <code>next</code> is present only when
                    there is one, so its absence is the end rather than an unknown.
                  </Text>
                ) : null}
              </Panel>
            </>
          );
        }}
      </Query>

      {run ? (
        <Query of={opened} label="that run">
          {(detail) => (
            <Panel
              title={`${nameOfCheck(detail.check_id)} against ${nameOfTarget(detail.target_id)}`}
              note="What each step was aimed at, and what a rule kept it off. A step can be ok and still have been refused part of what it was pointed at."
            >
              {detail.state === "running" ? (
                <Text size="xs" tone="quiet">
                  Still running — this is refetching every two seconds and stops
                  on its own when the run finishes.
                </Text>
              ) : null}
              <RunDetailView invocations={detail.invocations} />
            </Panel>
          )}
        </Query>
      ) : null}
    </>
  );
}
