"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Badge, Panel } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Button, Field, Input, Textarea } from "@/components/forms";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import { filterLoadedRows } from "@/lib/query/filter";
import type { Evidence } from "@/lib/services/review";
import type { EventAccountPage, EventCluster, EventClusterState, EventParticipantLink, EventParticipantRole, EventRelationship, EventRelationshipKind, EventRelationshipState, EventReconciliationDecision, EventTimePrecision, TimelineEvent, TimelineEventRevision, WriteEvent, WriteEventAccount } from "@/lib/services/events";
import { eventHref, eventRevisionHref } from "@/lib/services/events/navigation";
import { compareEvents, sequenceEvents } from "@/lib/services/events/temporal";
import type { ResearchRecord } from "@/lib/services/research-records";
import { mayWriteResearch } from "../_route-context";
import { PageHead } from "../_components/page-head";
import { Query, useContext } from "../_hooks";
import { evidenceByIDsQuery, evidenceQuery, eventAccountsQuery, eventClustersQuery, eventQuery, eventRelationshipsQuery, eventRevisionsQuery, eventsQuery, researchRecordsByIDsQuery, researchRecordsQuery } from "../_queries";
import { createEventAccountAction, createEventAction, createEventClusterAction, createEventRelationshipAction, reconcileEventAccountsAction, reviewEventClusterAction, reviewEventRelationshipAction, updateEventAction } from "./_actions";
import { authorLabel, dateLabel, Failure, investigationPath, MoreButton, ObservationPicker as CitationPicker, RecordPicker, sourceHref, useResearchWrite, WorkingNoteLink } from "./_shared";
import s from "./investigation.module.css";

const precisionLabels: Record<EventTimePrecision, string> = {
  unknown: "Unknown",
  exact: "Exact",
  approximate: "Approximate",
  range: "Range",
};

const participantRoleLabels: Record<EventParticipantRole, string> = {
  associated: "Associated",
  actor: "Actor",
  subject: "Subject",
  target: "Target",
  witness: "Witness",
  affected: "Affected",
  reporter: "Reporter",
};

const relationshipKindLabels: Record<EventRelationshipKind, string> = {
  related: "Related",
  precedes: "Precedes",
  overlaps: "Overlaps",
  same_occurrence_candidate: "Possible same occurrence",
  possibly_causes: "Possibly causes",
};

export function TimelineScreen({ workspace }: { workspace: string }) {
  const { shell } = useContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mayWrite = mayWriteResearch(shell?.context?.workspace);
  const events = useInfiniteQuery({ queryKey: keys.events.list(workspace), queryFn: ({ pageParam }) => eventsQuery(workspace, pageParam), initialPageParam: undefined as string | undefined, getNextPageParam: (page) => page.next_cursor ?? undefined });
  const evidence = useInfiniteQuery({ queryKey: keys.evidence.list(workspace), queryFn: ({ pageParam }) => evidenceQuery(workspace, pageParam), initialPageParam: undefined as string | undefined, getNextPageParam: (page) => page.next_cursor ?? undefined });
  const records = useInfiniteQuery({ queryKey: keys.records.list(workspace), queryFn: ({ pageParam }) => researchRecordsQuery(workspace, pageParam), initialPageParam: undefined as string | undefined, getNextPageParam: (page) => page.next_cursor ?? undefined });
  const rows = sequenceEvents(events.data?.pages.flatMap((page) => page.items) ?? []);
  const [filter, setFilter] = useState("");
  const visibleRows = filterLoadedRows(rows, filter, (event) => [event.event_id, event.title, event.description ?? "", event.reported_time ?? "", event.location ?? "", event.time_precision, event.sort_date ?? ""]);
  const listedEvidenceRows = evidence.data?.pages.flatMap((page) => page.items) ?? [];
  const [activeId, setActiveId] = useState<string | null>(() => searchParams.get("event"));
  const targetedEvent = useQuery({
    queryKey: keys.events.one(workspace, activeId ?? ""),
    queryFn: () => eventQuery(workspace, activeId!),
    enabled: Boolean(activeId) && !rows.some((event) => event.event_id === activeId),
    retry: false,
  });
  const active = rows.find((event) => event.event_id === activeId) ?? targetedEvent.data;
  const targetedEventLoading = Boolean(activeId && !active && targetedEvent.isPending);
  const history = useQuery({
    queryKey: keys.events.revisions(workspace, activeId ?? ""),
    queryFn: () => eventRevisionsQuery(workspace, activeId!),
    enabled: Boolean(activeId),
  });
  const accounts = useQuery({
    queryKey: keys.events.accounts(workspace, activeId ?? ""),
    queryFn: () => eventAccountsQuery(workspace, activeId!),
    enabled: Boolean(activeId),
    retry: false,
  });
  const clusters = useInfiniteQuery({
    queryKey: keys.events.clusters(workspace),
    queryFn: ({ pageParam }) => eventClustersQuery(workspace, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });
  const relationships = useInfiniteQuery({
    queryKey: keys.events.relationships(workspace),
    queryFn: ({ pageParam }) => eventRelationshipsQuery(workspace, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });
  const listedRecordRows = records.data?.pages.flatMap((page) => page.items) ?? [];
  const targetedRecordIDs = [...new Set([
    ...rows.flatMap((event) => event.participant_record_ids ?? []),
    ...rows.map((event) => event.location_record_id).filter((id): id is string => Boolean(id)),
    ...(active?.participant_record_ids ?? []),
    ...(active?.location_record_id ? [active.location_record_id] : []),
  ])];
  const needsTargetedRecords = targetedRecordIDs.some((id) => !listedRecordRows.some((record) => record.record_id === id));
  const targetedRecords = useQuery({
    queryKey: keys.records.byIDs(workspace, targetedRecordIDs),
    queryFn: () => researchRecordsByIDsQuery(workspace, targetedRecordIDs),
    enabled: needsTargetedRecords,
  });
  const recordRows = mergeRecords(listedRecordRows, targetedRecords.data ?? []);
  const targetedObservationIds = active?.observation_ids ?? [];
  const targetedEvidence = useQuery({
    queryKey: keys.events.evidence(workspace, active?.event_id ?? "", targetedObservationIds),
    queryFn: () => evidenceByIDsQuery(workspace, targetedObservationIds),
    enabled: targetedObservationIds.length > 0,
  });
  const evidenceRows = mergeEvidence(listedEvidenceRows, targetedEvidence.data ?? []);
  const evidenceError = evidence.isError ? evidence.error : targetedEvidence.isError ? targetedEvidence.error : null;
  const openEvent = (event?: string) => { setActiveId(event ?? null); router.replace(eventHref(workspace, event)); };

  return <>
    <PageHead title="Timeline" actions={mayWrite ? <Button type="button" intent="primary" onClick={() => openEvent()}>New event</Button> : undefined}>
      Record what the sources may describe as an occurrence. Event time is kept separate from publication and capture time, and uncertainty stays visible.
    </PageHead>
    <div className={s.columns}>
      <Panel title="Reported events" note={rows.length ? `${rows.length} loaded` : undefined}>
        <Query of={events} label="reported events">{() => <div className={s.stack}>
          {!rows.length ? <div className={s.empty}><Text size="sm">No reported events recorded yet.</Text><Text size="sm" tone="tertiary">Start from cited observations when several sources describe an occurrence worth reconstructing.</Text>{mayWrite ? <Button type="button" intent="primary" onClick={() => openEvent()}>Record an event</Button> : null}</div> : <div className={s.stack}><Input aria-label="Filter reported events" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter loaded events" /><Text size="xs" tone="tertiary">Showing {visibleRows.length} of {rows.length} loaded event{rows.length === 1 ? "" : "s"}.</Text>{visibleRows.length ? <div className={s.eventList}>{visibleRows.map((event) => <EventCard key={event.event_id} event={event} active={event.event_id === activeId} evidence={evidenceRows} records={recordRows} workspace={workspace} shell={shell} select={() => openEvent(event.event_id)} />)}</div> : <Text size="sm" tone="tertiary">No loaded events match. Clear the filter or load more.</Text>}</div>}
          <MoreButton available={events.hasNextPage} pending={events.isFetchingNextPage} load={() => void events.fetchNextPage()} />
        </div>}</Query>
      </Panel>
      <Panel title={active ? "Review event" : targetedEventLoading ? "Loading event" : activeId ? "Selected event" : "Record an event"}>
        {targetedEventLoading ? <Text size="sm" tone="tertiary">Opening the selected event…</Text> : targetedEvent.error && !active ? <Failure error={targetedEvent.error} /> : targetedRecords.isPending && needsTargetedRecords ? <Text size="sm" tone="tertiary">Loading linked records…</Text> : <EventEditor key={active?.event_id ?? "new"} workspace={workspace} event={active} evidence={evidenceRows} evidenceError={evidenceError} evidenceHasNext={evidence.hasNextPage} evidenceFetchingNext={evidence.isFetchingNextPage} fetchMoreEvidence={() => void evidence.fetchNextPage()} records={recordRows} recordsError={targetedRecords.error instanceof Error ? targetedRecords.error : null} recordsHasNext={records.hasNextPage} recordsFetchingNext={records.isFetchingNextPage} fetchMoreRecords={() => void records.fetchNextPage()} history={history.data?.items ?? []} historyError={history.error instanceof Error ? history.error : null} accounts={accounts.data} accountsError={accounts.error instanceof Error ? accounts.error : null} mayWrite={mayWrite} shell={shell} saved={(saved) => openEvent(saved.event_id)} />}
      </Panel>
    </div>
    <EventClusterPanel workspace={workspace} events={rows} clusters={clusters.data?.pages.flatMap((page) => page.items) ?? []} mayWrite={mayWrite} error={clusters.error instanceof Error ? clusters.error : null} moreAvailable={clusters.hasNextPage} morePending={clusters.isFetchingNextPage} loadMore={() => void clusters.fetchNextPage()} />
    <EventRelationshipPanel workspace={workspace} events={rows} relationships={relationships.data?.pages.flatMap((page) => page.items) ?? []} evidence={evidenceRows} evidenceError={evidenceError} evidenceHasNext={evidence.hasNextPage} evidenceFetchingNext={evidence.isFetchingNextPage} fetchMoreEvidence={() => void evidence.fetchNextPage()} mayWrite={mayWrite} error={relationships.error instanceof Error ? relationships.error : null} moreAvailable={relationships.hasNextPage} morePending={relationships.isFetchingNextPage} loadMore={() => void relationships.fetchNextPage()} />
    <TemporalComparisonPanel workspace={workspace} events={rows} relationships={relationships.data?.pages.flatMap((page) => page.items) ?? []} />
  </>;
}

function mergeEvidence(primary: Evidence[], additional: Evidence[]) {
  const byID = new Map(primary.map((row) => [row.observation_id, row]));
  for (const row of additional) if (!byID.has(row.observation_id)) byID.set(row.observation_id, row);
  return [...byID.values()];
}

function EventClusterPanel({ workspace, events, clusters, mayWrite, error, moreAvailable, morePending, loadMore }: { workspace: string; events: TimelineEvent[]; clusters: EventCluster[]; mayWrite: boolean; error: Error | null; moreAvailable: boolean; morePending: boolean; loadMore: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const create = useResearchWrite(() => createEventClusterAction(workspace, { title, description, event_ids: selected }), [keys.events.clusters(workspace)], () => { setTitle(""); setDescription(""); setSelected([]); });
  return <Panel title="Event hypotheses" note="Group possible same-event accounts without merging events or asserting causality.">
    <div className={s.stack}>
      <Text size="sm" tone="tertiary">An event hypothesis is an analyst-authored grouping of separate events. It stays reviewable and can be accepted or rejected without changing the events inside it.</Text>
      <Failure error={error} />
      {clusters.length ? <div className={s.stack}>{clusters.map((cluster) => <EventClusterCard key={cluster.cluster_id} workspace={workspace} cluster={cluster} events={events} mayWrite={mayWrite} />)}</div> : <Text size="sm" tone="tertiary">No event hypotheses have been recorded.</Text>}
      <MoreButton available={moreAvailable} pending={morePending} load={loadMore} />
      {mayWrite ? <details className={s.details}><summary>Group events into a hypothesis</summary><form className={s.stack} onSubmit={(form) => { form.preventDefault(); create.mutate(); }}>
        <Text size="xs" tone="tertiary">Choose two to twelve existing authored events. This creates a hypothesis only; it does not merge their records.</Text>
        <Field label="Hypothesis title" required>{(aria) => <Input {...aria} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Reports may describe one occurrence" />}</Field>
        <Field label="Why might these be related?" required>{(aria) => <Textarea {...aria} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="The accounts share a location and reporting window, but causality is unverified." />}</Field>
        <div className={s.details}><Text size="sm">Events in hypothesis <span className={s.muted}>({selected.length}/12)</span></Text><div className={s.checkboxList}>{events.map((event) => { const checked = selected.includes(event.event_id); const disabled = !checked && selected.length >= 12; return <label key={event.event_id} className={s.checkboxLabel}><input type="checkbox" checked={checked} disabled={disabled} onChange={() => setSelected(checked ? selected.filter((id) => id !== event.event_id) : [...selected, event.event_id])} /><span className={s.questionLinkText}>{event.title} <span className={s.muted}>{event.reported_time || "time unknown"}</span></span></label>; })}</div></div>
        <Failure error={create.error} /><Button type="submit" intent="primary" loading={create.isPending} disabled={selected.length < 2}>Save event hypothesis</Button>
      </form></details> : null}
    </div>
  </Panel>;
}

function EventClusterCard({ workspace, cluster, events, mayWrite }: { workspace: string; cluster: EventCluster; events: TimelineEvent[]; mayWrite: boolean }) {
  const [state, setState] = useState<EventClusterState>(cluster.state);
  const [note, setNote] = useState(cluster.review_note ?? "");
  const review = useResearchWrite(() => reviewEventClusterAction(workspace, cluster.cluster_id, { state, note }), [keys.events.clusters(workspace)]);
  const eventByID = new Map(events.map((event) => [event.event_id, event]));
  return <article className={s.observation}><div className={s.eventMeta}><Badge tone={cluster.state === "accepted" ? "accent" : cluster.state === "rejected" ? "neutral" : "warn"}>{cluster.state}</Badge><span className={s.muted}>Updated {dateLabel(cluster.updated_at)}</span></div><Text size="sm" className={s.eventTitle}>{cluster.title}</Text><Text size="sm" tone="tertiary">{cluster.description}</Text><div className={s.stack}>{cluster.event_ids.map((id) => { const event = eventByID.get(id); return <Link key={id} className={s.inlineLink} href={eventHref(workspace, id)}>{event?.title ?? `Event ${id.slice(0, 8)}…`}{event?.reported_time ? ` · ${event.reported_time}` : ""}</Link>; })}</div>{cluster.review_note ? <Text size="xs" tone="tertiary">Review note: {cluster.review_note}</Text> : null}{mayWrite ? <div className={s.details}><Text size="sm">Review hypothesis</Text><select aria-label={`Review state for ${cluster.title}`} className={s.select} value={state} onChange={(event) => setState(event.target.value as EventClusterState)}><option value="proposed">Keep proposed</option><option value="accepted">Accept grouping</option><option value="rejected">Reject grouping</option></select>{state !== "proposed" ? <Textarea aria-label={`Review note for ${cluster.title}`} rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Explain the review decision." /> : null}<Failure error={review.error} /><Button type="button" size="sm" intent="ghost" loading={review.isPending} disabled={state !== "proposed" && !note.trim()} onClick={() => review.mutate()}>Save review state</Button></div> : null}</article>;
}

function EventRelationshipPanel({ workspace, events, relationships, evidence, evidenceError, evidenceHasNext, evidenceFetchingNext, fetchMoreEvidence, mayWrite, error, moreAvailable, morePending, loadMore }: { workspace: string; events: TimelineEvent[]; relationships: EventRelationship[]; evidence: Evidence[]; evidenceError: Error | null; evidenceHasNext: boolean; evidenceFetchingNext: boolean; fetchMoreEvidence: () => void; mayWrite: boolean; error: Error | null; moreAvailable: boolean; morePending: boolean; loadMore: () => void }) {
  const [fromEvent, setFromEvent] = useState("");
  const [toEvent, setToEvent] = useState("");
  const [kind, setKind] = useState<EventRelationshipKind>("related");
  const [rationale, setRationale] = useState("");
  const [supportingObservationIds, setSupportingObservationIds] = useState<string[]>([]);
  const [opposingObservationIds, setOpposingObservationIds] = useState<string[]>([]);
  const create = useResearchWrite(() => createEventRelationshipAction(workspace, { from_event_id: fromEvent, to_event_id: toEvent, kind, rationale, supporting_observation_ids: supportingObservationIds, opposing_observation_ids: opposingObservationIds }), [keys.events.relationships(workspace)], () => { setFromEvent(""); setToEvent(""); setKind("related"); setRationale(""); setSupportingObservationIds([]); setOpposingObservationIds([]); });
  const eventNames = new Map(events.map((event) => [event.event_id, event.title]));
  return <Panel title="Event relationships" note="Record authored sequence and related-event hypotheses without inferring causality.">
    <div className={s.stack}>
      <Text size="sm" tone="tertiary">Relationships preserve the direction, type, rationale, review state, and evidence sides of an analyst’s interpretation. “Possibly causes” is a qualified hypothesis, not an automatic causal conclusion.</Text>
      <Failure error={error} />
      {relationships.length ? <div className={s.stack}>{relationships.map((relationship) => <EventRelationshipCard key={relationship.relationship_id} workspace={workspace} relationship={relationship} evidence={evidence} evidenceError={evidenceError} fromTitle={eventNames.get(relationship.from_event_id) ?? relationship.from_event_id} toTitle={eventNames.get(relationship.to_event_id) ?? relationship.to_event_id} mayWrite={mayWrite} />)}</div> : <Text size="sm" tone="tertiary">No event relationships have been recorded.</Text>}
      <MoreButton available={moreAvailable} pending={morePending} load={loadMore} />
      {mayWrite ? <details className={s.details}><summary>Record an event relationship</summary><form className={s.stack} onSubmit={(form) => { form.preventDefault(); create.mutate(); }}>
        <Text size="xs" tone="tertiary">Choose two different events. The relationship begins as proposed and needs review before it is accepted.</Text>
        <Field label="From event" required>{(aria) => <select {...aria} className={s.select} value={fromEvent} onChange={(event) => setFromEvent(event.target.value)}><option value="">Choose an event</option>{events.map((event) => <option key={event.event_id} value={event.event_id}>{event.title}</option>)}</select>}</Field>
        <Field label="To event" required>{(aria) => <select {...aria} className={s.select} value={toEvent} onChange={(event) => setToEvent(event.target.value)}><option value="">Choose an event</option>{events.map((event) => <option key={event.event_id} value={event.event_id}>{event.title}</option>)}</select>}</Field>
        <Field label="Relationship type" required>{(aria) => <select {...aria} className={s.select} value={kind} onChange={(event) => setKind(event.target.value as EventRelationshipKind)}>{Object.entries(relationshipKindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}</Field>
        <CitationPicker workspace={workspace} label="Supporting observations" selected={supportingObservationIds} evidence={evidence} setSelected={setSupportingObservationIds} error={evidenceError} max={8} other={opposingObservationIds} hasNext={evidenceHasNext} fetchingNext={evidenceFetchingNext} fetchMore={fetchMoreEvidence} />
        <CitationPicker workspace={workspace} label="Opposing observations" selected={opposingObservationIds} evidence={evidence} setSelected={setOpposingObservationIds} error={evidenceError} max={8} other={supportingObservationIds} hasNext={evidenceHasNext} fetchingNext={evidenceFetchingNext} fetchMore={fetchMoreEvidence} />
        <Field label="Rationale" required hint="Explain the source-backed basis for the relationship.">{(aria) => <Textarea {...aria} rows={3} value={rationale} onChange={(event) => setRationale(event.target.value)} placeholder="The reported time and cited observations suggest a sequence, but the relationship remains provisional." />}</Field>
        <Failure error={create.error} /><Button type="submit" intent="primary" loading={create.isPending} disabled={!fromEvent || !toEvent || fromEvent === toEvent || !rationale.trim()}>Save event relationship</Button>
      </form></details> : null}
    </div>
  </Panel>;
}

function EventRelationshipCard({ workspace, relationship, evidence, evidenceError, fromTitle, toTitle, mayWrite }: { workspace: string; relationship: EventRelationship; evidence: Evidence[]; evidenceError: Error | null; fromTitle: string; toTitle: string; mayWrite: boolean }) {
  const [state, setState] = useState<EventRelationshipState>(relationship.state);
  const [note, setNote] = useState(relationship.review_note ?? "");
  const review = useResearchWrite(() => reviewEventRelationshipAction(workspace, relationship.relationship_id, { state, note }), [keys.events.relationships(workspace)]);
  return <article className={s.observation}><div className={s.eventMeta}><Badge tone={relationship.state === "accepted" ? "accent" : relationship.state === "rejected" ? "neutral" : "warn"}>{relationship.state}</Badge><span className={s.muted}>{dateLabel(relationship.updated_at)}</span></div><Text size="sm" className={s.eventTitle}>{fromTitle} <span className={s.muted}>→</span> {toTitle}</Text><Text size="xs" tone="tertiary">{relationshipKindLabels[relationship.kind]}</Text><Text size="sm" tone="tertiary">{relationship.rationale}</Text>{relationship.supporting_observation_ids?.length ? <CitationLinks title="Supporting observations" ids={relationship.supporting_observation_ids} evidence={evidence} workspace={workspace} error={evidenceError} /> : null}{relationship.opposing_observation_ids?.length ? <CitationLinks title="Opposing observations" ids={relationship.opposing_observation_ids} evidence={evidence} workspace={workspace} error={evidenceError} /> : null}{relationship.review_note ? <Text size="xs" tone="tertiary">Review note: {relationship.review_note}</Text> : null}{mayWrite ? <div className={s.details}><Text size="sm">Review relationship</Text><select aria-label={`Review state for ${fromTitle} to ${toTitle}`} className={s.select} value={state} onChange={(event) => setState(event.target.value as EventRelationshipState)}><option value="proposed">Keep proposed</option><option value="accepted">Accept relationship</option><option value="rejected">Reject relationship</option></select>{state !== "proposed" ? <Textarea aria-label={`Review note for ${fromTitle} to ${toTitle}`} rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Explain the review decision." /> : null}<Failure error={review.error} /><Button type="button" size="sm" intent="ghost" loading={review.isPending} disabled={state !== "proposed" && !note.trim()} onClick={() => review.mutate()}>Save review state</Button></div> : null}</article>;
}

function TemporalComparisonPanel({ workspace, events, relationships }: { workspace: string; events: TimelineEvent[]; relationships: EventRelationship[] }) {
  const [leftSelection, setLeftSelection] = useState("");
  const [rightSelection, setRightSelection] = useState("");
  const leftID = leftSelection || events[0]?.event_id || "";
  const rightID = rightSelection || events.find((event) => event.event_id !== leftID)?.event_id || "";
  const left = events.find((event) => event.event_id === leftID);
  const right = events.find((event) => event.event_id === rightID);
  const comparison = left && right && left.event_id !== right.event_id ? compareEvents(left, right, relationships) : undefined;
  return <Panel title="Sequence and temporal comparison" note="Ordering dates are analyst hints; reported wording and precision remain separate.">
    <div className={s.stack}>
      <Text size="sm" tone="tertiary">The sequence puts events with an authored ordering date first. It does not convert an ordering hint into reported fact, and an event without a comparable date remains indeterminate unless an explicit precedes relationship has been reviewed.</Text>
      {events.length ? <div className={s.stack}>{events.map((event) => {
        const links = relationships.filter((one) => one.from_event_id === event.event_id || one.to_event_id === event.event_id);
        return <article key={event.event_id} className={s.observation}><div className={s.eventMeta}><Badge tone={event.time_precision === "exact" ? "accent" : event.time_precision === "unknown" ? "warn" : "neutral"}>{precisionLabels[event.time_precision]}</Badge><span className={s.muted}>{event.sort_date ? `Ordering hint · ${event.sort_date}` : "No ordering hint"}</span></div><Link className={s.inlineLink} href={eventHref(workspace, event.event_id)}>{event.title}</Link><Text size="xs" tone="tertiary">{event.reported_time ? `Reported wording: ${event.reported_time}` : "Reported wording unavailable"}{links.length ? ` · ${links.length} explicit relationship${links.length === 1 ? "" : "s"}` : ""}</Text></article>;
      })}</div> : <Text size="sm" tone="tertiary">Record at least two events to compare their sequence.</Text>}
      {events.length > 1 ? <div className={s.details}><Text size="sm">Compare two events</Text><div className={s.row}><select aria-label="First event for temporal comparison" className={s.select} value={leftID} onChange={(event) => setLeftSelection(event.target.value)}>{events.map((event) => <option key={event.event_id} value={event.event_id}>{event.title}</option>)}</select><span className={s.muted}>against</span><select aria-label="Second event for temporal comparison" className={s.select} value={rightID} onChange={(event) => setRightSelection(event.target.value)}>{events.map((event) => <option key={event.event_id} value={event.event_id}>{event.title}</option>)}</select></div>{comparison ? <div className={s.stack}><Text size="sm">{comparison.order === "before" ? `${comparison.left.title} comes before ${comparison.right.title}` : comparison.order === "after" ? `${comparison.left.title} comes after ${comparison.right.title}` : comparison.order === "same_order_hint" ? "Both events share the same ordering-date hint." : "The two events cannot currently be ordered."}</Text><Text size="xs" tone="tertiary">Basis: {comparison.orderBasis === "ordering_date" ? "authored ordering date" : comparison.orderBasis === "explicit_relationship" ? "explicit event relationship" : "no comparable ordering data"}{comparison.relationship ? ` · ${relationshipKindLabels[comparison.relationship.kind]} (${comparison.relationship.state})` : ""}</Text>{comparison.relationship?.review_note ? <Text size="xs" tone="tertiary">Relationship review: {comparison.relationship.review_note}</Text> : null}</div> : <Text size="xs" tone="tertiary">Choose two different events.</Text>}</div> : null}
    </div>
  </Panel>;
}

function mergeRecords(primary: ResearchRecord[], additional: ResearchRecord[]) {
  const byID = new Map(primary.map((row) => [row.record_id, row]));
  for (const row of additional) if (!byID.has(row.record_id)) byID.set(row.record_id, row);
  return [...byID.values()];
}

function recordViewHref(workspace: string, record: string) {
  return `${investigationPath(workspace, "records")}?record=${encodeURIComponent(record)}`;
}

function EventCard({ event, active, evidence, records, workspace, shell, select }: { event: TimelineEvent; active: boolean; evidence: Evidence[]; records: ResearchRecord[]; workspace: string; shell?: ReturnType<typeof useContext>["shell"]; select: () => void }) {
  const recordNames = new Map(records.map((record) => [record.record_id, record.name]));
  const participantLinks = event.participant_links ?? (event.participant_record_ids ?? []).map((record_id) => ({ record_id, role: "associated" as const }));
  const participants = participantLinks.map((link) => ({ ...link, name: recordNames.get(link.record_id) ?? link.record_id }));
  const locationRecord = event.location_record_id ? recordNames.get(event.location_record_id) ?? event.location_record_id : undefined;
  const locationGeometry = event.location_record_id ? records.find((record) => record.record_id === event.location_record_id)?.place_geometry : undefined;
  return <article className={active ? `${s.eventCard} ${s.eventCardActive}` : s.eventCard}>
    <button type="button" className={s.eventCardSelect} onClick={select}>
      <span className={s.eventMeta}><Badge tone={event.time_precision === "unknown" ? "warn" : "neutral"}>{precisionLabels[event.time_precision]}</Badge>{event.sort_date ? <span className={s.muted}>Order hint · {event.sort_date}</span> : <span className={s.muted}>No ordering date</span>}<span className={s.muted}>{authorLabel(event.updated_by, shell)} · {dateLabel(event.updated_at)}</span></span>
      <strong className={s.eventTitle}>{event.title}</strong>
      {event.reported_time ? <span className={s.body}>Reported time: {event.reported_time}</span> : null}
      {event.location ? <span className={s.muted}>Location: {event.location}</span> : null}
      {event.description ? <span className={s.body}>{event.description}</span> : null}
    </button>
    {participants.length ? <span className={s.muted}>Participants: {participants.map((participant, index) => <span key={participant.record_id}>{index ? ", " : ""}<Link className={s.inlineLink} href={recordViewHref(workspace, participant.record_id)}>{participant.name}</Link> <span>({participantRoleLabels[participant.role]})</span></span>)}</span> : null}
    {locationRecord && event.location_record_id ? <span className={s.muted}>Place record: <Link className={s.inlineLink} href={recordViewHref(workspace, event.location_record_id)}>{locationRecord}</Link>{locationGeometry ? <> · {locationGeometry.latitude.toFixed(4)}, {locationGeometry.longitude.toFixed(4)} · <a className={s.inlineLink} href={openMapURL(locationGeometry.latitude, locationGeometry.longitude)} target="_blank" rel="noreferrer">map ↗</a></> : null}</span> : null}
    {event.observation_ids.length ? <span className={s.questionLinks}>{event.observation_ids.map((id) => { const found = evidence.find((one) => one.observation_id === id); return found ? <Link key={id} href={sourceHref(workspace, found.source_id, found.capture_id, found.observation_id, eventHref(workspace, event.event_id))} className={s.inlineLink}>{found.source_title}: {found.statement}</Link> : <span key={id} className={s.muted}>Citation {id.slice(0, 8)}…</span>; })}</span> : null}
  </article>;
}

function EventEditor({ workspace, event, evidence, evidenceError, evidenceHasNext, evidenceFetchingNext, fetchMoreEvidence, records, recordsError, recordsHasNext, recordsFetchingNext, fetchMoreRecords, history, historyError, accounts, accountsError, mayWrite, shell, saved }: { workspace: string; event?: TimelineEvent; evidence: Evidence[]; evidenceError: Error | null; evidenceHasNext: boolean; evidenceFetchingNext: boolean; fetchMoreEvidence: () => void; records: ResearchRecord[]; recordsError: Error | null; recordsHasNext: boolean; recordsFetchingNext: boolean; fetchMoreRecords: () => void; history: TimelineEventRevision[]; historyError: Error | null; accounts?: EventAccountPage; accountsError: Error | null; mayWrite: boolean; shell?: ReturnType<typeof useContext>["shell"]; saved: (event: TimelineEvent) => void }) {
  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [reportedTime, setReportedTime] = useState(event?.reported_time ?? "");
  const [precision, setPrecision] = useState<EventTimePrecision>(event?.time_precision ?? "unknown");
  const [sortDate, setSortDate] = useState(event?.sort_date ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [observationIds, setObservationIds] = useState<string[]>(event?.observation_ids ?? []);
  const [participantLinks, setParticipantLinks] = useState<EventParticipantLink[]>(() => event?.participant_links ?? (event?.participant_record_ids ?? []).map((record_id) => ({ record_id, role: "associated" })));
  const [locationRecordId, setLocationRecordId] = useState(event?.location_record_id ?? "");
  const body: WriteEvent = { title, description, reported_time: reportedTime, time_precision: precision, sort_date: sortDate, location, observation_ids: observationIds, participant_record_ids: participantLinks.map((link) => link.record_id), participant_links: participantLinks, ...(locationRecordId ? { location_record_id: locationRecordId } : {}) };
  const save = useResearchWrite(() => event ? updateEventAction(workspace, event.event_id, body) : createEventAction(workspace, body), [keys.events.all(workspace)], saved);
  if (!mayWrite) return event ? <><EventDetail event={event} evidence={evidence} records={records} workspace={workspace} shell={shell} error={evidenceError} /><EventHistory workspace={workspace} event={event} history={history} error={historyError} shell={shell} /><EventAccounts workspace={workspace} event={event} page={accounts} error={accountsError} evidence={evidence} mayWrite={false} /></> : <Text size="sm" tone="tertiary">This investigation is read-only. Existing events remain visible, but new events require write access.</Text>;
  return <div className={s.stack}><form className={s.eventEditor} onSubmit={(form) => { form.preventDefault(); save.mutate(); }}>
    <Field label="Event title" required>{(aria) => <Input {...aria} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="East Quay disruption" />}</Field>
    <Field label="What is being reconstructed?" hint="Keep this as a qualified account, not an unreviewed fact.">{(aria) => <Textarea {...aria} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Several reports may describe the same disruption." />}</Field>
    <Field label="Reported time" hint="Use the source accounts' wording, such as around 18:00 or late afternoon.">{(aria) => <Input {...aria} value={reportedTime} onChange={(event) => setReportedTime(event.target.value)} placeholder="around 18:00" disabled={precision === "unknown"} />}</Field>
    <Field label="Time precision" required>{(aria) => <select {...aria} className={s.select} value={precision} onChange={(event) => { const next = event.target.value as EventTimePrecision; setPrecision(next); if (next === "unknown") { setReportedTime(""); setSortDate(""); } }}>{Object.entries(precisionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}</Field>
    <Field label="Ordering date (optional)" hint="A YYYY-MM-DD hint for ordering only; it does not replace the reported wording.">{(aria) => <Input {...aria} type="date" value={sortDate} onChange={(event) => setSortDate(event.target.value)} disabled={precision === "unknown"} />}</Field>
    <Field label="Location (optional)">{(aria) => <Input {...aria} value={location} onChange={(event) => setLocation(event.target.value)} placeholder="East Quay" />}</Field>
    <RecordPicker label="Place record (optional)" value={locationRecordId} records={records.filter((record) => record.kind === "place")} onChange={setLocationRecordId} hasNext={recordsHasNext} fetchingNext={recordsFetchingNext} fetchMore={fetchMoreRecords} />
    <ParticipantPicker records={records} selected={participantLinks} setSelected={setParticipantLinks} hasNext={recordsHasNext} fetchingNext={recordsFetchingNext} fetchMore={fetchMoreRecords} />
    <Failure error={recordsError} />
    <CitationPicker workspace={workspace} label="Cited observations" selected={observationIds} evidence={evidence} setSelected={setObservationIds} error={evidenceError} max={8} hasNext={evidenceHasNext} fetchingNext={evidenceFetchingNext} fetchMore={fetchMoreEvidence} returnTo={eventHref(workspace, event?.event_id)} />
    <Failure error={save.error} />
    {save.isSuccess ? <Text size="sm" tone="accent" role="status">Event saved.</Text> : null}
    <div className={s.row}><Button type="submit" intent="primary" loading={save.isPending}>{event ? "Update event" : "Save event"}</Button>{event ? <><Text size="xs" tone="tertiary">Last updated by {authorLabel(event.updated_by, shell)}</Text><WorkingNoteLink workspace={workspace} context={{ kind: "event", id: event.event_id }} returnTo={eventHref(workspace, event.event_id)} body={`Follow up on reported event: ${event.title}\n\n${event.description ?? ""}\n\nNext steps: `} /></> : null}</div>
  </form>{event ? <><EventHistory workspace={workspace} event={event} history={history} error={historyError} shell={shell} /><EventAccounts workspace={workspace} event={event} page={accounts} error={accountsError} evidence={evidence} mayWrite /></> : null}</div>;
}

function EventAccounts({ workspace, event, page, error, evidence, mayWrite }: { workspace: string; event: TimelineEvent; page?: EventAccountPage; error: Error | null; evidence: Evidence[]; mayWrite: boolean }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reportedTime, setReportedTime] = useState("");
  const [precision, setPrecision] = useState<EventTimePrecision>("unknown");
  const [sortDate, setSortDate] = useState("");
  const [location, setLocation] = useState("");
  const [observationIds, setObservationIds] = useState<string[]>([]);
  const [decision, setDecision] = useState<EventReconciliationDecision>("unresolved");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [rationale, setRationale] = useState("");
  const body: WriteEventAccount = { title, description, reported_time: reportedTime, time_precision: precision, sort_date: sortDate, location, observation_ids: observationIds, participant_record_ids: [], participant_links: [] };
  const create = useResearchWrite(() => createEventAccountAction(workspace, event.event_id, body), [keys.events.accounts(workspace, event.event_id)], () => { setTitle(""); setDescription(""); setReportedTime(""); setPrecision("unknown"); setSortDate(""); setLocation(""); setObservationIds([]); });
  const reconcile = useResearchWrite(() => reconcileEventAccountsAction(workspace, event.event_id, { decision, ...(decision === "prefer_account" && selectedAccount ? { selected_account_id: selectedAccount } : {}), rationale }), [keys.events.accounts(workspace, event.event_id)], (saved) => { setDecision(saved.decision); setSelectedAccount(saved.selected_account_id ?? ""); });
  return <Panel title="Competing source accounts" note="Each account remains separate until an analyst records an explicit reconciliation.">
    <div className={s.stack}>
      <Text size="sm" tone="tertiary">The authored event above is a working reconstruction. Add source-specific accounts here when reports disagree; the system does not collapse them automatically.</Text>
      <Failure error={error} />
      {page?.reconciliation ? <Alert tone={page.reconciliation.decision === "unresolved" ? "warn" : "info"}><Text size="sm"><strong>Reconciliation: {page.reconciliation.decision.replaceAll("_", " ")}</strong>{page.reconciliation.selected_account_id ? ` · selected account ${page.reconciliation.selected_account_id.slice(0, 8)}…` : ""}</Text><Text size="xs" tone="tertiary">{page.reconciliation.rationale}</Text></Alert> : <Text size="xs" tone="tertiary">No reconciliation decision recorded yet.</Text>}
      <article className={s.observation}><div className={s.eventMeta}><Badge tone="neutral">Authored reconstruction</Badge><span className={s.muted}>Current event account</span></div><Text size="sm" className={s.eventTitle}>{event.title}</Text><Text size="sm" tone="tertiary">{event.description || "No description recorded."}</Text><Text size="xs" tone="tertiary">{event.reported_time || "Time unknown"}{event.location ? ` · ${event.location}` : ""} · {event.observation_ids.length} citation{event.observation_ids.length === 1 ? "" : "s"}</Text></article>
      {page?.items.length ? <div className={s.stack}><Text size="xs" tone="tertiary">Source accounts</Text>{page.items.map((account, index) => <article key={account.account_id} className={s.observation}><div className={s.eventMeta}><Badge tone="warn">Source account {index + 1}</Badge><span className={s.muted}>{account.time_precision} · {dateLabel(account.created_at)}</span></div><Text size="sm" className={s.eventTitle}>{account.title}</Text><Text size="sm" tone="tertiary">{account.description || "No description recorded."}</Text><Text size="xs" tone="tertiary">{account.reported_time || "Time unknown"}{account.location ? ` · ${account.location}` : ""} · {account.observation_ids.length} citation{account.observation_ids.length === 1 ? "" : "s"}</Text><CitationLinks ids={account.observation_ids} evidence={evidence} workspace={workspace} error={null} returnTo={eventHref(workspace, event.event_id)} /></article>)}</div> : <Text size="sm" tone="tertiary">No separate source accounts have been recorded.</Text>}
      {mayWrite ? <>
        <details className={s.details}><summary>Add a competing source account</summary><form className={s.stack} onSubmit={(form) => { form.preventDefault(); create.mutate(); }}>
          <Text size="xs" tone="tertiary">Copy the source’s account as reported. This does not update the authored event.</Text>
          <Field label="Account title" required>{(aria) => <Input {...aria} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Witness account" />}</Field>
          <Field label="What this account reports" required>{(aria) => <Textarea {...aria} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="The source describes…" />}</Field>
          <Field label="Reported time" hint="Use the source’s wording.">{(aria) => <Input {...aria} value={reportedTime} onChange={(event) => setReportedTime(event.target.value)} disabled={precision === "unknown"} placeholder="around 18:00" />}</Field>
          <Field label="Time precision" required>{(aria) => <select {...aria} className={s.select} value={precision} onChange={(event) => { const next = event.target.value as EventTimePrecision; setPrecision(next); if (next === "unknown") { setReportedTime(""); setSortDate(""); } }}>{Object.entries(precisionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}</Field>
          <Field label="Ordering date (optional)">{(aria) => <Input {...aria} type="date" value={sortDate} onChange={(event) => setSortDate(event.target.value)} disabled={precision === "unknown"} />}</Field>
          <Field label="Location (optional)">{(aria) => <Input {...aria} value={location} onChange={(event) => setLocation(event.target.value)} />}</Field>
          <CitationPicker workspace={workspace} label="Account citations" selected={observationIds} evidence={evidence} setSelected={setObservationIds} error={null} max={8} hasNext={false} fetchingNext={false} fetchMore={() => undefined} returnTo={eventHref(workspace, event.event_id)} />
          <Failure error={create.error} /><Button type="submit" intent="primary" loading={create.isPending}>Save source account</Button>
        </form></details>
        <div className={s.details}><Text size="sm">Record reconciliation</Text><Text size="xs" tone="tertiary">A reconciliation is an analyst decision about the accounts, not an automatic truth claim.</Text><Field label="Decision" required>{(aria) => <select {...aria} className={s.select} value={decision} onChange={(event) => setDecision(event.target.value as EventReconciliationDecision)}><option value="unresolved">Leave unresolved</option><option value="retain_event">Retain authored reconstruction</option><option value="prefer_account">Prefer one source account</option></select>}</Field>{decision === "prefer_account" ? <Field label="Preferred source account" required>{(aria) => <select {...aria} className={s.select} value={selectedAccount} onChange={(event) => setSelectedAccount(event.target.value)}><option value="">Choose an account</option>{(page?.items ?? []).map((account, index) => <option key={account.account_id} value={account.account_id}>Source account {index + 1} · {account.title}</option>)}</select>}</Field> : null}<Field label="Rationale" required hint="Explain what remains agreed, disputed, or unresolved.">{(aria) => <Textarea {...aria} rows={3} value={rationale} onChange={(event) => setRationale(event.target.value)} placeholder="The accounts agree on…, but differ on…" />}</Field><Failure error={reconcile.error} /><Button type="button" intent="secondary" loading={reconcile.isPending} disabled={decision === "prefer_account" && !selectedAccount || !rationale.trim()} onClick={() => reconcile.mutate()}>Save reconciliation</Button></div>
      </> : null}
    </div>
  </Panel>;
}

function EventHistory({ workspace, event, history, error, shell }: { workspace: string; event: TimelineEvent; history: TimelineEventRevision[]; error: Error | null; shell?: ReturnType<typeof useContext>["shell"] }) {
  return <section className={s.briefSection}><Text size="xs" tone="tertiary">Reported-event history</Text>{error ? <Failure error={error} /> : history.length ? <div className={s.stack}>{history.map((revision, index) => { const previous = history[index - 1]; return <article key={revision.revision_id} className={s.observation}><div className={s.eventMeta}><Text size="xs" tone="tertiary">Revision {revision.revision} · {dateLabel(revision.changed_at)}</Text><Text size="xs" tone="tertiary">Changed by {authorLabel(revision.changed_by, shell)}</Text></div><Text size="xs" tone="tertiary">Changed: {eventRevisionChanges(previous, revision).join(" · ")}</Text><Text size="sm" className={s.eventTitle}>{revision.title}</Text>{revision.reported_time ? <Text size="xs" tone="tertiary">Reported time: {revision.reported_time} · {revision.time_precision}</Text> : <Text size="xs" tone="tertiary">Reported time unknown</Text>}{revision.participant_records.length ? <Text size="xs" tone="tertiary">Participants at revision: {revision.participant_records.map((record) => record.name).join(", ")}</Text> : null}{revision.location_record ? <Text size="xs" tone="tertiary">Place record at revision: {revision.location_record.name}</Text> : null}<Button asChild type="button" size="sm" intent="ghost"><Link href={eventRevisionHref(workspace, event.event_id, revision.revision_id)}>Open immutable revision</Link></Button></article>; })}</div> : <Text size="sm" tone="tertiary">No event history is available.</Text>}</section>;
}

function eventRevisionChanges(previous: TimelineEventRevision | undefined, current: TimelineEventRevision) {
  if (!previous) return ["initial event account"];
  const changes: string[] = [];
  if (previous.title !== current.title) changes.push("title");
  if ((previous.description ?? "") !== (current.description ?? "")) changes.push("description");
  if ((previous.reported_time ?? "") !== (current.reported_time ?? "") || previous.time_precision !== current.time_precision) changes.push("reported time");
  if ((previous.sort_date ?? "") !== (current.sort_date ?? "")) changes.push("ordering date");
  if ((previous.location ?? "") !== (current.location ?? "")) changes.push("location");
  if (previous.observation_ids.join(",") !== current.observation_ids.join(",")) changes.push("citations");
  if (previous.participant_record_ids.join(",") !== current.participant_record_ids.join(",")) changes.push("participants");
  if (JSON.stringify(previous.participant_records) !== JSON.stringify(current.participant_records)) changes.push("participant context");
  if ((previous.location_record_id ?? "") !== (current.location_record_id ?? "")) changes.push("place record");
  if (JSON.stringify(previous.location_record) !== JSON.stringify(current.location_record)) changes.push("place context");
  return changes.length ? changes : ["metadata only"];
}

function EventDetail({ event, evidence, records, workspace, shell, error }: { event: TimelineEvent; evidence: Evidence[]; records: ResearchRecord[]; workspace: string; shell?: ReturnType<typeof useContext>["shell"]; error: Error | null }) {
  const recordNames = new Map(records.map((record) => [record.record_id, record.name]));
  const participantLinks = event.participant_links ?? (event.participant_record_ids ?? []).map((record_id) => ({ record_id, role: "associated" as const }));
  const participants = participantLinks.map((link) => ({ ...link, name: recordNames.get(link.record_id) ?? link.record_id }));
  const locationRecord = event.location_record_id ? records.find((record) => record.record_id === event.location_record_id) : undefined;
  return <div className={s.stack}><div className={s.eventMeta}><Badge tone={event.time_precision === "unknown" ? "warn" : "neutral"}>{precisionLabels[event.time_precision]}</Badge><span className={s.muted}>Updated by {authorLabel(event.updated_by, shell)} · {dateLabel(event.updated_at)}</span></div><Text size="sm" className={s.eventTitle}>{event.title}</Text>{event.reported_time ? <Text size="sm">Reported time: {event.reported_time}</Text> : <Text size="sm" tone="tertiary">Reported time unknown.</Text>}{event.location ? <Text size="sm">Location: {event.location}</Text> : null}{locationRecord && event.location_record_id ? <Text size="sm">Place record: <Link className={s.inlineLink} href={recordViewHref(workspace, event.location_record_id)}>{locationRecord.name}</Link>{locationRecord.place_geometry ? <> · {locationRecord.place_geometry.latitude.toFixed(5)}, {locationRecord.place_geometry.longitude.toFixed(5)} · <a className={s.inlineLink} href={openMapURL(locationRecord.place_geometry.latitude, locationRecord.place_geometry.longitude)} target="_blank" rel="noreferrer">Open map ↗</a></> : null}</Text> : null}{participants.length ? <Text size="sm">Participants: {participants.map((participant, index) => <span key={participant.record_id}>{index ? ", " : ""}<Link className={s.inlineLink} href={recordViewHref(workspace, participant.record_id)}>{participant.name}</Link> ({participantRoleLabels[participant.role]})</span>)}</Text> : null}{event.description ? <Text size="sm" tone="tertiary">{event.description}</Text> : null}<CitationLinks ids={event.observation_ids} evidence={evidence} workspace={workspace} error={error} returnTo={eventHref(workspace, event.event_id)} /></div>;
}

function openMapURL(latitude: number, longitude: number) {
  return `https://www.openstreetmap.org/?mlat=${encodeURIComponent(latitude)}&mlon=${encodeURIComponent(longitude)}#map=12/${encodeURIComponent(latitude)}/${encodeURIComponent(longitude)}`;
}

function ParticipantPicker({ records, selected, setSelected, hasNext, fetchingNext, fetchMore }: { records: ResearchRecord[]; selected: EventParticipantLink[]; setSelected: (links: EventParticipantLink[]) => void; hasNext: boolean; fetchingNext: boolean; fetchMore: () => void }) {
  const [filter, setFilter] = useState("");
  const visible = filterLoadedRows(records, filter, (record) => [record.record_id, record.name, record.description ?? "", record.kind]);
  return <div className={s.details}><Text size="sm">Participant records <span className={s.muted}>(optional, up to 8; roles are analyst-authored)</span></Text>{records.length ? <div className={s.stack}><Input aria-label="Filter participant records" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter loaded records" /><Text size="xs" tone="tertiary">Showing {visible.length} of {records.length} loaded record{records.length === 1 ? "" : "s"}.</Text><div className={s.checkboxList}>{visible.map((record) => { const link = selected.find((one) => one.record_id === record.record_id); const disabled = !link && selected.length >= 8; return <div key={record.record_id} className={s.checkboxLabel}><label><input type="checkbox" checked={Boolean(link)} disabled={disabled} onChange={() => setSelected(link ? selected.filter((one) => one.record_id !== record.record_id) : [...selected, { record_id: record.record_id, role: "associated" }])} /><span className={s.questionLinkText}>{record.name} <span className={s.muted}>({record.kind})</span></span></label>{link ? <select aria-label={`Role for ${record.name}`} className={s.select} value={link.role} onChange={(event) => setSelected(selected.map((one) => one.record_id === record.record_id ? { ...one, role: event.target.value as EventParticipantRole } : one))}>{Object.entries(participantRoleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select> : null}</div>; })}</div><MoreButton available={hasNext} pending={fetchingNext} load={fetchMore} /></div> : <Text size="xs" tone="tertiary">Create a research record first if this event needs a named participant.</Text>}</div>;
}

function CitationLinks({ title = "Cited observations", ids, evidence, workspace, error, returnTo }: { title?: string; ids: string[]; evidence: Evidence[]; workspace: string; error: Error | null; returnTo?: string }) {
  if (!ids.length) return <Text size="sm" tone="tertiary">No cited observations attached.</Text>;
  return <div className={s.stack}><Text size="xs" tone="tertiary">{title}</Text>{error ? <Failure error={error} /> : null}{ids.map((id) => { const found = evidence.find((one) => one.observation_id === id); if (!found) return <Text key={id} size="xs" tone="tertiary">Citation {id} could not be resolved.</Text>; return <article key={id} className={s.observation}><div className={s.eventMeta}><Link className={s.inlineLink} href={sourceHref(workspace, found.source_id, found.capture_id, found.observation_id, returnTo)}>{found.source_title}</Link><span className={s.muted}>Observation {found.observation_id}</span></div><Text size="sm" className={s.evidenceStatement}>{found.statement}</Text><blockquote className={s.quote}>{found.quote}</blockquote><Text size="xs" tone="tertiary">Capture {found.capture_id} · recorded {dateLabel(found.recorded_at)}</Text></article>; })}</div>;
}
