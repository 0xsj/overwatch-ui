"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Panel } from "@/components/display";
import { Button } from "@/components/forms";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import type { Evidence } from "@/lib/services/review";
import { downloadBriefSnapshotMarkdown, snapshotEvidenceIds } from "@/lib/services/brief/export";
import { PageHead } from "../_components/page-head";
import { useContext, Query } from "../_hooks";
import { briefSnapshotEvidenceQuery, briefSnapshotQuery } from "../_queries";
import { authorLabel, dateLabel, investigationPath, sourceHref } from "./_shared";
import s from "./investigation.module.css";

export function SnapshotDetailScreen({ workspace, snapshot: snapshotID }: { workspace: string; snapshot: string }) {
  const { shell } = useContext();
  const snapshot = useQuery({
    queryKey: keys.brief.snapshot(workspace, snapshotID),
    queryFn: () => briefSnapshotQuery(workspace, snapshotID),
  });
  const evidence = useQuery({
    queryKey: keys.brief.snapshotEvidence(workspace, snapshotID),
    queryFn: () => briefSnapshotEvidenceQuery(workspace, snapshot.data ? snapshotEvidenceIds(snapshot.data) : []),
    enabled: snapshot.isSuccess,
  });

  return <Query of={snapshot} label="the frozen handoff">{(data) => <>
    <PageHead title={data.title} actions={<div className={s.row}>
      <Button asChild intent="ghost"><Link href={investigationPath(workspace, "brief")}>Back to working brief</Link></Button>
      <Button type="button" intent="primary" loading={evidence.isPending} disabled={!evidence.isSuccess} onClick={() => evidence.data && downloadBriefSnapshotMarkdown(data, evidence.data)}>
        {evidence.isPending ? "Preparing download…" : "Download Markdown"}
      </Button>
    </div>}>
      Frozen, read-only handoff. The authored text and linked question state below cannot change through this view.
    </PageHead>
    <div className={s.stack}>
      <Panel title="Frozen metadata" note="This record is immutable.">
        <dl className={s.metadata}>
          <dt>Frozen by</dt><dd>{authorLabel(data.frozen_by, shell)}</dd>
          <dt>Frozen at</dt><dd>{dateLabel(data.frozen_at)}</dd>
          <dt>Source brief updated</dt><dd>{dateLabel(data.source_updated_at)}</dd>
          <dt>Snapshot ID</dt><dd>{data.snapshot_id}</dd>
        </dl>
      </Panel>
      <Panel title="Authored handoff">
        <div className={s.stack}>
          <SnapshotSection label="Investigation question" value={data.question} />
          <SnapshotSection label="Current account" value={data.current_account} />
          <SnapshotSection label="Alternatives" value={data.alternatives} />
          <SnapshotSection label="Limitations" value={data.limitations} />
          <SnapshotSection label="Next steps" value={data.next_steps} />
        </div>
      </Panel>
      <Panel title="Cited observations" note="Brief-level citations are resolved directly from their workspace-scoped identifiers.">
        <Query of={evidence} label="the frozen citations">{(rows) => <EvidenceList rows={rows} workspace={workspace} snapshot={data.snapshot_id} ids={data.observation_ids} />}</Query>
      </Panel>
      <Panel title="Questions at freeze" note="Wording, state, resolution, and linked citations are copied into the immutable handoff.">
        {data.questions.length ? <div className={s.stack}>{data.questions.map((question) => <article key={question.question_id} className={s.briefSection}>
          <Text size="sm">{question.question}</Text>
          <Text size="xs" tone="tertiary">State: {question.state}{question.resolution ? ` · ${question.resolution}` : ""}</Text>
          <Text size="xs" tone="tertiary">Question ID: {question.question_id}</Text>
          <ObservationLinks label="Question observations" ids={question.observation_ids} rows={evidence.data ?? []} workspace={workspace} snapshot={data.snapshot_id} />
        </article>)}</div> : <Text size="sm" tone="tertiary">No investigation questions were linked at freeze time.</Text>}
      </Panel>
      <Panel title="Connections at freeze" note="Endpoint labels, descriptions, record citations, assessment, rationale, and evidence sides are copied into the immutable handoff.">
        {data.connections.length ? <div className={s.stack}>{data.connections.map((connection) => <article key={connection.connection_id} className={s.briefSection}>
          <Text size="sm">{connection.from_record_name} → {connection.to_record_name}</Text>
          <Text size="xs" tone="tertiary">{connection.from_record_kind} → {connection.to_record_kind} · {connection.kind} · {connection.state} · Connection ID: {connection.connection_id}</Text>
          <Text size="xs" tone="tertiary">From record: {connection.from_record_id} · {connection.from_record_description || "No description recorded."}</Text>
          <Text size="xs" tone="tertiary">To record: {connection.to_record_id} · {connection.to_record_description || "No description recorded."}</Text>
          <Text size="sm" className={s.body}>{connection.rationale}</Text>
          <Text size="xs" tone="tertiary">From record observations: {connection.from_record_observation_ids.length || "none"} · To record observations: {connection.to_record_observation_ids.length || "none"}</Text>
          <ObservationLinks label="From-record observations" ids={connection.from_record_observation_ids} rows={evidence.data ?? []} workspace={workspace} snapshot={data.snapshot_id} />
          <ObservationLinks label="To-record observations" ids={connection.to_record_observation_ids} rows={evidence.data ?? []} workspace={workspace} snapshot={data.snapshot_id} />
          <ObservationLinks label="Supporting observations" ids={connection.supporting_observation_ids} rows={evidence.data ?? []} workspace={workspace} snapshot={data.snapshot_id} />
          <ObservationLinks label="Opposing observations" ids={connection.opposing_observation_ids} rows={evidence.data ?? []} workspace={workspace} snapshot={data.snapshot_id} />
        </article>)}</div> : <Text size="sm" tone="tertiary">No connections were linked at freeze time.</Text>}
      </Panel>
    </div>
  </>}</Query>;
}

function SnapshotSection({ label, value }: { label: string; value?: string }) {
  return <section className={s.briefSection}><Text size="xs" tone="tertiary">{label}</Text><Text size="sm" className={s.body}>{value?.trim() || "Not recorded."}</Text></section>;
}

function ObservationLinks({ label, ids, rows, workspace, snapshot }: { label: string; ids: string[]; rows: Evidence[]; workspace: string; snapshot: string }) {
  if (!ids.length) return <Text size="xs" tone="tertiary">{label}: none.</Text>;
  const byID = new Map(rows.map((row) => [row.observation_id, row]));
  const returnTo = investigationPath(workspace, `brief/snapshots/${encodeURIComponent(snapshot)}`);
  return <section className={s.stack}><Text size="xs" tone="tertiary">{label}</Text>{ids.map((id) => {
    const row = byID.get(id);
    if (!row) return <Text key={id} size="xs" tone="tertiary">Citation {id} could not be resolved.</Text>;
    return <article key={id} className={s.observation}>
      <Link href={sourceHref(workspace, row.source_id, row.capture_id, row.observation_id, returnTo)} className={s.inlineLink}>{row.source_title}</Link>
      <Text size="sm" className={s.evidenceStatement}>{row.statement}</Text>
      <blockquote className={s.quote}>{row.quote}</blockquote>
    </article>;
  })}</section>;
}

function EvidenceList({ rows, workspace, snapshot, ids }: { rows: Evidence[]; workspace: string; snapshot: string; ids: string[] }) {
  if (!ids.length) return <Text size="sm" tone="tertiary">No observations were cited.</Text>;
  const byID = new Map(rows.map((row) => [row.observation_id, row]));
  const returnTo = investigationPath(workspace, `brief/snapshots/${encodeURIComponent(snapshot)}`);
  return <div className={s.stack}>{ids.map((id) => {
    const row = byID.get(id);
    if (!row) return <Text key={id} size="sm" tone="tertiary">Citation {id} could not be resolved.</Text>;
    return <article key={id} className={s.observation}>
      <div className={s.eventMeta}><Link href={sourceHref(workspace, row.source_id, row.capture_id, row.observation_id, returnTo)} className={s.inlineLink}>{row.source_title}</Link><span className={s.muted}>Observation {row.observation_id}</span></div>
      <Text size="sm" className={s.evidenceStatement}>{row.statement}</Text>
      <blockquote className={s.quote}>{row.quote}</blockquote>
      <Text size="xs" tone="tertiary">Capture {row.capture_id} · recorded {dateLabel(row.recorded_at)}</Text>
    </article>;
  })}</div>;
}
