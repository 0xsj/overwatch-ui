"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Badge, Panel } from "@/components/display";
import { Button, Field, Input, Textarea } from "@/components/forms";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import { filterLoadedRows } from "@/lib/query/filter";
import type { Evidence } from "@/lib/services/review";
import type { EventTimePrecision, TimelineEvent, WriteEvent } from "@/lib/services/events";
import { eventHref } from "@/lib/services/events/navigation";
import { mayWriteResearch } from "../_route-context";
import { PageHead } from "../_components/page-head";
import { Query, useContext } from "../_hooks";
import { evidenceByIDsQuery, evidenceQuery, eventQuery, eventsQuery } from "../_queries";
import { createEventAction, updateEventAction } from "./_actions";
import { authorLabel, dateLabel, Failure, MoreButton, ObservationPicker as CitationPicker, sourceHref, useResearchWrite } from "./_shared";
import s from "./investigation.module.css";

const precisionLabels: Record<EventTimePrecision, string> = {
  unknown: "Unknown",
  exact: "Exact",
  approximate: "Approximate",
  range: "Range",
};

export function TimelineScreen({ workspace }: { workspace: string }) {
  const { shell } = useContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mayWrite = mayWriteResearch(shell?.context?.workspace);
  const events = useInfiniteQuery({ queryKey: keys.events.list(workspace), queryFn: ({ pageParam }) => eventsQuery(workspace, pageParam), initialPageParam: undefined as string | undefined, getNextPageParam: (page) => page.next_cursor ?? undefined });
  const evidence = useInfiniteQuery({ queryKey: keys.evidence.list(workspace), queryFn: ({ pageParam }) => evidenceQuery(workspace, pageParam), initialPageParam: undefined as string | undefined, getNextPageParam: (page) => page.next_cursor ?? undefined });
  const rows = (events.data?.pages.flatMap((page) => page.items) ?? []).slice().sort((left, right) => {
    if (left.sort_date && right.sort_date) return left.sort_date.localeCompare(right.sort_date) || left.created_at.localeCompare(right.created_at);
    if (left.sort_date) return -1;
    if (right.sort_date) return 1;
    return left.created_at.localeCompare(right.created_at);
  });
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
          {!rows.length ? <div className={s.empty}><Text size="sm">No reported events recorded yet.</Text><Text size="sm" tone="tertiary">Start from cited observations when several sources describe an occurrence worth reconstructing.</Text>{mayWrite ? <Button type="button" intent="primary" onClick={() => openEvent()}>Record an event</Button> : null}</div> : <div className={s.stack}><Input aria-label="Filter reported events" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter loaded events" /><Text size="xs" tone="tertiary">Showing {visibleRows.length} of {rows.length} loaded event{rows.length === 1 ? "" : "s"}.</Text>{visibleRows.length ? <div className={s.eventList}>{visibleRows.map((event) => <EventCard key={event.event_id} event={event} active={event.event_id === activeId} evidence={evidenceRows} workspace={workspace} shell={shell} select={() => openEvent(event.event_id)} />)}</div> : <Text size="sm" tone="tertiary">No loaded events match. Clear the filter or load more.</Text>}</div>}
          <MoreButton available={events.hasNextPage} pending={events.isFetchingNextPage} load={() => void events.fetchNextPage()} />
        </div>}</Query>
      </Panel>
      <Panel title={active ? "Review event" : targetedEventLoading ? "Loading event" : activeId ? "Selected event" : "Record an event"}>
        {targetedEventLoading ? <Text size="sm" tone="tertiary">Opening the selected event…</Text> : targetedEvent.error && !active ? <Failure error={targetedEvent.error} /> : <EventEditor key={active?.event_id ?? "new"} workspace={workspace} event={active} evidence={evidenceRows} evidenceError={evidenceError} evidenceHasNext={evidence.hasNextPage} evidenceFetchingNext={evidence.isFetchingNextPage} fetchMoreEvidence={() => void evidence.fetchNextPage()} mayWrite={mayWrite} shell={shell} saved={(saved) => openEvent(saved.event_id)} />}
      </Panel>
    </div>
  </>;
}

function mergeEvidence(primary: Evidence[], additional: Evidence[]) {
  const byID = new Map(primary.map((row) => [row.observation_id, row]));
  for (const row of additional) if (!byID.has(row.observation_id)) byID.set(row.observation_id, row);
  return [...byID.values()];
}

function EventCard({ event, active, evidence, workspace, shell, select }: { event: TimelineEvent; active: boolean; evidence: Evidence[]; workspace: string; shell?: ReturnType<typeof useContext>["shell"]; select: () => void }) {
  return <article className={active ? `${s.eventCard} ${s.eventCardActive}` : s.eventCard}>
    <button type="button" className={s.eventCardSelect} onClick={select}>
      <span className={s.eventMeta}><Badge tone={event.time_precision === "unknown" ? "warn" : "neutral"}>{precisionLabels[event.time_precision]}</Badge>{event.sort_date ? <span className={s.muted}>Order hint · {event.sort_date}</span> : <span className={s.muted}>No ordering date</span>}<span className={s.muted}>{authorLabel(event.updated_by, shell)} · {dateLabel(event.updated_at)}</span></span>
      <strong className={s.eventTitle}>{event.title}</strong>
      {event.reported_time ? <span className={s.body}>Reported time: {event.reported_time}</span> : null}
      {event.location ? <span className={s.muted}>Location: {event.location}</span> : null}
      {event.description ? <span className={s.body}>{event.description}</span> : null}
    </button>
    {event.observation_ids.length ? <span className={s.questionLinks}>{event.observation_ids.map((id) => { const found = evidence.find((one) => one.observation_id === id); return found ? <Link key={id} href={sourceHref(workspace, found.source_id, found.capture_id, found.observation_id, eventHref(workspace, event.event_id))} className={s.inlineLink}>{found.source_title}: {found.statement}</Link> : <span key={id} className={s.muted}>Citation {id.slice(0, 8)}…</span>; })}</span> : null}
  </article>;
}

function EventEditor({ workspace, event, evidence, evidenceError, evidenceHasNext, evidenceFetchingNext, fetchMoreEvidence, mayWrite, shell, saved }: { workspace: string; event?: TimelineEvent; evidence: Evidence[]; evidenceError: Error | null; evidenceHasNext: boolean; evidenceFetchingNext: boolean; fetchMoreEvidence: () => void; mayWrite: boolean; shell?: ReturnType<typeof useContext>["shell"]; saved: (event: TimelineEvent) => void }) {
  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [reportedTime, setReportedTime] = useState(event?.reported_time ?? "");
  const [precision, setPrecision] = useState<EventTimePrecision>(event?.time_precision ?? "unknown");
  const [sortDate, setSortDate] = useState(event?.sort_date ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [observationIds, setObservationIds] = useState<string[]>(event?.observation_ids ?? []);
  const body: WriteEvent = { title, description, reported_time: reportedTime, time_precision: precision, sort_date: sortDate, location, observation_ids: observationIds };
  const save = useResearchWrite(() => event ? updateEventAction(workspace, event.event_id, body) : createEventAction(workspace, body), [keys.events.all(workspace)], saved);
  if (!mayWrite) return event ? <EventDetail event={event} evidence={evidence} workspace={workspace} shell={shell} error={evidenceError} /> : <Text size="sm" tone="tertiary">This investigation is read-only. Existing events remain visible, but new events require write access.</Text>;
  return <form className={s.eventEditor} onSubmit={(form) => { form.preventDefault(); save.mutate(); }}>
    <Field label="Event title" required>{(aria) => <Input {...aria} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="East Quay disruption" />}</Field>
    <Field label="What is being reconstructed?" hint="Keep this as a qualified account, not an unreviewed fact.">{(aria) => <Textarea {...aria} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Several reports may describe the same disruption." />}</Field>
    <Field label="Reported time" hint="Use the source accounts' wording, such as around 18:00 or late afternoon.">{(aria) => <Input {...aria} value={reportedTime} onChange={(event) => setReportedTime(event.target.value)} placeholder="around 18:00" disabled={precision === "unknown"} />}</Field>
    <Field label="Time precision" required>{(aria) => <select {...aria} className={s.select} value={precision} onChange={(event) => { const next = event.target.value as EventTimePrecision; setPrecision(next); if (next === "unknown") { setReportedTime(""); setSortDate(""); } }}>{Object.entries(precisionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}</Field>
    <Field label="Ordering date (optional)" hint="A YYYY-MM-DD hint for ordering only; it does not replace the reported wording.">{(aria) => <Input {...aria} type="date" value={sortDate} onChange={(event) => setSortDate(event.target.value)} disabled={precision === "unknown"} />}</Field>
    <Field label="Location (optional)">{(aria) => <Input {...aria} value={location} onChange={(event) => setLocation(event.target.value)} placeholder="East Quay" />}</Field>
    <CitationPicker workspace={workspace} label="Cited observations" selected={observationIds} evidence={evidence} setSelected={setObservationIds} error={evidenceError} max={8} hasNext={evidenceHasNext} fetchingNext={evidenceFetchingNext} fetchMore={fetchMoreEvidence} returnTo={eventHref(workspace, event?.event_id)} />
    <Failure error={save.error} />
    {save.isSuccess ? <Text size="sm" tone="accent" role="status">Event saved.</Text> : null}
    <div className={s.row}><Button type="submit" intent="primary" loading={save.isPending}>{event ? "Update event" : "Save event"}</Button>{event ? <Text size="xs" tone="tertiary">Last updated by {authorLabel(event.updated_by, shell)}</Text> : null}</div>
  </form>;
}

function EventDetail({ event, evidence, workspace, shell, error }: { event: TimelineEvent; evidence: Evidence[]; workspace: string; shell?: ReturnType<typeof useContext>["shell"]; error: Error | null }) {
  return <div className={s.stack}><div className={s.eventMeta}><Badge tone={event.time_precision === "unknown" ? "warn" : "neutral"}>{precisionLabels[event.time_precision]}</Badge><span className={s.muted}>Updated by {authorLabel(event.updated_by, shell)} · {dateLabel(event.updated_at)}</span></div><Text size="sm" className={s.eventTitle}>{event.title}</Text>{event.reported_time ? <Text size="sm">Reported time: {event.reported_time}</Text> : <Text size="sm" tone="tertiary">Reported time unknown.</Text>}{event.location ? <Text size="sm">Location: {event.location}</Text> : null}{event.description ? <Text size="sm" tone="tertiary">{event.description}</Text> : null}<CitationLinks ids={event.observation_ids} evidence={evidence} workspace={workspace} error={error} returnTo={eventHref(workspace, event.event_id)} /></div>;
}

function CitationLinks({ ids, evidence, workspace, error, returnTo }: { ids: string[]; evidence: Evidence[]; workspace: string; error: Error | null; returnTo?: string }) {
  if (!ids.length) return <Text size="sm" tone="tertiary">No cited observations attached.</Text>;
  return <div className={s.stack}><Text size="xs" tone="tertiary">Cited observations</Text>{error ? <Failure error={error} /> : null}{ids.map((id) => { const found = evidence.find((one) => one.observation_id === id); if (!found) return <Text key={id} size="xs" tone="tertiary">Citation {id} could not be resolved.</Text>; return <article key={id} className={s.observation}><div className={s.eventMeta}><Link className={s.inlineLink} href={sourceHref(workspace, found.source_id, found.capture_id, found.observation_id, returnTo)}>{found.source_title}</Link><span className={s.muted}>Observation {found.observation_id}</span></div><Text size="sm" className={s.evidenceStatement}>{found.statement}</Text><blockquote className={s.quote}>{found.quote}</blockquote><Text size="xs" tone="tertiary">Capture {found.capture_id} · recorded {dateLabel(found.recorded_at)}</Text></article>; })}</div>;
}
