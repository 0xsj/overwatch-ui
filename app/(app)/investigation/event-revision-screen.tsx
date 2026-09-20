"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Panel } from "@/components/display";
import { Button } from "@/components/forms";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import type { Evidence } from "@/lib/services/review";
import type { EventRecordSnapshot, TimelineEventRevision } from "@/lib/services/events";
import { PageHead } from "../_components/page-head";
import { Query, useContext } from "../_hooks";
import { eventRevisionQuery, evidenceByIDsQuery } from "../_queries";
import { authorLabel, dateLabel, Failure, investigationPath, sourceHref } from "./_shared";
import s from "./investigation.module.css";

export function EventRevisionScreen({ workspace, event, revision }: { workspace: string; event: string; revision: string }) {
  const { shell } = useContext();
  const detail = useQuery({
    queryKey: keys.events.revision(workspace, event, revision),
    queryFn: () => eventRevisionQuery(workspace, event, revision),
  });
  const evidence = useQuery({
    queryKey: keys.events.revisionEvidence(workspace, event, revision),
    queryFn: () => evidenceByIDsQuery(workspace, detail.data ? eventRevisionObservationIDs(detail.data) : []),
    enabled: detail.isSuccess,
  });
  const back = `${investigationPath(workspace, "timeline")}?event=${encodeURIComponent(event)}`;

  return <Query of={detail} label="the event revision">{(data) => <>
    <PageHead title={`Event revision ${data.revision}`} actions={<Button asChild intent="ghost"><Link href={back}>Back to event history</Link></Button>}>
      Immutable reported-event account. This view does not read the live event or records to render its wording, citations, or linked context.
    </PageHead>
    <div className={s.stack}>
      <Panel title="Revision metadata" note="This record is append-only.">
        <dl className={s.metadata}>
          <dt>Revision</dt><dd>{data.revision}</dd>
          <dt>Changed by</dt><dd>{authorLabel(data.changed_by, shell)}</dd>
          <dt>Changed at</dt><dd>{dateLabel(data.changed_at)}</dd>
          <dt>Revision ID</dt><dd>{data.revision_id}</dd>
          <dt>Event ID</dt><dd>{data.event_id}</dd>
        </dl>
      </Panel>
      <Panel title="Event account at revision">
        <div className={s.stack}>
          <Text size="lg">{data.title}</Text>
          {data.description ? <Text size="sm" tone="tertiary">{data.description}</Text> : null}
          <div className={s.eventMeta}><Text size="xs" tone="tertiary">Reported time</Text><Text size="sm">{data.reported_time || "Unknown"} · {data.time_precision}</Text></div>
          {data.sort_date ? <div className={s.eventMeta}><Text size="xs" tone="tertiary">Ordering date</Text><Text size="sm">{data.sort_date}</Text></div> : null}
          {data.location ? <div className={s.eventMeta}><Text size="xs" tone="tertiary">Location</Text><Text size="sm">{data.location}</Text></div> : null}
        </div>
      </Panel>
      <Panel title="Participant records at revision" note="Labels and citations are copied, not resolved from current records.">
        <RecordList records={data.participant_records} evidence={evidence.data ?? []} workspace={workspace} event={event} revision={revision} error={evidence.error instanceof Error ? evidence.error : null} emptyLabel="No participant records were linked at this revision." />
      </Panel>
      <Panel title="Place record at revision" note="The place context is immutable at this revision.">
        {data.location_record ? <RecordList records={[data.location_record]} evidence={evidence.data ?? []} workspace={workspace} event={event} revision={revision} error={evidence.error instanceof Error ? evidence.error : null} emptyLabel="No place record was linked at this revision." /> : <Text size="sm" tone="tertiary">No place record was linked at this revision.</Text>}
      </Panel>
      <Panel title="Event citations" note="These observations were linked to the event at this revision.">
        <EvidenceList ids={data.observation_ids} rows={evidence.data ?? []} workspace={workspace} event={event} revision={revision} error={evidence.error instanceof Error ? evidence.error : null} />
      </Panel>
    </div>
  </>}</Query>;
}

function eventRevisionObservationIDs(revision: TimelineEventRevision) {
  return [...new Set([
    ...revision.observation_ids,
    ...revision.participant_records.flatMap((record) => record.observation_ids),
    ...(revision.location_record?.observation_ids ?? []),
    ...(revision.location_record?.place_geometry?.observation_ids ?? []),
  ])];
}

function RecordList({ records, evidence, workspace, event, revision, error, emptyLabel }: { records: EventRecordSnapshot[]; evidence: Evidence[]; workspace: string; event: string; revision: string; error: Error | null; emptyLabel: string }) {
  if (!records.length) return <Text size="sm" tone="tertiary">{emptyLabel}</Text>;
  return <div className={s.stack}>{records.map((record) => <section key={record.record_id} className={s.briefSection}><div className={s.eventMeta}><Text size="sm">{record.name}</Text><Text size="xs" tone="tertiary">{record.kind} · {record.record_id}</Text></div>{record.description ? <Text size="sm" tone="tertiary">{record.description}</Text> : null}{record.place_geometry ? <Text size="sm">Map context: {record.place_geometry.latitude.toFixed(5)}, {record.place_geometry.longitude.toFixed(5)} · {record.place_geometry.precision} · <a className={s.inlineLink} href={`https://www.openstreetmap.org/?mlat=${encodeURIComponent(record.place_geometry.latitude)}&mlon=${encodeURIComponent(record.place_geometry.longitude)}#map=12/${encodeURIComponent(record.place_geometry.latitude)}/${encodeURIComponent(record.place_geometry.longitude)}`} target="_blank" rel="noreferrer">Open map ↗</a></Text> : null}<EvidenceList ids={[...record.observation_ids, ...(record.place_geometry?.observation_ids ?? []).filter((id) => !record.observation_ids.includes(id))]} rows={evidence} workspace={workspace} event={event} revision={revision} error={error} emptyLabel="No record citations at this revision." /></section>)}</div>;
}

function EvidenceList({ ids, rows, workspace, event, revision, error, emptyLabel = "No observations at this revision." }: { ids: string[]; rows: Evidence[]; workspace: string; event: string; revision: string; error: Error | null; emptyLabel?: string }) {
  if (!ids.length) return <Text size="sm" tone="tertiary">{emptyLabel}</Text>;
  const byID = new Map(rows.map((row) => [row.observation_id, row]));
  const returnTo = investigationPath(workspace, `timeline/${encodeURIComponent(event)}/revisions/${encodeURIComponent(revision)}`);
  return <div className={s.stack}>{error ? <Failure error={error} /> : null}{ids.map((id) => { const row = byID.get(id); if (!row) return <Text key={id} size="xs" tone="tertiary">Observation {id} could not be resolved.</Text>; return <article key={id} className={s.observation}><div className={s.eventMeta}><Link href={sourceHref(workspace, row.source_id, row.capture_id, row.observation_id, returnTo)} className={s.inlineLink}>{row.source_title}</Link><span className={s.muted}>Observation {row.observation_id}</span></div><Text size="sm" className={s.evidenceStatement}>{row.statement}</Text><blockquote className={s.quote}>{row.quote}</blockquote><Text size="xs" tone="tertiary">Capture {row.capture_id} · recorded {dateLabel(row.recorded_at)}</Text></article>; })}</div>;
}
