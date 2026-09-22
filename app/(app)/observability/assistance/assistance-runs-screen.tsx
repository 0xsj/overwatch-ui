"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge, Panel, Stat } from "@/components/display";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import type { AssistanceProviderRun } from "@/lib/services/assistance";
import { assistanceProviderRunsQuery } from "../../_queries";
import { PageHead } from "../../_components/page-head";
import { NoWorkspace, Query, useContext } from "../../_hooks";
import s from "../../surface/surface.module.css";

const TITLE = "Assistance";
const SUB = "Operational history for bounded AI assistance. It shows what ran, what was refused, and what the provider path cost in time and payload size without retaining evidence here.";

export function AssistanceRunsScreen() {
  const { workspace } = useContext();
  const runs = useQuery({
    queryKey: keys.assistance.runs(workspace ?? ""),
    queryFn: () => assistanceProviderRunsQuery(workspace!),
    enabled: Boolean(workspace),
    retry: false,
  });

  if (!workspace) return <><PageHead title={TITLE}>{SUB}</PageHead><NoWorkspace what="Assistance operations" /></>;

  return <>
    <PageHead title={TITLE}>{SUB}</PageHead>
    <Query of={runs} label="assistance operations">{(page) => <ProviderRunView runs={page.items} />}</Query>
  </>;
}

function ProviderRunView({ runs }: { runs: AssistanceProviderRun[] }) {
  const failures = runs.filter((run) => run.status !== "completed" && run.status !== "empty").length;
  const external = runs.filter((run) => run.provider !== "local").length;
  const measured = runs.filter((run) => run.duration_ms > 0);
  const average = measured.length ? Math.round(measured.reduce((sum, run) => sum + run.duration_ms, 0) / measured.length) : 0;
  return <>
    <div className={s.legend}>
      <Stat label="Attempts" value={runs.length} note="most recent 100 provider runs" />
      <Stat label="Needs attention" value={failures} note="failed, unsupported, partial, or timed out" tone={failures ? "warn" : "accent"} />
      <Stat label="External" value={external} note="runs sent through a configured non-local provider" tone={external ? "warn" : "neutral"} />
      <Stat label="Average" value={measured.length ? `${average}ms` : "–"} note="measured runs on this page" />
    </div>
    <Panel title="Provider run ledger" note="This is an operational view, not an evidence view. Open the related proposal history to inspect its exact citations; a failure here never creates evidence by itself.">
      {runs.length ? <div className={s.scroll}><table className={s.table}><thead><tr><th scope="col">when</th><th scope="col">operation</th><th scope="col">provider</th><th scope="col">status</th><th scope="col">input</th><th scope="col">output</th><th scope="col">time</th><th scope="col">error</th></tr></thead><tbody>{runs.map((run) => <ProviderRunRow key={run.provider_run_id} run={run} />)}</tbody></table></div> : <div className={s.empty}><Text size="sm">No assistance runs have been recorded.</Text><Text size="sm" tone="tertiary">Runs appear here after a synthesis, comparison, question suggestion, brief draft, connection review, or source extraction attempt.</Text></div>}
    </Panel>
  </>;
}

function ProviderRunRow({ run }: { run: AssistanceProviderRun }) {
  const attention = run.status !== "completed" && run.status !== "empty";
  return <tr className={s.row}>
    <td className={s.quiet}>{new Date(run.created_at).toLocaleString()}</td>
    <td><div><Badge mono>{run.kind}</Badge><div className={s.quiet}>{run.method}</div></div></td>
    <td><Badge tone={run.provider === "local" ? "neutral" : "warn"}>{run.provider}</Badge></td>
    <td><Badge tone={attention ? (run.status === "unsupported" ? "warn" : "crit") : run.status === "empty" ? "neutral" : "accent"}>{run.timed_out ? "timed out" : run.status}</Badge></td>
    <td className={s.num}>{bytesLabel(run.input_bytes)}</td>
    <td className={s.num}>{bytesLabel(run.output_bytes)}</td>
    <td className={s.num}>{run.duration_ms}ms</td>
    <td className={s.quiet}>{run.error || ""}</td>
  </tr>;
}

function bytesLabel(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
