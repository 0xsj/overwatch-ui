"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge, Panel, Stat } from "@/components/display";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import type { HealthProbe, HealthReport, HealthSymptom } from "@/lib/services/health";
import { checkBackend } from "@/lib/services/health/transport";
import { PageHead } from "../../_components/page-head";
import { NoWorkspace, Query, useContext } from "../../_hooks";
import { healthQuery } from "../../_queries";
import s from "../../surface/surface.module.css";

const SUB =
  "The machinery’s own vitals. A clean symptom list is meaningful only beside what was measured, so every probe reports its denominator and every unreadable probe stays visibly unreadable.";

export function HealthScreen() {
  const { workspace } = useContext();
  const health = useQuery({
    queryKey: keys.health.one(workspace ?? ""),
    queryFn: () => healthQuery(workspace!),
    enabled: Boolean(workspace),
    retry: false,
  });
  const transport = useQuery({
    queryKey: ["health", "transport"],
    queryFn: () => checkBackend(),
    staleTime: 10_000,
    retry: false,
  });

  if (!workspace) return <><PageHead title="Health">{SUB}</PageHead><NoWorkspace what="A health report" /></>;

  return <>
    <PageHead title="Health">{SUB}</PageHead>
    <Panel title="Service connection" note="This is the process check. The workspace report below is the machinery check; they answer different questions.">
      <Query of={transport} label="service connection">{(status) => <div className={s.row}>
        <Badge tone={status.status === "ok" || status.status === "fixtures" ? "accent" : "crit"}>{transportLabel(status.status)}</Badge>
        <Text size="sm">{transportDetail(status)}</Text>
      </div>}</Query>
    </Panel>
    <Query of={health} label="workspace health">{(report) => <HealthReportView report={report} />}</Query>
  </>;
}

function HealthReportView({ report }: { report: HealthReport }) {
  const measured = report.probes.filter((probe) => probe.measured).length;
  const found = report.probes.reduce((sum, probe) => sum + (probe.found ?? 0), 0);
  const tone = !report.trustworthy ? "crit" : report.symptoms.length ? "warn" : "accent";
  return <>
    <div className={s.legend}>
      <Stat label="Report" value={<Badge tone={tone}>{!report.trustworthy ? "Partial" : report.symptoms.length ? "Symptoms found" : "Measured clean"}</Badge>} note={`updated ${new Date(report.at).toLocaleString()}`} />
      <Stat label="Probes" value={`${measured}/${report.probes.length}`} note="successfully measured" />
      <Stat label="Symptoms" value={report.symptoms.length} note={`${found} probe findings`} tone={report.symptoms.length ? "warn" : "accent"} />
    </div>
    <Panel title="What was measured" note="A measured zero means the probe ran and found nothing. An unmeasured value means the system could not answer.">
      <div className={s.scroll}><table className={s.table}><thead><tr><th scope="col">probe</th><th scope="col">measured</th><th scope="col">considered</th><th scope="col">symptoms</th><th scope="col">reason</th></tr></thead><tbody>{report.probes.map((probe) => <ProbeRow key={probe.kind} probe={probe} />)}</tbody></table></div>
    </Panel>
    <Panel title="Actionable symptoms" note="These are quiet failure modes, not generic errors. Each row names the thing a person can investigate.">
      {report.symptoms.length ? <div className={s.eventList}>{report.symptoms.map((symptom, index) => <SymptomCard key={`${symptom.kind}:${symptom.subject}:${index}`} symptom={symptom} />)}</div> : <div className={s.empty}><Text size="sm">No symptoms found.</Text><Text size="sm" tone="tertiary">Every probe measured successfully and returned no quiet failures for this workspace.</Text></div>}
    </Panel>
  </>;
}

function ProbeRow({ probe }: { probe: HealthProbe }) {
  return <tr><td><Badge mono>{probe.kind}</Badge></td><td><Badge tone={probe.measured ? "accent" : "crit"}>{probe.measured ? "yes" : "no"}</Badge></td><td className={s.num}>{probe.measured ? probe.looked : "–"}</td><td className={s.num}>{probe.measured ? probe.found : "–"}</td><td className={s.quiet}>{probe.measured ? "" : probe.because ?? "not measured"}</td></tr>;
}

function SymptomCard({ symptom }: { symptom: HealthSymptom }) {
  return <article className={s.observation}><div className={s.eventMeta}><Badge tone="warn" mono>{symptom.kind}</Badge><strong className={s.eventTitle}>{symptom.subject}</strong><span className={s.muted}>{symptom.count} occurrence{symptom.count === 1 ? "" : "s"}</span></div><Text size="sm">{symptom.says}</Text>{symptom.detail ? <Text size="xs" tone="tertiary">{symptom.detail}</Text> : null}{symptom.since ? <Text size="xs" tone="tertiary">Since {new Date(symptom.since).toLocaleString()}</Text> : null}</article>;
}

function transportLabel(status: Awaited<ReturnType<typeof checkBackend>>["status"]) {
  switch (status) {
    case "fixtures": return "Fixture mode";
    case "ok": return "Process reachable";
    case "unhealthy": return "Process unhealthy";
    case "unreachable": return "Process unreachable";
  }
}

function transportDetail(status: Awaited<ReturnType<typeof checkBackend>>) {
  switch (status.status) {
    case "fixtures": return "No backend URL is configured; the report below is served by the in-memory fixture.";
    case "ok": return `${status.url} answered in ${status.ms}ms.`;
    case "unhealthy": return `${status.url} answered HTTP ${status.code}.`;
    case "unreachable": return `${status.url} could not be reached: ${status.reason}`;
  }
}
