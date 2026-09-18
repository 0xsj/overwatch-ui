"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Panel } from "@/components/display";
import { Button } from "@/components/forms";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import type { Evidence } from "@/lib/services/review";
import { connectionRevisionObservationIds } from "@/lib/services/research-connections/history";
import { PageHead } from "../_components/page-head";
import { useContext, Query } from "../_hooks";
import { evidenceByIDsQuery, researchConnectionRevisionQuery } from "../_queries";
import { authorLabel, dateLabel, investigationPath, sourceHref } from "./_shared";
import s from "./investigation.module.css";

const stateLabels = {
  proposed: "Proposed",
  accepted: "Accepted",
  rejected: "Rejected",
  deferred: "Deferred",
} as const;

export function ConnectionRevisionScreen({ workspace, connection, revision }: { workspace: string; connection: string; revision: string }) {
  const { shell } = useContext();
  const detail = useQuery({
    queryKey: keys.connections.revision(workspace, connection, revision),
    queryFn: () => researchConnectionRevisionQuery(workspace, connection, revision),
  });
  const evidence = useQuery({
    queryKey: keys.connections.revisionEvidence(workspace, connection, revision),
    queryFn: () => evidenceByIDsQuery(workspace, detail.data ? connectionRevisionObservationIds(detail.data) : []),
    enabled: detail.isSuccess,
  });
  const back = `${investigationPath(workspace, "connections")}?connection=${encodeURIComponent(connection)}`;

  return <Query of={detail} label="the connection revision">{(data) => <>
    <PageHead title={`Connection revision ${data.revision}`} actions={<Button asChild intent="ghost"><Link href={back}>Back to connection history</Link></Button>}>
      Immutable historical assessment. This view does not read the live connection row to render its state, rationale, or evidence sides.
    </PageHead>
    <div className={s.stack}>
      <Panel title="Revision metadata" note="This record is append-only.">
        <dl className={s.metadata}>
          <dt>Revision</dt><dd>{data.revision}</dd>
          <dt>Changed by</dt><dd>{authorLabel(data.changed_by, shell)}</dd>
          <dt>Changed at</dt><dd>{dateLabel(data.changed_at)}</dd>
          <dt>Revision ID</dt><dd>{data.revision_id}</dd>
          <dt>Connection ID</dt><dd>{data.connection_id}</dd>
        </dl>
      </Panel>
      <Panel title="Assessment at revision">
        <div className={s.stack}>
          <div className={s.eventMeta}><Text size="xs" tone="tertiary">From record</Text><Text size="xs">{data.from_record_name || data.from_record_id} <span className={s.muted}>({data.from_record_kind || "record"} · {data.from_record_id})</span></Text></div>
          <div className={s.eventMeta}><Text size="xs" tone="tertiary">To record</Text><Text size="xs">{data.to_record_name || data.to_record_id} <span className={s.muted}>({data.to_record_kind || "record"} · {data.to_record_id})</span></Text></div>
          <div className={s.eventMeta}><Text size="xs" tone="tertiary">Relationship</Text><Text size="xs">{data.kind}</Text></div>
          <div className={s.eventMeta}><Text size="xs" tone="tertiary">Review state</Text><Text size="xs">{stateLabels[data.state]}</Text></div>
          <section className={s.briefSection}><Text size="xs" tone="tertiary">Rationale</Text><Text size="sm" className={s.body}>{data.rationale}</Text></section>
        </div>
      </Panel>
      <Panel title="Endpoint record context" note="Descriptions and record citations copied into this revision; they do not follow later record edits.">
        <div className={s.stack}>
          <RecordContext label="From record" name={data.from_record_name || data.from_record_id} kind={data.from_record_kind} id={data.from_record_id} description={data.from_record_description} />
          <EvidenceList rows={evidence.data ?? []} workspace={workspace} connection={connection} revision={revision} ids={data.from_record_observation_ids} emptyLabel="No record observations attached at this revision." />
          <RecordContext label="To record" name={data.to_record_name || data.to_record_id} kind={data.to_record_kind} id={data.to_record_id} description={data.to_record_description} />
          <EvidenceList rows={evidence.data ?? []} workspace={workspace} connection={connection} revision={revision} ids={data.to_record_observation_ids} emptyLabel="No record observations attached at this revision." />
        </div>
      </Panel>
      <Panel title="Supporting observations" note="These citations were on the supporting side at this revision.">
        <Query of={evidence} label="the supporting observations">{(rows) => <EvidenceList rows={rows} workspace={workspace} connection={connection} revision={revision} ids={data.supporting_observation_ids} />}</Query>
      </Panel>
      <Panel title="Opposing observations" note="These citations were on the opposing side at this revision.">
        <Query of={evidence} label="the opposing observations">{(rows) => <EvidenceList rows={rows} workspace={workspace} connection={connection} revision={revision} ids={data.opposing_observation_ids} />}</Query>
      </Panel>
    </div>
  </>}</Query>;
}

function RecordContext({ label, name, kind, id, description }: { label: string; name: string; kind: string; id: string; description: string }) {
  return <div className={s.stack}>
    <div className={s.eventMeta}><Text size="xs" tone="tertiary">{label}</Text><Text size="xs">{name} <span className={s.muted}>({kind || "record"} · {id})</span></Text></div>
    <Text size="sm" tone="tertiary">{description || "No description recorded at this revision."}</Text>
  </div>;
}

function EvidenceList({ rows, workspace, connection, revision, ids, emptyLabel = "No observations on this side." }: { rows: Evidence[]; workspace: string; connection: string; revision: string; ids: string[]; emptyLabel?: string }) {
  if (!ids.length) return <Text size="sm" tone="tertiary">{emptyLabel}</Text>;
  const byID = new Map(rows.map((row) => [row.observation_id, row]));
  const returnTo = investigationPath(workspace, `connections/${encodeURIComponent(connection)}/revisions/${encodeURIComponent(revision)}`);
  return <div className={s.stack}>{ids.map((id) => {
    const row = byID.get(id);
    if (!row) return <Text key={id} size="sm" tone="tertiary">Observation {id} could not be resolved.</Text>;
    return <article key={id} className={s.observation}>
      <div className={s.eventMeta}><Link href={sourceHref(workspace, row.source_id, row.capture_id, row.observation_id, returnTo)} className={s.inlineLink}>{row.source_title}</Link><span className={s.muted}>Observation {row.observation_id}</span></div>
      <Text size="sm" className={s.evidenceStatement}>{row.statement}</Text>
      <blockquote className={s.quote}>{row.quote}</blockquote>
      <Text size="xs" tone="tertiary">Capture {row.capture_id} · recorded {dateLabel(row.recorded_at)}</Text>
    </article>;
  })}</div>;
}
