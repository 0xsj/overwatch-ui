"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Badge, Panel } from "@/components/display";
import { Button, Field, Input, Textarea } from "@/components/forms";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import { filterLoadedRows } from "@/lib/query/filter";
import type { Evidence } from "@/lib/services/review";
import type { ResearchRecord } from "@/lib/services/research-records";
import type { ResearchConnection, ResearchConnectionKind, ResearchConnectionReview, ResearchConnectionReviewFilter, ResearchConnectionRevision, ResearchConnectionState, WriteResearchConnection } from "@/lib/services/research-connections";
import type { ConnectionPrefill } from "@/lib/services/research-connections/navigation";
import { connectionRevisionChanges, connectionRevisionEvidenceChanges } from "@/lib/services/research-connections/history";
import { mayWriteResearch } from "../_route-context";
import { PageHead } from "../_components/page-head";
import { Query, useContext } from "../_hooks";
import { evidenceByIDsQuery, evidenceQuery, researchConnectionQuery, researchConnectionReviewsQuery, researchConnectionRevisionsQuery, researchConnectionsQuery, researchConnectionSummaryQuery, researchRecordsByIDsQuery, researchRecordsQuery } from "../_queries";
import { createResearchConnectionAction, createResearchConnectionReviewAction, updateResearchConnectionAction } from "./_actions";
import { authorLabel, dateLabel, Failure, investigationPath, MoreButton, ObservationPicker as CitationPicker, RecordPicker, sourceHref, useResearchWrite, WorkingNoteLink } from "./_shared";
import { ResearchGraph } from "./research-graph";
import s from "./investigation.module.css";

const kindLabels: Record<ResearchConnectionKind, string> = {
  associated_with: "Associated with",
  may_belong_to: "May belong to",
  mentions: "Mentions",
  concerns_same_event: "May concern the same event",
  located_at: "Located at",
  possible_same_subject: "Possible same subject",
};
const stateLabels: Record<ResearchConnectionState, string> = {
  proposed: "Proposed",
  accepted: "Accepted",
  rejected: "Rejected",
  deferred: "Deferred",
};
const connectionReviewFindingLabels: Record<ResearchConnectionReview["findings"][number]["kind"], string> = {
  support: "Support",
  opposition: "Opposition",
  alternative: "Alternative",
  discriminating_evidence: "Discriminating evidence",
};

function connectionStateFilter(raw: string | null): ResearchConnectionState | "" {
  return raw === "proposed" || raw === "accepted" || raw === "rejected" || raw === "deferred" ? raw : "";
}

function connectionReviewQueueFilter(raw: string | null): ResearchConnectionReviewFilter {
  return raw === "open" || raw === "conflicted" || raw === "uncited" ? raw : "";
}

function connectionPrefillFrom(searchParams: ReturnType<typeof useSearchParams>): ConnectionPrefill | undefined {
  const fromRecordId = searchParams.get("from_record") ?? "";
  const toRecordId = searchParams.get("to_record") ?? "";
  const kind = searchParams.get("kind");
  const state = searchParams.get("state");
  const rationale = searchParams.get("rationale") ?? "";
  if (!fromRecordId || !toRecordId || !kind || !Object.hasOwn(kindLabels, kind) || state !== "proposed" || !rationale) return undefined;
  return { fromRecordId, toRecordId, kind: kind as ResearchConnectionKind, rationale, supportingObservationIds: searchParams.getAll("supporting_observation") };
}

export function ConnectionsScreen({ workspace }: { workspace: string }) {
  const { shell } = useContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mayWrite = mayWriteResearch(shell?.context?.workspace);
  const requestedReturn = searchParams.get("return") ?? "";
  const returnTo = requestedReturn.startsWith(`/investigation/${encodeURIComponent(workspace)}/`) ? requestedReturn : "";
  const initialPrefill = connectionPrefillFrom(searchParams);
  const [usePrefill, setUsePrefill] = useState(Boolean(initialPrefill));
  const connectionState = connectionStateFilter(searchParams.get("state"));
  const connectionReview = connectionReviewQueueFilter(searchParams.get("review"));
  const connectionSummary = useQuery({
    queryKey: keys.connections.summary(workspace),
    queryFn: () => researchConnectionSummaryQuery(workspace),
    retry: false,
  });
  const connections = useInfiniteQuery({
    queryKey: keys.connections.list(workspace, connectionState, connectionReview),
    queryFn: ({ pageParam }) => researchConnectionsQuery(workspace, pageParam, connectionState, connectionReview),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });
  const records = useInfiniteQuery({
    queryKey: keys.records.list(workspace),
    queryFn: ({ pageParam }) => researchRecordsQuery(workspace, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });
  const evidence = useInfiniteQuery({
    queryKey: keys.evidence.list(workspace),
    queryFn: ({ pageParam }) => evidenceQuery(workspace, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });
  const connectionRows = connections.data?.pages.flatMap((page) => page.items) ?? [];
  const recordRows = records.data?.pages.flatMap((page) => page.items) ?? [];
  const listedEvidenceRows = evidence.data?.pages.flatMap((page) => page.items) ?? [];
  const mapHasMore = Boolean(records.hasNextPage || connections.hasNextPage);
  const mapLoading = records.isFetchingNextPage || connections.isFetchingNextPage;
  const [activeId, setActiveId] = useState<string | null>(() => searchParams.get("connection"));
  const targetedConnection = useQuery({
    queryKey: keys.connections.one(workspace, activeId ?? ""),
    queryFn: () => researchConnectionQuery(workspace, activeId!),
    enabled: Boolean(activeId) && !connectionRows.some((connection) => connection.connection_id === activeId),
    retry: false,
  });
  const active = connectionRows.find((connection) => connection.connection_id === activeId) ?? targetedConnection.data;
  const targetedConnectionLoading = Boolean(activeId && !active && targetedConnection.isPending);
  const targetedRecordIDs = [...new Set(active ? [active.from_record_id, active.to_record_id] : initialPrefill ? [initialPrefill.fromRecordId, initialPrefill.toRecordId] : [])];
  const needsTargetedRecords = targetedRecordIDs.some((id) => !recordRows.some((record) => record.record_id === id));
  const targetedRecords = useQuery({
    queryKey: keys.records.byIDs(workspace, targetedRecordIDs),
    queryFn: () => researchRecordsByIDsQuery(workspace, targetedRecordIDs),
    enabled: needsTargetedRecords,
    retry: false,
  });
  const editorRecordRows = mergeRecords(recordRows, targetedRecords.data ?? []);
  const graphConnectionRows = mergeConnections(connectionRows, active ? [active] : []);
  const [filter, setFilter] = useState("");
  const recordName = new Map(editorRecordRows.map((record) => [record.record_id, record.name]));
  const visibleConnections = filterLoadedRows(connectionRows, filter, (row) => [row.connection_id, row.from_record_id, row.to_record_id, recordName.get(row.from_record_id) ?? "", recordName.get(row.to_record_id) ?? "", row.kind, row.state, row.rationale]);
  const targetedRecordContextLoading = Boolean(needsTargetedRecords && targetedRecords.isPending);
  const targetedObservationIds = [...new Set(active ? [...active.supporting_observation_ids, ...active.opposing_observation_ids] : initialPrefill?.supportingObservationIds ?? [])];
  const targetedEvidence = useQuery({
    queryKey: keys.evidence.connectionEvidence(workspace, targetedObservationIds),
    queryFn: () => evidenceByIDsQuery(workspace, targetedObservationIds),
    enabled: targetedObservationIds.length > 0,
  });
  const evidenceRows = mergeEvidence(listedEvidenceRows, targetedEvidence.data ?? []);
  const evidenceError = evidence.isError ? evidence.error : targetedEvidence.isError ? targetedEvidence.error : null;
  const revisions = useQuery({
    queryKey: keys.connections.revisions(workspace, activeId ?? ""),
    queryFn: () => researchConnectionRevisionsQuery(workspace, activeId as string),
    enabled: Boolean(activeId),
  });
  const revisionRows = revisions.data?.items ?? [];
  const reviews = useInfiniteQuery({
    queryKey: keys.connections.reviews(workspace, activeId ?? ""),
    queryFn: ({ pageParam }) => researchConnectionReviewsQuery(workspace, activeId as string, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
    enabled: Boolean(activeId),
  });
  const reviewRows = reviews.data?.pages.flatMap((page) => page.items) ?? [];
  const reviewObservationIds = [...new Set(reviewRows.flatMap((row) => [...row.supporting_observation_ids, ...row.opposing_observation_ids]))];
  const reviewEvidence = useQuery({
    queryKey: keys.evidence.connectionEvidence(workspace, reviewObservationIds),
    queryFn: () => evidenceByIDsQuery(workspace, reviewObservationIds),
    enabled: reviewObservationIds.length > 0,
  });
  const allEvidenceError = evidenceError ?? (reviewEvidence.isError ? reviewEvidence.error : null);
  const allEvidenceRows = mergeEvidence(evidenceRows, reviewEvidence.data ?? []);

  const editorPrefill = usePrefill ? initialPrefill : undefined;
  const editorKey = active?.connection_id ?? `new:${editorPrefill?.fromRecordId ?? ""}:${editorPrefill?.toRecordId ?? ""}:${editorPrefill?.kind ?? ""}`;
  const openRecord = useCallback((record: string) => {
    router.push(`${investigationPath(workspace, "records")}?record=${encodeURIComponent(record)}`);
  }, [router, workspace]);
  const openConnection = useCallback((connection: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("connection", connection);
    router.push(`${investigationPath(workspace, "connections")}?${next}`);
  }, [router, searchParams, workspace]);
  const setConnectionFilter = (name: "state" | "review", value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(name, value); else next.delete(name);
    next.delete("before");
    const path = investigationPath(workspace, "connections");
    router.replace(`${path}${next.size ? `?${next}` : ""}`);
  };
  const saved = useCallback((connection: ResearchConnection) => {
    if (!active && returnTo) {
      router.push(returnTo);
      return;
    }
    setActiveId(connection.connection_id);
  }, [active, returnTo, router, setActiveId]);
  return <>
    <PageHead title="Connections" actions={<div className={s.row}>{returnTo ? <Link href={returnTo} className={s.back}>Back to handoff</Link> : null}{mayWrite ? <Button type="button" intent="primary" onClick={() => { setActiveId(null); setUsePrefill(false); }}>New connection</Button> : null}</div>}>
      Record how two research records may relate. Review state, rationale, and evidence for and against remain separate from identity resolution and real-world truth.
    </PageHead>
    <Panel title="Relationship review queue" note="Workspace-wide counts, independent of the current browse filters.">
      <Query of={connectionSummary} label="relationship review summary">{(summary) => <div className={s.stack}>
        <div className={s.row}><Badge tone="neutral">{summary.connection_count} connection{summary.connection_count === 1 ? "" : "s"}</Badge><Badge tone={summary.open_count ? "warn" : "neutral"}>{summary.open_count} open hypothesis{summary.open_count === 1 ? "" : "es"}</Badge><Badge tone={summary.conflicted_count ? "crit" : "neutral"}>{summary.conflicted_count} conflicting</Badge><Badge tone={summary.uncited_count ? "warn" : "accent"}>{summary.uncited_count} uncited</Badge></div>
        <Text size="xs" tone="tertiary">State mix: {summary.state_counts.proposed ?? 0} proposed · {summary.state_counts.accepted ?? 0} accepted · {summary.state_counts.deferred ?? 0} deferred · {summary.state_counts.rejected ?? 0} rejected. These are authored assessments, not automated truth claims.</Text>
      </div>}</Query>
    </Panel>
    <Panel title="Research map" note={`${editorRecordRows.length} records · ${graphConnectionRows.length} connections loaded${mapHasMore ? " · more available" : ""}`} actions={mapHasMore ? <Button type="button" size="sm" intent="ghost" loading={mapLoading} onClick={() => { if (records.hasNextPage) void records.fetchNextPage(); if (connections.hasNextPage) void connections.fetchNextPage(); }}>{mapLoading ? "Loading map data…" : "Load more into map"}</Button> : undefined}>
      <ResearchGraph records={editorRecordRows} connections={graphConnectionRows} complete={!mapHasMore} onSelectRecord={openRecord} onSelectConnection={openConnection} />
    </Panel>
    <div className={s.columns}>
      <Panel title="Qualified connections" note={connectionRows.length ? `${connectionRows.length} loaded${connectionState || connectionReview ? " matching" : ""}` : undefined}>
        <Query of={connections} label="qualified connections">{() => <div className={s.stack}>
          <div className={s.row}>
            <label className={s.row}><Text as="span" size="sm">State</Text><select aria-label="Filter connections by state" className={s.select} value={connectionState} onChange={(event) => setConnectionFilter("state", event.target.value)}><option value="">All states</option>{(Object.keys(stateLabels) as ResearchConnectionState[]).map((state) => <option key={state} value={state}>{stateLabels[state]}</option>)}</select></label>
            <label className={s.row}><Text as="span" size="sm">Queue</Text><select aria-label="Filter connections by review queue" className={s.select} value={connectionReview} onChange={(event) => setConnectionFilter("review", event.target.value)}><option value="">All review queues</option><option value="open">Open hypotheses</option><option value="conflicted">Conflicting evidence</option><option value="uncited">Uncited relationships</option></select></label>
            <Input aria-label="Filter loaded connections" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter loaded connections" />
          </div>
          {!connectionRows.length ? (
            <div className={s.empty}>
              <Text size="sm">{connectionState || connectionReview ? "No connections match these filters." : "No connections recorded yet."}</Text>
              <Text size="sm" tone="tertiary">{connectionState || connectionReview ? "Try another queue or clear the browse filters." : "Create a proposed relationship when the material gives you a lead worth reviewing, not a reason to merge records."}</Text>
              {!connectionState && !connectionReview && mayWrite ? <Button type="button" intent="primary" onClick={() => { setActiveId(null); setUsePrefill(false); }}>Record a connection</Button> : null}
            </div>
          ) : <div className={s.stack}><Text size="xs" tone="tertiary">Showing {visibleConnections.length} of {connectionRows.length} loaded connection{connectionRows.length === 1 ? "" : "s"}.</Text>{visibleConnections.length ? <div className={s.eventList}>{visibleConnections.map((connection) => <ConnectionCard key={connection.connection_id} connection={connection} active={connection.connection_id === activeId} records={editorRecordRows} shell={shell} select={() => setActiveId(connection.connection_id)} />)}</div> : <Text size="sm" tone="tertiary">No loaded connections match the text filter. Clear it or load more.</Text>}</div>}
          <MoreButton available={connections.hasNextPage} pending={connections.isFetchingNextPage} load={() => void connections.fetchNextPage()} />
        </div>}</Query>
      </Panel>
      <Panel title={active ? "Review connection" : targetedConnectionLoading ? "Loading connection" : editorPrefill ? "Review proposed connection" : "Record a connection"}>
        {targetedConnectionLoading ? <Text size="sm" tone="tertiary">Opening the selected connection…</Text> : targetedConnection.error && !active ? <Failure error={targetedConnection.error} /> : targetedRecordContextLoading ? <Text size="sm" tone="tertiary">Loading endpoint records…</Text> : targetedRecords.error ? <Failure error={targetedRecords.error} /> : <ConnectionEditor key={editorKey} workspace={workspace} connection={active} initialPrefill={editorPrefill} records={editorRecordRows} recordsHasNext={records.hasNextPage} recordsFetchingNext={records.isFetchingNextPage} fetchMoreRecords={() => void records.fetchNextPage()} evidence={allEvidenceRows} evidenceError={allEvidenceError} evidenceHasNext={evidence.hasNextPage} evidenceFetchingNext={evidence.isFetchingNextPage} fetchMoreEvidence={() => void evidence.fetchNextPage()} revisions={revisionRows} revisionsError={revisions.isError ? revisions.error : null} reviews={reviewRows} reviewsError={reviews.isError ? reviews.error : null} reviewsHasNext={Boolean(reviews.hasNextPage)} reviewsFetchingNext={reviews.isFetchingNextPage} fetchMoreReviews={() => void reviews.fetchNextPage()} mayWrite={mayWrite} shell={shell} saved={saved} />}
      </Panel>
    </div>
  </>;
}

function mergeEvidence(primary: Evidence[], additional: Evidence[]) {
  const byID = new Map(primary.map((row) => [row.observation_id, row]));
  for (const row of additional) if (!byID.has(row.observation_id)) byID.set(row.observation_id, row);
  return [...byID.values()];
}

function mergeRecords(primary: ResearchRecord[], additional: ResearchRecord[]) {
  const byID = new Map(primary.map((row) => [row.record_id, row]));
  for (const row of additional) if (!byID.has(row.record_id)) byID.set(row.record_id, row);
  return [...byID.values()];
}

function mergeConnections(primary: ResearchConnection[], additional: ResearchConnection[]) {
  const byID = new Map(primary.map((row) => [row.connection_id, row]));
  for (const row of additional) if (!byID.has(row.connection_id)) byID.set(row.connection_id, row);
  return [...byID.values()];
}

function ConnectionCard({ connection, active, records, shell, select }: { connection: ResearchConnection; active: boolean; records: ResearchRecord[]; shell?: ReturnType<typeof useContext>["shell"]; select: () => void }) {
  const from = records.find((record) => record.record_id === connection.from_record_id);
  const to = records.find((record) => record.record_id === connection.to_record_id);
  return <article className={active ? s.eventCard + " " + s.eventCardActive : s.eventCard}>
    <button type="button" className={s.eventCardSelect} onClick={select}>
      <span className={s.eventMeta}><Badge tone={connection.state === "accepted" ? "accent" : connection.state === "rejected" ? "neutral" : "warn"}>{stateLabels[connection.state]}</Badge><span className={s.muted}>{authorLabel(connection.updated_by, shell)} · {dateLabel(connection.updated_at)}</span></span>
      <strong className={s.eventTitle}>{from?.name ?? ("Record " + connection.from_record_id.slice(0, 8) + "…")} <span className={s.muted}>→</span> {to?.name ?? ("Record " + connection.to_record_id.slice(0, 8) + "…")}</strong>
      <span className={s.muted}>{kindLabels[connection.kind]}</span>
      <span className={s.body}>{connection.rationale}</span>
      <span className={s.muted}>{connection.supporting_observation_ids.length} supporting · {connection.opposing_observation_ids.length} opposing observations</span>
    </button>
  </article>;
}

function ConnectionEditor({ workspace, connection, initialPrefill, records, recordsHasNext, recordsFetchingNext, fetchMoreRecords, evidence, evidenceError, evidenceHasNext, evidenceFetchingNext, fetchMoreEvidence, revisions, revisionsError, reviews, reviewsError, reviewsHasNext, reviewsFetchingNext, fetchMoreReviews, mayWrite, shell, saved }: { workspace: string; connection?: ResearchConnection; initialPrefill?: ConnectionPrefill; records: ResearchRecord[]; recordsHasNext: boolean; recordsFetchingNext: boolean; fetchMoreRecords: () => void; evidence: Evidence[]; evidenceError: Error | null; evidenceHasNext: boolean; evidenceFetchingNext: boolean; fetchMoreEvidence: () => void; revisions: ResearchConnectionRevision[]; revisionsError: Error | null; reviews: ResearchConnectionReview[]; reviewsError: Error | null; reviewsHasNext: boolean; reviewsFetchingNext: boolean; fetchMoreReviews: () => void; mayWrite: boolean; shell?: ReturnType<typeof useContext>["shell"]; saved: (connection: ResearchConnection) => void }) {
  const [fromRecordId, setFromRecordId] = useState(connection?.from_record_id ?? initialPrefill?.fromRecordId ?? "");
  const [toRecordId, setToRecordId] = useState(connection?.to_record_id ?? initialPrefill?.toRecordId ?? "");
  const [kind, setKind] = useState<ResearchConnectionKind>(connection?.kind ?? initialPrefill?.kind ?? "associated_with");
  const [state, setState] = useState<ResearchConnectionState>(connection?.state ?? "proposed");
  const [rationale, setRationale] = useState(connection?.rationale ?? initialPrefill?.rationale ?? "");
  const [supportingObservationIds, setSupportingObservationIds] = useState<string[]>(connection?.supporting_observation_ids ?? initialPrefill?.supportingObservationIds ?? []);
  const [opposingObservationIds, setOpposingObservationIds] = useState<string[]>(connection?.opposing_observation_ids ?? []);
  const body: WriteResearchConnection = { from_record_id: fromRecordId, to_record_id: toRecordId, kind, state, rationale, supporting_observation_ids: supportingObservationIds, opposing_observation_ids: opposingObservationIds };
  const save = useResearchWrite(() => connection ? updateResearchConnectionAction(workspace, connection.connection_id, body) : createResearchConnectionAction(workspace, body), [keys.connections.all(workspace)], saved);
  const fromName = records.find((record) => record.record_id === (connection?.from_record_id ?? fromRecordId))?.name ?? (connection?.from_record_id ?? fromRecordId);
  const toName = records.find((record) => record.record_id === (connection?.to_record_id ?? toRecordId))?.name ?? (connection?.to_record_id ?? toRecordId);

  if (!mayWrite) return connection ? <div className={s.stack}><ConnectionDetail connection={connection} records={records} evidence={evidence} workspace={workspace} shell={shell} error={evidenceError} /><RevisionHistory rows={revisions} evidence={evidence} workspace={workspace} error={revisionsError} shell={shell} /><ConnectionReviewPanel workspace={workspace} connection={connection} reviews={reviews} reviewsError={reviewsError} reviewsHasNext={reviewsHasNext} reviewsFetchingNext={reviewsFetchingNext} fetchMoreReviews={fetchMoreReviews} mayWrite={false} evidence={evidence} evidenceError={evidenceError} /></div> : <Text size="sm" tone="tertiary">This investigation is read-only. Existing connections remain visible, but new assessments require write access.</Text>;

  return <div className={s.stack}><form className={s.eventEditor} onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
    <RecordPicker label="From record" value={fromRecordId} records={records} onChange={setFromRecordId} hasNext={recordsHasNext} fetchingNext={recordsFetchingNext} fetchMore={fetchMoreRecords} disabled={Boolean(connection)} />
    <RecordPicker label="To record" value={toRecordId} records={records} onChange={setToRecordId} hasNext={recordsHasNext} fetchingNext={recordsFetchingNext} fetchMore={fetchMoreRecords} disabled={Boolean(connection)} />
    <Field label="Relationship" required>{(aria) => <select {...aria} className={s.select} value={kind} onChange={(event) => setKind(event.target.value as ResearchConnectionKind)}>{Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}</Field>
    <Field label="Review state" hint="This is the investigation&apos;s assessment, not a certification of reality." required>{(aria) => <select {...aria} className={s.select} value={state} onChange={(event) => setState(event.target.value as ResearchConnectionState)}>{Object.entries(stateLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}</Field>
    <Field label="Rationale" hint="Explain why this relationship is worth considering and what remains uncertain." required>{(aria) => <Textarea {...aria} rows={5} value={rationale} onChange={(event) => setRationale(event.target.value)} placeholder="The same distinctive handle appears in both records, but control is not established." />}</Field>
    <CitationPicker workspace={workspace} label="Supporting observations" selected={supportingObservationIds} evidence={evidence} setSelected={setSupportingObservationIds} error={evidenceError} max={12} other={opposingObservationIds} hasNext={evidenceHasNext} fetchingNext={evidenceFetchingNext} fetchMore={fetchMoreEvidence} returnTo={investigationPath(workspace, "connections")} />
    <CitationPicker workspace={workspace} label="Opposing observations" selected={opposingObservationIds} evidence={evidence} setSelected={setOpposingObservationIds} error={evidenceError} max={12} other={supportingObservationIds} hasNext={evidenceHasNext} fetchingNext={evidenceFetchingNext} fetchMore={fetchMoreEvidence} returnTo={investigationPath(workspace, "connections")} />
    <Failure error={save.error} />
    {save.isSuccess ? <Text size="sm" tone="accent" role="status">Connection saved.</Text> : null}
    <div className={s.row}><Button type="submit" intent="primary" loading={save.isPending}>{connection ? "Update connection" : "Save connection"}</Button>{connection ? <><Text size="xs" tone="tertiary">Last updated by {authorLabel(connection.updated_by, shell)}</Text><WorkingNoteLink workspace={workspace} context={{ kind: "connection", id: connection.connection_id }} returnTo={`${investigationPath(workspace, "connections")}?connection=${encodeURIComponent(connection.connection_id)}`} body={`Follow up on research connection: ${fromName} → ${toName}\n\n${connection.rationale}\n\nNext steps: `} /></> : null}</div>
  </form>{connection ? <RevisionHistory rows={revisions} evidence={evidence} workspace={workspace} error={revisionsError} shell={shell} /> : null}{connection ? <ConnectionReviewPanel workspace={workspace} connection={connection} reviews={reviews} reviewsError={reviewsError} reviewsHasNext={reviewsHasNext} reviewsFetchingNext={reviewsFetchingNext} fetchMoreReviews={fetchMoreReviews} mayWrite={mayWrite} evidence={evidence} evidenceError={evidenceError} /> : null}</div>;
}

function ConnectionDetail({ connection, records, evidence, workspace, shell, error }: { connection: ResearchConnection; records: ResearchRecord[]; evidence: Evidence[]; workspace: string; shell?: ReturnType<typeof useContext>["shell"]; error: Error | null }) {
  const from = records.find((record) => record.record_id === connection.from_record_id);
  const to = records.find((record) => record.record_id === connection.to_record_id);
  const returnTo = `${investigationPath(workspace, "connections")}?connection=${encodeURIComponent(connection.connection_id)}`;
  return <div className={s.stack}>
    <div className={s.eventMeta}><Badge tone={connection.state === "accepted" ? "accent" : connection.state === "rejected" ? "neutral" : "warn"}>{stateLabels[connection.state]}</Badge><span className={s.muted}>Updated by {authorLabel(connection.updated_by, shell)} · {dateLabel(connection.updated_at)}</span></div>
    <Text size="sm" className={s.eventTitle}>{from?.name ?? connection.from_record_id} <span className={s.muted}>→</span> {to?.name ?? connection.to_record_id}</Text>
    <Text size="xs" tone="tertiary">{kindLabels[connection.kind]}</Text>
    <Text size="sm">{connection.rationale}</Text>
    <CitationLinks title="Supporting observations" ids={connection.supporting_observation_ids} evidence={evidence} workspace={workspace} error={error} returnTo={returnTo} />
    <CitationLinks title="Opposing observations" ids={connection.opposing_observation_ids} evidence={evidence} workspace={workspace} error={error} returnTo={returnTo} />
  </div>;
}

function RevisionHistory({ rows, evidence, workspace, error, shell }: { rows: ResearchConnectionRevision[]; evidence: Evidence[]; workspace: string; error: Error | null; shell?: ReturnType<typeof useContext>["shell"] }) {
  const observationIDs = [...new Set(rows.flatMap((row) => [...row.supporting_observation_ids, ...row.opposing_observation_ids]))];
  const historyEvidence = useQuery({
    queryKey: keys.evidence.connectionHistoryEvidence(workspace, rows[0]?.connection_id ?? "", observationIDs),
    queryFn: () => evidenceByIDsQuery(workspace, observationIDs),
    enabled: observationIDs.length > 0,
  });
  const historyEvidenceRows = mergeEvidence(evidence, historyEvidence.data ?? []);
  return <section className={s.briefSection}><Text size="xs" tone="tertiary">Assessment history</Text>{error ? <Failure error={error} /> : rows.length ? <div className={s.stack}>{rows.map((row, index) => { const previous = rows[index - 1]; return <article key={row.revision_id} className={s.observation}><div className={s.eventMeta}><Text size="xs" tone="tertiary">Revision {row.revision} · {stateLabels[row.state]} · {dateLabel(row.changed_at)}</Text><Text size="xs" tone="tertiary">Changed by {authorLabel(row.changed_by, shell)}</Text></div><Text size="xs" tone="tertiary">Changed: {connectionRevisionChanges(previous, row).join(" · ")}</Text><Text size="sm">{row.rationale}</Text><Text size="xs" tone="tertiary">{row.supporting_observation_ids.length} supporting · {row.opposing_observation_ids.length} opposing observations</Text>{previous ? <RevisionEvidenceDiff previous={previous} current={row} evidence={historyEvidenceRows} workspace={workspace} evidenceError={historyEvidence.isError ? historyEvidence.error : null} /> : null}<div className={s.row}><Button asChild type="button" size="sm" intent="ghost"><Link href={investigationPath(workspace, `connections/${encodeURIComponent(row.connection_id)}/revisions/${encodeURIComponent(row.revision_id)}`)}>Open revision</Link></Button></div></article>; })}</div> : <Text size="sm" tone="tertiary">No assessment history recorded yet.</Text>}</section>;
}

function RevisionEvidenceDiff({ previous, current, evidence, workspace, evidenceError }: { previous: ResearchConnectionRevision; current: ResearchConnectionRevision; evidence: Evidence[]; workspace: string; evidenceError: Error | null }) {
  const changes = connectionRevisionEvidenceChanges(previous, current);
  const removed = changes.supportingRemoved.length || changes.opposingRemoved.length;
  const added = changes.supportingAdded.length || changes.opposingAdded.length;
  if (!removed && !added) return null;
  return <div className={s.details}><Text size="xs" tone="tertiary">Evidence movement since revision {previous.revision}</Text><div className={s.snapshotCompareColumns}><div><Text size="xs" tone="tertiary">Removed</Text><CitationLinks title="Supporting" ids={changes.supportingRemoved} evidence={evidence} workspace={workspace} error={evidenceError} /><CitationLinks title="Opposing" ids={changes.opposingRemoved} evidence={evidence} workspace={workspace} error={evidenceError} /></div><div><Text size="xs" tone="tertiary">Added</Text><CitationLinks title="Supporting" ids={changes.supportingAdded} evidence={evidence} workspace={workspace} error={evidenceError} /><CitationLinks title="Opposing" ids={changes.opposingAdded} evidence={evidence} workspace={workspace} error={evidenceError} /></div></div></div>;
}

function ConnectionReviewPanel({ workspace, connection, reviews, reviewsError, reviewsHasNext, reviewsFetchingNext, fetchMoreReviews, mayWrite, evidence, evidenceError }: { workspace: string; connection: ResearchConnection; reviews: ResearchConnectionReview[]; reviewsError: Error | null; reviewsHasNext: boolean; reviewsFetchingNext: boolean; fetchMoreReviews: () => void; mayWrite: boolean; evidence: Evidence[]; evidenceError: Error | null }) {
  const [selectedID, setSelectedID] = useState("");
  const selected = reviews.find((review) => review.connection_review_id === selectedID) ?? reviews[0];
  const run = useResearchWrite(() => createResearchConnectionReviewAction(workspace, connection.connection_id), [keys.connections.reviews(workspace, connection.connection_id)], (review) => setSelectedID(review.connection_review_id));
  const canRun = connection.supporting_observation_ids.length > 0 || connection.opposing_observation_ids.length > 0;
  const returnTo = `${investigationPath(workspace, "connections")}?connection=${encodeURIComponent(connection.connection_id)}`;
  return <section className={s.briefSection}>
    <div className={s.row}><Text size="xs" tone="tertiary">Assisted connection review</Text>{reviews.length ? <Badge tone="neutral">{reviews.length} saved</Badge> : null}</div>
    <Text size="sm" tone="tertiary">A bounded proposal over the authored relationship and its attached citations. It does not change the connection or assert identity, causality, or truth.</Text>
    <Failure error={reviewsError ?? run.error} />
    {reviews.length ? <label className={s.row}><Text as="span" size="sm">Saved review</Text><select aria-label="Saved assisted connection review" className={s.select} value={selected?.connection_review_id ?? ""} onChange={(event) => setSelectedID(event.target.value)}>{reviews.map((review) => <option key={review.connection_review_id} value={review.connection_review_id}>{dateLabel(review.created_at)} · {review.findings.length} finding{review.findings.length === 1 ? "" : "s"}</option>)}</select></label> : null}
    {mayWrite ? <form onSubmit={(event) => { event.preventDefault(); run.mutate(); }}><Button type="submit" intent="primary" loading={run.isPending} disabled={!canRun}>{selected ? "Run another assisted review" : "Run assisted connection review"}</Button>{!canRun ? <Text size="xs" tone="tertiary">Attach at least one supporting or opposing observation first.</Text> : null}</form> : <Text size="xs" tone="tertiary">This investigation is read-only. Saved proposals remain visible, but new runs require write access.</Text>}
    {selected ? <div className={s.stack}><div className={s.eventMeta}><Text size="xs" tone="tertiary">{selected.provider} · {selected.method} · {dateLabel(selected.created_at)}</Text><Text size="xs" tone="tertiary">{selected.supporting_observation_ids.length} supporting · {selected.opposing_observation_ids.length} opposing citations</Text></div><Text size="sm" className={s.body}>{selected.output}</Text><div className={s.details}><Text size="sm">Structured findings</Text><div className={s.stack}>{selected.findings.map((finding, index) => <article key={`${finding.kind}:${index}`} className={s.observation}><div className={s.row}><Badge tone={finding.kind === "opposition" ? "crit" : finding.kind === "discriminating_evidence" ? "warn" : "neutral"}>{connectionReviewFindingLabels[finding.kind]}</Badge></div><Text size="sm">{finding.summary}</Text><CitationLinks title="Exact citations" ids={finding.observation_ids} evidence={evidence} workspace={workspace} error={evidenceError} returnTo={returnTo} /></article>)}</div></div></div> : <Text size="sm" tone="tertiary">No assisted review has been run for this connection.</Text>}
    <MoreButton available={reviewsHasNext} pending={reviewsFetchingNext} load={fetchMoreReviews} />
  </section>;
}

function CitationLinks({ title, ids, evidence, workspace, error, returnTo }: { title: string; ids: string[]; evidence: Evidence[]; workspace: string; error: Error | null; returnTo?: string }) {
  return <div className={s.details}><Text size="xs" tone="tertiary">{title}</Text>{error ? <Failure error={error} /> : ids.length ? ids.map((id) => {
    const found = evidence.find((one) => one.observation_id === id);
    return found ? <Link key={id} className={s.inlineLink} href={sourceHref(workspace, found.source_id, found.capture_id, found.observation_id, returnTo)}>{found.source_title}: {found.statement}</Link> : <Text key={id} size="xs" tone="tertiary">Citation {id}</Text>;
  }) : <Text size="sm" tone="tertiary">None attached.</Text>}</div>;
}
