"use client";

import Link from "next/link";
import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Panel } from "@/components/display";
import { Button, Field, Input, Textarea } from "@/components/forms";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import type { BriefDraft, BriefDraftChange, BriefSnapshot, WorkingBrief, WriteBrief } from "@/lib/services/brief";
import { snapshotConnectionChanges, snapshotConnectionEvidenceChanges, snapshotConnectionRecordObservationChanges, snapshotQuestionObservationChanges } from "@/lib/services/brief/history";
import { downloadBriefSnapshotMarkdown, snapshotEvidenceIds } from "@/lib/services/brief/export";
import { filterBriefPickerRows, unresolvedBriefPickerIDs } from "@/lib/services/brief/picker";
import { clusterCoverage } from "@/lib/services/review/coverage";
import type { Evidence, EvidenceCluster, EvidenceRelation } from "@/lib/services/review";
import type { InvestigationQuestion } from "@/lib/services/questions";
import type { ResearchConnection } from "@/lib/services/research-connections";
import type { ResearchRecord } from "@/lib/services/research-records";
import type { TimelineEvent } from "@/lib/services/events";
import { eventRevisionHref } from "@/lib/services/events/navigation";
import { mayWriteResearch } from "../_route-context";
import { PageHead } from "../_components/page-head";
import { useContext, Query } from "../_hooks";
import { briefDraftsQuery, briefQuery, briefSnapshotsQuery, evidenceByIDsQuery, evidenceQuery, evidenceClustersQuery, evidenceRelationsQuery, eventsByIDsQuery, eventsQuery, questionsByIDsQuery, questionsQuery, researchConnectionsByIDsQuery, researchConnectionsQuery, researchRecordsByIDsQuery, researchRecordsQuery } from "../_queries";
import { createBriefDraftAction, freezeBriefAction, hydrateEvidenceAction, saveBriefAction } from "./_actions";
import { authorLabel, dateLabel, Failure, investigationPath, MoreButton, sourceHref, useResearchWrite, WorkingNoteLink } from "./_shared";
import s from "./investigation.module.css";

export function BriefScreen({ workspace }: { workspace: string }) {
  const { shell } = useContext();
  const mayWrite = mayWriteResearch(shell?.context?.workspace);
  const brief = useQuery({ queryKey: keys.brief.one(workspace), queryFn: () => briefQuery(workspace) });
  const evidence = useInfiniteQuery({ queryKey: keys.evidence.list(workspace), queryFn: ({ pageParam }) => evidenceQuery(workspace, pageParam), initialPageParam: undefined as string | undefined, getNextPageParam: (page) => page.next_cursor ?? undefined });
  const clusters = useInfiniteQuery({ queryKey: keys.evidence.clusters(workspace), queryFn: ({ pageParam }) => evidenceClustersQuery(workspace, pageParam), initialPageParam: undefined as string | undefined, getNextPageParam: (page) => page.next_cursor ?? undefined });
  const relations = useInfiniteQuery({ queryKey: keys.evidence.relations(workspace), queryFn: ({ pageParam }) => evidenceRelationsQuery(workspace, pageParam), initialPageParam: undefined as string | undefined, getNextPageParam: (page) => page.next_cursor ?? undefined });
  const questions = useInfiniteQuery({ queryKey: keys.questions.list(workspace), queryFn: ({ pageParam }) => questionsQuery(workspace, pageParam), initialPageParam: undefined as string | undefined, getNextPageParam: (page) => page.next_cursor ?? undefined });
  const connections = useInfiniteQuery({ queryKey: keys.connections.list(workspace), queryFn: ({ pageParam }) => researchConnectionsQuery(workspace, pageParam), initialPageParam: undefined as string | undefined, getNextPageParam: (page) => page.next_cursor ?? undefined });
  const records = useInfiniteQuery({ queryKey: keys.records.list(workspace), queryFn: ({ pageParam }) => researchRecordsQuery(workspace, pageParam), initialPageParam: undefined as string | undefined, getNextPageParam: (page) => page.next_cursor ?? undefined });
  const events = useInfiniteQuery({ queryKey: keys.events.list(workspace), queryFn: ({ pageParam }) => eventsQuery(workspace, pageParam), initialPageParam: undefined as string | undefined, getNextPageParam: (page) => page.next_cursor ?? undefined });
  const snapshots = useInfiniteQuery({ queryKey: keys.brief.snapshots(workspace), queryFn: ({ pageParam }) => briefSnapshotsQuery(workspace, pageParam), initialPageParam: undefined as string | undefined, getNextPageParam: (page) => page.next_cursor ?? undefined });
  const drafts = useInfiniteQuery({ queryKey: keys.brief.drafts(workspace), queryFn: ({ pageParam }) => briefDraftsQuery(workspace, pageParam), initialPageParam: undefined as string | undefined, getNextPageParam: (page) => page.next_cursor ?? undefined });
  const freeze = useResearchWrite(() => freezeBriefAction(workspace), [keys.brief.snapshots(workspace)]);
  const listedEvidenceRows = evidence.data?.pages.flatMap((page) => page.items) ?? [];
  const clusterRows = clusters.data?.pages.flatMap((page) => page.items) ?? [];
  const relationRows = relations.data?.pages.flatMap((page) => page.items) ?? [];
  const briefObservationIds = brief.data?.observation_ids ?? [];
  const briefEvidence = useQuery({
    queryKey: keys.brief.briefEvidence(workspace, brief.data?.brief_id ?? "current", briefObservationIds),
    queryFn: () => evidenceByIDsQuery(workspace, briefObservationIds),
    enabled: briefObservationIds.length > 0,
  });
  const evidenceRows = mergeEvidence(listedEvidenceRows, briefEvidence.data ?? []);
  const evidenceError = evidence.isError ? evidence.error : briefEvidence.isError ? briefEvidence.error : null;
  const questionRows = questions.data?.pages.flatMap((page) => page.items) ?? [];
  const connectionRows = connections.data?.pages.flatMap((page) => page.items) ?? [];
  const recordRows = records.data?.pages.flatMap((page) => page.items) ?? [];
  const eventRows = events.data?.pages.flatMap((page) => page.items) ?? [];
  const linkedQuestionIDs = brief.data?.question_ids ?? [];
  const needsLinkedQuestions = linkedQuestionIDs.some((id) => !questionRows.some((question) => question.question_id === id));
  const linkedQuestionsQuery = useQuery({
    queryKey: keys.questions.byIDs(workspace, linkedQuestionIDs),
    queryFn: () => questionsByIDsQuery(workspace, linkedQuestionIDs),
    enabled: needsLinkedQuestions,
    retry: false,
  });
  const linkedQuestionRows = mergeQuestions(questionRows, linkedQuestionsQuery.data ?? []);
  const linkedQuestionsError = questions.isError ? questions.error : linkedQuestionsQuery.error ?? null;
  const linkedConnectionIDs = brief.data?.connection_ids ?? [];
  const needsLinkedConnections = linkedConnectionIDs.some((id) => !connectionRows.some((connection) => connection.connection_id === id));
  const linkedConnectionsQuery = useQuery({
    queryKey: keys.connections.byIDs(workspace, linkedConnectionIDs),
    queryFn: () => researchConnectionsByIDsQuery(workspace, linkedConnectionIDs),
    enabled: needsLinkedConnections,
    retry: false,
  });
  const linkedConnectionRows = mergeConnections(connectionRows, linkedConnectionsQuery.data ?? []);
  const linkedConnections = linkedConnectionRows.filter((connection) => linkedConnectionIDs.includes(connection.connection_id));
  const linkedRecordIDs = [...new Set(linkedConnections.flatMap((connection) => [connection.from_record_id, connection.to_record_id]))];
  const needsLinkedRecords = linkedRecordIDs.some((id) => !recordRows.some((record) => record.record_id === id));
  const linkedRecordsQuery = useQuery({
    queryKey: keys.records.byIDs(workspace, linkedRecordIDs),
    queryFn: () => researchRecordsByIDsQuery(workspace, linkedRecordIDs),
    enabled: needsLinkedRecords,
    retry: false,
  });
  const linkedRecordRows = mergeRecords(recordRows, linkedRecordsQuery.data ?? []);
  const linkedEventIDs = brief.data?.event_ids ?? [];
  const needsLinkedEvents = linkedEventIDs.some((id) => !eventRows.some((event) => event.event_id === id));
  const linkedEventsQuery = useQuery({
    queryKey: keys.events.byIDs(workspace, linkedEventIDs),
    queryFn: () => eventsByIDsQuery(workspace, linkedEventIDs),
    enabled: needsLinkedEvents,
    retry: false,
  });
  const linkedEventRows = mergeEvents(eventRows, linkedEventsQuery.data ?? []);
  const linkedEventsError = events.isError ? events.error : linkedEventsQuery.error ?? null;
  const snapshotRows = snapshots.data?.pages.flatMap((page) => page.items) ?? [];
  const draftRows = drafts.data?.pages.flatMap((page) => page.items) ?? [];
  const snapshotObservationIds = [...new Set(snapshotRows.flatMap((snapshot) => snapshotEvidenceIds(snapshot)))];
  const snapshotEvidence = useQuery({
    queryKey: keys.brief.snapshotListEvidence(workspace, snapshotObservationIds),
    queryFn: () => evidenceByIDsQuery(workspace, snapshotObservationIds),
    enabled: snapshotObservationIds.length > 0,
  });
  const snapshotEvidenceRows = mergeEvidence(evidenceRows, snapshotEvidence.data ?? []);
  const [selectedSnapshotIds, setSelectedSnapshotIds] = useState<string[]>([]);
  const selectedSnapshots = selectedSnapshotIds.map((id) => snapshotRows.find((row) => row.snapshot_id === id)).filter((row): row is BriefSnapshot => Boolean(row));
  const comparisonEvidence = useQuery({
    queryKey: keys.brief.comparisonEvidence(workspace, selectedSnapshots.map((snapshot) => snapshot.snapshot_id)),
    queryFn: () => evidenceByIDsQuery(workspace, [...new Set(selectedSnapshots.flatMap((snapshot) => snapshotEvidenceIds(snapshot)))]),
    enabled: selectedSnapshots.length === 2,
  });

  function toggleSnapshot(id: string) {
    setSelectedSnapshotIds((current) => current.includes(id)
      ? current.filter((one) => one !== id)
      : current.length >= 2 ? [current[1], id] : [...current, id]);
  }

  return <>
    <Query of={brief} label="working brief">{(data) => <PageHead title="Working brief" actions={data && mayWrite ? <Button type="button" intent="primary" onClick={() => freeze.mutate()} loading={freeze.isPending}>Freeze snapshot</Button> : undefined}>
      Assemble an authored handoff from the investigation record. Every cited observation and linked question remains visible, and prose here is not a generated conclusion.
    </PageHead>}</Query>
    <Query of={brief} label="working brief">{(data) => <div className={s.stack}>
      <Panel title="Compare frozen handoffs" note="Select two snapshots">
        <SnapshotComparison rows={selectedSnapshots} evidence={comparisonEvidence.data ?? snapshotEvidenceRows} evidenceError={comparisonEvidence.isError ? comparisonEvidence.error : null} workspace={workspace} />
      </Panel>
      <div className={s.columns}>
        <Panel title={data ? data.title : "Investigation handoff"}>
        <BriefEditor key={data?.brief_id ?? "new"} workspace={workspace} brief={data ?? undefined} drafts={draftRows} draftsError={drafts.isError ? drafts.error : null} draftsHasNext={drafts.hasNextPage} draftsFetchingNext={drafts.isFetchingNextPage} fetchMoreDrafts={() => void drafts.fetchNextPage()} evidence={evidenceRows} clusters={clusterRows} relations={relationRows} questions={linkedQuestionRows} connections={linkedConnectionRows} records={linkedRecordRows} events={linkedEventRows} evidenceError={evidenceError} clustersError={clusters.isError ? clusters.error : null} relationsError={relations.isError ? relations.error : null} questionsError={linkedQuestionsError} connectionsError={connections.isError ? connections.error : linkedConnectionsQuery.error ?? null} eventsError={linkedEventsError} evidenceHasNext={evidence.hasNextPage} evidenceFetchingNext={evidence.isFetchingNextPage} fetchMoreEvidence={() => void evidence.fetchNextPage()} clustersHasNext={clusters.hasNextPage} clustersFetchingNext={clusters.isFetchingNextPage} fetchMoreClusters={() => void clusters.fetchNextPage()} questionsHasNext={questions.hasNextPage} questionsFetchingNext={questions.isFetchingNextPage} fetchMoreQuestions={() => void questions.fetchNextPage()} connectionsHasNext={connections.hasNextPage} connectionsFetchingNext={connections.isFetchingNextPage} fetchMoreConnections={() => void connections.fetchNextPage()} recordsHasNext={records.hasNextPage} recordsFetchingNext={records.isFetchingNextPage} fetchMoreRecords={() => void records.fetchNextPage()} eventsHasNext={events.hasNextPage} eventsFetchingNext={events.isFetchingNextPage} fetchMoreEvents={() => void events.fetchNextPage()} mayWrite={mayWrite} shell={shell} />
        </Panel>
        <Panel title="Traceability">
          <div className={s.stack}><Traceability brief={data} evidence={evidenceRows} clusters={clusterRows} relations={relationRows} questions={linkedQuestionRows} connections={linkedConnectionRows} events={linkedEventRows} records={linkedRecordRows} workspace={workspace} evidenceError={evidenceError} clustersError={clusters.isError ? clusters.error : relations.isError ? relations.error : null} questionsError={linkedQuestionsError} connectionsError={connections.isError ? connections.error : linkedConnectionsQuery.error ?? null} eventsError={linkedEventsError} shell={shell} /><div className={s.briefHistory}><Text size="sm">Frozen handoffs</Text><Failure error={freeze.error} /><SnapshotList rows={snapshotRows} evidence={snapshotEvidenceRows} evidenceError={snapshotEvidence.isError ? snapshotEvidence.error : null} workspace={workspace} snapshotsError={snapshots.isError ? snapshots.error : null} questionsError={questions.isError ? questions.error : null} hasNext={snapshots.hasNextPage} fetchingNext={snapshots.isFetchingNextPage} fetchNext={() => void snapshots.fetchNextPage()} shell={shell} selected={selectedSnapshotIds} toggle={toggleSnapshot} /></div></div>
        </Panel>
      </div>
    </div>}</Query>
  </>;
}

function mergeEvidence(primary: Evidence[], additional: Evidence[]) {
  const byID = new Map(primary.map((row) => [row.observation_id, row]));
  for (const row of additional) if (!byID.has(row.observation_id)) byID.set(row.observation_id, row);
  return [...byID.values()];
}

function mergeQuestions(primary: InvestigationQuestion[], additional: InvestigationQuestion[]) {
  const byID = new Map(primary.map((row) => [row.question_id, row]));
  for (const row of additional) if (!byID.has(row.question_id)) byID.set(row.question_id, row);
  return [...byID.values()];
}

function mergeRecords(primary: ResearchRecord[], additional: ResearchRecord[]) {
  const byID = new Map(primary.map((row) => [row.record_id, row]));
  for (const row of additional) if (!byID.has(row.record_id)) byID.set(row.record_id, row);
  return [...byID.values()];
}

function mergeEvents(primary: TimelineEvent[], additional: TimelineEvent[]) {
  const byID = new Map(primary.map((row) => [row.event_id, row]));
  for (const row of additional) if (!byID.has(row.event_id)) byID.set(row.event_id, row);
  return [...byID.values()];
}

function mergeConnections(primary: ResearchConnection[], additional: ResearchConnection[]) {
  const byID = new Map(primary.map((row) => [row.connection_id, row]));
  for (const row of additional) if (!byID.has(row.connection_id)) byID.set(row.connection_id, row);
  return [...byID.values()];
}

function BriefEditor({ workspace, brief, drafts, draftsError, draftsHasNext, draftsFetchingNext, fetchMoreDrafts, evidence, clusters, relations, questions, connections, records, events, evidenceError, clustersError, relationsError, questionsError, connectionsError, eventsError, evidenceHasNext, evidenceFetchingNext, fetchMoreEvidence, clustersHasNext, clustersFetchingNext, fetchMoreClusters, questionsHasNext, questionsFetchingNext, fetchMoreQuestions, connectionsHasNext, connectionsFetchingNext, fetchMoreConnections, recordsHasNext, recordsFetchingNext, fetchMoreRecords, eventsHasNext, eventsFetchingNext, fetchMoreEvents, mayWrite, shell }: { workspace: string; brief?: WorkingBrief; drafts: BriefDraft[]; draftsError: Error | null; draftsHasNext: boolean; draftsFetchingNext: boolean; fetchMoreDrafts: () => void; evidence: Evidence[]; clusters: EvidenceCluster[]; relations: EvidenceRelation[]; questions: InvestigationQuestion[]; connections: ResearchConnection[]; records: ResearchRecord[]; events: TimelineEvent[]; evidenceError: Error | null; clustersError: Error | null; relationsError: Error | null; questionsError: Error | null; connectionsError: Error | null; eventsError: Error | null; evidenceHasNext: boolean; evidenceFetchingNext: boolean; fetchMoreEvidence: () => void; clustersHasNext: boolean; clustersFetchingNext: boolean; fetchMoreClusters: () => void; questionsHasNext: boolean; questionsFetchingNext: boolean; fetchMoreQuestions: () => void; connectionsHasNext: boolean; connectionsFetchingNext: boolean; fetchMoreConnections: () => void; recordsHasNext: boolean; recordsFetchingNext: boolean; fetchMoreRecords: () => void; eventsHasNext: boolean; eventsFetchingNext: boolean; fetchMoreEvents: () => void; mayWrite: boolean; shell?: ReturnType<typeof useContext>["shell"] }) {
  const [title, setTitle] = useState(brief?.title ?? "");
  const [question, setQuestion] = useState(brief?.question ?? "");
  const [currentAccount, setCurrentAccount] = useState(brief?.current_account ?? "");
  const [alternatives, setAlternatives] = useState(brief?.alternatives ?? "");
  const [limitations, setLimitations] = useState(brief?.limitations ?? "");
  const [nextSteps, setNextSteps] = useState(brief?.next_steps ?? "");
  const [observationIds, setObservationIds] = useState<string[]>(brief?.observation_ids ?? []);
  const [clusterIds, setClusterIds] = useState<string[]>(brief?.cluster_ids ?? []);
  const [questionIds, setQuestionIds] = useState<string[]>(brief?.question_ids ?? []);
  const [connectionIds, setConnectionIds] = useState<string[]>(brief?.connection_ids ?? []);
  const [eventIds, setEventIds] = useState<string[]>(brief?.event_ids ?? []);
  const body: WriteBrief = { title, question, current_account: currentAccount, alternatives, limitations, next_steps: nextSteps, observation_ids: observationIds, cluster_ids: clusterIds, question_ids: questionIds, connection_ids: connectionIds, event_ids: eventIds };
  const save = useResearchWrite(() => saveBriefAction(workspace, body), [keys.brief.one(workspace)], undefined);
  const applyDraftChanges = (changes: BriefDraftChange[]) => {
    for (const change of changes) {
      if (change.section === "title") setTitle(change.after);
      if (change.section === "question") setQuestion(change.after);
      if (change.section === "current_account") setCurrentAccount(change.after);
      if (change.section === "alternatives") setAlternatives(change.after);
      if (change.section === "limitations") setLimitations(change.after);
      if (change.section === "next_steps") setNextSteps(change.after);
    }
  };

  if (!mayWrite) return brief ? <BriefDetail workspace={workspace} brief={brief} clusters={clusters} relations={relations} clustersError={clustersError ?? relationsError} questions={questions} questionsError={questionsError} connections={connections} records={records} events={events} eventsError={eventsError} shell={shell} /> : <Text size="sm" tone="tertiary">This investigation is read-only. A working brief has not been authored yet.</Text>;

  return <form className={s.briefEditor} onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
    <Field label="Brief title" required>{(aria) => <Input {...aria} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Current investigation handoff" />}</Field>
    <Field label="Investigation question" hint="State what this brief is trying to answer. Leave the answer qualified." required>{(aria) => <Textarea {...aria} rows={4} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What are we currently trying to establish?" />}</Field>
    <Field label="Current account" hint="Write the best-supported account in your own words; citations below show what supports it.">{(aria) => <Textarea {...aria} rows={8} value={currentAccount} onChange={(event) => setCurrentAccount(event.target.value)} placeholder="What the investigation currently suggests…" />}</Field>
    <Field label="Alternatives" hint="Record competing explanations or interpretations still in play.">{(aria) => <Textarea {...aria} rows={6} value={alternatives} onChange={(event) => setAlternatives(event.target.value)} placeholder="Other plausible accounts…" />}</Field>
    <Field label="Limitations" hint="Name missing sources, conflicts, timing uncertainty, or anything that weakens the account.">{(aria) => <Textarea {...aria} rows={6} value={limitations} onChange={(event) => setLimitations(event.target.value)} placeholder="What we cannot establish yet…" />}</Field>
    <Field label="Next steps" hint="Describe the next source, comparison, or question to pursue.">{(aria) => <Textarea {...aria} rows={6} value={nextSteps} onChange={(event) => setNextSteps(event.target.value)} placeholder="What should happen next…" />}</Field>
    <BriefDraftPanel workspace={workspace} drafts={drafts} draftsError={draftsError} draftsHasNext={draftsHasNext} draftsFetchingNext={draftsFetchingNext} fetchMoreDrafts={fetchMoreDrafts} selectedObservationIDs={observationIds} evidence={evidence} evidenceError={evidenceError} applyChanges={applyDraftChanges} />
    <EvidencePicker workspace={workspace} selected={observationIds} evidence={evidence} setSelected={setObservationIds} error={evidenceError} hasNext={evidenceHasNext} fetchingNext={evidenceFetchingNext} fetchMore={fetchMoreEvidence} />
    <ClusterPicker selected={clusterIds} clusters={clusters} relations={relations} setSelected={setClusterIds} error={clustersError ?? relationsError} hasNext={clustersHasNext} fetchingNext={clustersFetchingNext} fetchMore={fetchMoreClusters} />
    <QuestionPicker selected={questionIds} questions={questions} setSelected={setQuestionIds} error={questionsError} hasNext={questionsHasNext} fetchingNext={questionsFetchingNext} fetchMore={fetchMoreQuestions} />
    <ConnectionPicker selected={connectionIds} connections={connections} records={records} setSelected={setConnectionIds} error={connectionsError} hasNext={connectionsHasNext} fetchingNext={connectionsFetchingNext} fetchMore={fetchMoreConnections} recordsHasNext={recordsHasNext} recordsFetchingNext={recordsFetchingNext} fetchMoreRecords={fetchMoreRecords} />
    <EventPicker selected={eventIds} events={events} setSelected={setEventIds} error={eventsError} hasNext={eventsHasNext} fetchingNext={eventsFetchingNext} fetchMore={fetchMoreEvents} />
    <Failure error={save.error} />
    {save.isSuccess ? <Text size="sm" tone="accent" role="status">Working brief saved.</Text> : null}
    <div className={s.row}><Button type="submit" intent="primary" loading={save.isPending}>{brief ? "Update brief" : "Save brief"}</Button>{brief ? <><Text size="xs" tone="tertiary">Last updated by {authorLabel(brief.updated_by, shell)} · {dateLabel(brief.updated_at)}</Text><WorkingNoteLink workspace={workspace} context={{ kind: "brief", id: brief.brief_id }} returnTo={investigationPath(workspace, "brief")} body={`Follow up on working brief: ${title}\n\n${currentAccount}\n\nNext steps: `} /></> : null}</div>
  </form>;
}

function BriefDraftPanel({ workspace, drafts, draftsError, draftsHasNext, draftsFetchingNext, fetchMoreDrafts, selectedObservationIDs, evidence, evidenceError, applyChanges }: { workspace: string; drafts: BriefDraft[]; draftsError: Error | null; draftsHasNext: boolean; draftsFetchingNext: boolean; fetchMoreDrafts: () => void; selectedObservationIDs: string[]; evidence: Evidence[]; evidenceError: Error | null; applyChanges: (changes: BriefDraftChange[]) => void }) {
  const [selectedDraftID, setSelectedDraftID] = useState("");
  const activeDraft = drafts.find((draft) => draft.brief_draft_id === selectedDraftID) ?? drafts[0];
  const activeDraftFailed = Boolean(activeDraft && activeDraft.status !== "completed" && activeDraft.status !== "empty");
  const create = useResearchWrite(() => createBriefDraftAction(workspace, selectedObservationIDs), [keys.brief.drafts(workspace)], (draft) => setSelectedDraftID(draft.brief_draft_id));
  return <section className={s.details} aria-label="Assisted brief draft">
    <div className={s.assistanceMeta}><Text size="sm">Draft assistance</Text><Text size="xs" tone="tertiary">Proposes a reviewable diff from the selected citations. It never overwrites the authored brief.</Text></div>
    <div className={s.row}><Text size="xs" tone="tertiary">{selectedObservationIDs.length} citation{selectedObservationIDs.length === 1 ? "" : "s"} selected</Text><Button type="button" size="sm" intent="ghost" loading={create.isPending} disabled={!selectedObservationIDs.length} onClick={() => create.mutate()}>{create.isPending ? "Preparing…" : "Generate proposal"}</Button></div>
    {!selectedObservationIDs.length ? <Text size="xs" tone="tertiary">Select one or more cited observations below, then generate a bounded proposal.</Text> : null}
    <Failure error={create.error} />
    <Failure error={draftsError} />
    {drafts.length ? <div className={s.stack}>
      <label className={s.stack}><Text size="xs" tone="tertiary" as="span">Saved proposals</Text><select className={s.select} value={activeDraft?.brief_draft_id ?? ""} onChange={(event) => setSelectedDraftID(event.target.value)}>{drafts.map((draft) => <option key={draft.brief_draft_id} value={draft.brief_draft_id}>{dateLabel(draft.created_at)} · {draft.status === "completed" ? `${draft.changes.length} proposed changes` : briefDraftStatusLabel(draft.status)}</option>)}</select></label>
      <MoreButton available={draftsHasNext} pending={draftsFetchingNext} load={fetchMoreDrafts} />
      {activeDraft ? <article className={s.proposalCard}>
        <div className={s.eventMeta}><Text size="xs" tone="tertiary">{activeDraft.provider} · {activeDraft.method} · {activeDraft.status}</Text><Text size="xs" tone="tertiary">{activeDraft.input.observation_ids.length} exact citation{activeDraft.input.observation_ids.length === 1 ? "" : "s"}</Text></div>
        {activeDraftFailed ? <div className={s.details}><Text size="sm">This draft attempt was retained, but the assistant did not produce a proposal.</Text><Text size="xs" tone="tertiary">{activeDraft.error || "The provider did not return a usable result."} Generate another proposal to retry with the current citations.</Text></div> : <><Text size="xs" tone="tertiary">{activeDraft.output}</Text>{activeDraft.changes.map((change) => <div key={change.section} className={s.stack}><ValueChange label={change.section.replaceAll("_", " ")} before={change.before} after={change.after} /><Text size="xs" tone="tertiary">Why: {change.rationale}</Text><CitationDeltaLinks label="Supporting citations" ids={change.observation_ids} evidence={evidence} evidenceError={evidenceError} workspace={workspace} /></div>)}{activeDraft.changes.length ? <Button type="button" size="sm" intent="primary" onClick={() => applyChanges(activeDraft.changes)}>Load changes into editor</Button> : null}</>}
      </article> : null}
    </div> : <Text size="xs" tone="tertiary">No proposals yet.</Text>}
  </section>;
}

function briefDraftStatusLabel(status: BriefDraft["status"]) {
  return status === "timed_out" ? "timed out" : status;
}

function BriefDetail({ workspace, brief, clusters, relations, clustersError, questions, questionsError, connections, records, events, eventsError, shell }: { workspace: string; brief: WorkingBrief; clusters: EvidenceCluster[]; relations: EvidenceRelation[]; clustersError: Error | null; questions: InvestigationQuestion[]; questionsError: Error | null; connections: ResearchConnection[]; records: ResearchRecord[]; events: TimelineEvent[]; eventsError: Error | null; shell?: ReturnType<typeof useContext>["shell"] }) {
  return <div className={s.stack}><div className={s.briefMeta}><Text size="xs" tone="tertiary">Updated by {authorLabel(brief.updated_by, shell)} · {dateLabel(brief.updated_at)}</Text></div><BriefSection label="Investigation question" value={brief.question} /><BriefSection label="Current account" value={brief.current_account} /><BriefSection label="Alternatives" value={brief.alternatives} /><BriefSection label="Limitations" value={brief.limitations} /><BriefSection label="Next steps" value={brief.next_steps} /><ClusterLinks ids={brief.cluster_ids} clusters={clusters} relations={relations} error={clustersError} /><QuestionLinks ids={brief.question_ids} questions={questions} workspace={workspace} error={questionsError} /><ConnectionLinks ids={brief.connection_ids} connections={connections} records={records} workspace={workspace} error={null} /><EventLinks ids={brief.event_ids} events={events} workspace={workspace} error={eventsError} /></div>;
}

function BriefSection({ label, value }: { label: string; value?: string }) {
  return <section className={s.briefSection}><Text size="xs" tone="tertiary">{label}</Text>{value ? <Text size="sm" className={s.body}>{value}</Text> : <Text size="sm" tone="tertiary">Not recorded.</Text>}</section>;
}

function Traceability({ brief, evidence, clusters, relations, questions, connections, events, records, workspace, evidenceError, clustersError, questionsError, connectionsError, eventsError, shell }: { brief: WorkingBrief | null; evidence: Evidence[]; clusters: EvidenceCluster[]; relations: EvidenceRelation[]; questions: InvestigationQuestion[]; connections: ResearchConnection[]; events: TimelineEvent[]; records: ResearchRecord[]; workspace: string; evidenceError: Error | null; clustersError: Error | null; questionsError: Error | null; connectionsError: Error | null; eventsError: Error | null; shell?: ReturnType<typeof useContext>["shell"] }) {
  if (!brief) return <div className={s.stack}><Text size="sm" tone="tertiary">Save the brief to attach its supporting record.</Text><Text size="sm" tone="tertiary">A citation is a link to an observation, not an automatically generated claim.</Text></div>;
  return <div className={s.stack}><Text size="sm" tone="tertiary">The brief is authored by a person and was last updated by {authorLabel(brief.updated_by, shell)}.</Text><CitationLinks ids={brief.observation_ids} evidence={evidence} workspace={workspace} error={evidenceError} /><ClusterLinks ids={brief.cluster_ids} clusters={clusters} relations={relations} error={clustersError} /><QuestionLinks ids={brief.question_ids} questions={questions} workspace={workspace} error={questionsError} /><ConnectionLinks ids={brief.connection_ids} connections={connections} records={records} workspace={workspace} error={connectionsError} /><EventLinks ids={brief.event_ids} events={events} workspace={workspace} error={eventsError} /></div>;
}

function SnapshotList({ rows, evidence, evidenceError, workspace, snapshotsError, questionsError, hasNext, fetchingNext, fetchNext, shell, selected, toggle }: { rows: BriefSnapshot[]; evidence: Evidence[]; evidenceError: Error | null; workspace: string; snapshotsError: Error | null; questionsError: Error | null; hasNext: boolean; fetchingNext: boolean; fetchNext: () => void; shell?: ReturnType<typeof useContext>["shell"]; selected: string[]; toggle: (id: string) => void }) {
  if (snapshotsError) return <Failure error={snapshotsError} />;
  if (!rows.length) return <Text size="sm" tone="tertiary">No frozen handoffs yet. Freeze the current brief when you need a stable point-in-time record.</Text>;
  return <div className={s.snapshotList}>{rows.map((snapshot) => <SnapshotCard key={snapshot.snapshot_id} snapshot={snapshot} evidence={evidence} evidenceError={evidenceError} workspace={workspace} questionsError={questionsError} shell={shell} selected={selected.includes(snapshot.snapshot_id)} toggle={() => toggle(snapshot.snapshot_id)} />)} <MoreButton available={hasNext} pending={fetchingNext} load={fetchNext} /></div>;
}

function SnapshotCard({ snapshot, evidence, evidenceError, workspace, questionsError, shell, selected, toggle }: { snapshot: BriefSnapshot; evidence: Evidence[]; evidenceError: Error | null; workspace: string; questionsError: Error | null; shell?: ReturnType<typeof useContext>["shell"]; selected: boolean; toggle: () => void }) {
  const exportSnapshot = useResearchWrite(() => hydrateEvidenceAction(workspace, snapshotEvidenceIds(snapshot)), [], (complete) => downloadBriefSnapshotMarkdown(snapshot, complete));
  return <article className={selected ? `${s.snapshotCard} ${s.snapshotCardSelected}` : s.snapshotCard}><div className={s.eventMeta}><Text size="xs" tone="tertiary">Frozen by {authorLabel(snapshot.frozen_by, shell)} · {dateLabel(snapshot.frozen_at)}</Text><Text size="xs" tone="tertiary">Source brief updated {dateLabel(snapshot.source_updated_at)}</Text></div><Text size="sm" className={s.eventTitle}>{snapshot.title}</Text><BriefSection label="Question" value={snapshot.question} /><BriefSection label="Current account" value={snapshot.current_account} /><CitationLinks ids={snapshot.observation_ids} evidence={evidence} workspace={workspace} error={evidenceError} /><SnapshotClusterLinks clusters={snapshot.clusters ?? []} /><SnapshotConnectionLinks connections={snapshot.connections} /><SnapshotEventLinks events={snapshot.events} workspace={workspace} /><SnapshotEventRelationshipLinks relationships={snapshot.event_relationships ?? []} events={snapshot.events} evidence={evidence} evidenceError={evidenceError} workspace={workspace} />{questionsError ? <Failure error={questionsError} /> : snapshot.questions.length ? <section className={s.briefSection}><Text size="xs" tone="tertiary">Question state at freeze</Text>{snapshot.questions.map((question) => <div key={question.question_id} className={s.stack}><Text size="sm">{question.question} <span className={s.muted}>({question.state})</span></Text>{question.resolution ? <Text size="xs" tone="tertiary">{question.resolution}</Text> : null}<Text size="xs" tone="tertiary">Question citations: {question.observation_ids.length || "none"}</Text></div>)}</section> : null}<Failure error={exportSnapshot.error} /><div className={s.row}><Button asChild type="button" size="sm" intent="ghost"><Link href={investigationPath(workspace, `brief/snapshots/${encodeURIComponent(snapshot.snapshot_id)}`)}>Open handoff</Link></Button><Button type="button" size="sm" intent={selected ? "primary" : "ghost"} onClick={toggle}>{selected ? "Selected for comparison" : "Select for comparison"}</Button><Button type="button" size="sm" intent="ghost" loading={exportSnapshot.isPending} onClick={() => exportSnapshot.mutate()}>{exportSnapshot.isPending ? "Preparing…" : "Download Markdown"}</Button></div></article>;
}

function SnapshotComparison({ rows, evidence, evidenceError, workspace }: { rows: BriefSnapshot[]; evidence: Evidence[]; evidenceError: Error | null; workspace: string }) {
  if (rows.length < 2) return <div className={s.empty}><Text size="sm">Choose two frozen handoffs.</Text><Text size="sm" tone="tertiary">The comparison shows what changed between authored snapshots. It does not decide which account is correct.</Text></div>;
  const [older, newer] = rows.slice().sort((left, right) => left.frozen_at.localeCompare(right.frozen_at));
  const changedCitations = diffCount(older.observation_ids, newer.observation_ids);
  const changedQuestions = questionDiffCount(older.questions, newer.questions);
  const changedConnections = connectionDiffCount(older.connections, newer.connections);
  const changedEvents = eventDiffCount(older.events, newer.events);
  const changedEventRelationships = eventRelationshipDiffCount(older.event_relationships ?? [], newer.event_relationships ?? []);
  return <div className={s.stack}><div className={s.snapshotCompareColumns}><SnapshotColumn label="Earlier handoff" snapshot={older} /><SnapshotColumn label="Later handoff" snapshot={newer} /></div><div className={s.comparisonSummary}><Text size="sm">Review changes</Text><Text size="sm" tone="tertiary">{changedSections(older, newer)} brief section{changedSections(older, newer) === 1 ? "" : "s"} changed · {changedCitations} citation change{changedCitations === 1 ? "" : "s"} · {changedQuestions} linked-question change{changedQuestions === 1 ? "" : "s"} · {changedConnections} connection change{changedConnections === 1 ? "" : "s"} · {changedEvents} event change{changedEvents === 1 ? "" : "s"} · {changedEventRelationships} event relationship change{changedEventRelationships === 1 ? "" : "s"}</Text></div><SnapshotBriefChanges older={older} newer={newer} /><SnapshotQuestionChanges older={older} newer={newer} evidence={evidence} evidenceError={evidenceError} workspace={workspace} /><SnapshotConnectionChanges older={older} newer={newer} evidence={evidence} evidenceError={evidenceError} workspace={workspace} /><SnapshotEventChanges older={older} newer={newer} /><SnapshotEventRelationshipChanges older={older} newer={newer} evidence={evidence} evidenceError={evidenceError} workspace={workspace} /></div>;
}

function SnapshotBriefChanges({ older, newer }: { older: BriefSnapshot; newer: BriefSnapshot }) {
  const fields: Array<[string, keyof BriefSnapshot]> = [["Title", "title"], ["Investigation question", "question"], ["Current account", "current_account"], ["Alternatives", "alternatives"], ["Limitations", "limitations"], ["Next steps", "next_steps"]];
  const changed = fields.filter(([, key]) => textValue(older[key]) !== textValue(newer[key]));
  if (!changed.length) return null;
  return <section className={s.details}><Text size="sm">Brief text changes</Text>{changed.map(([label, key]) => <ValueChange key={key} label={label} before={textValue(older[key])} after={textValue(newer[key])} />)}</section>;
}

function SnapshotQuestionChanges({ older, newer, evidence, evidenceError, workspace }: { older: BriefSnapshot; newer: BriefSnapshot; evidence: Evidence[]; evidenceError: Error | null; workspace: string }) {
  const olderByID = new Map(older.questions.map((question) => [question.question_id, question]));
  const newerByID = new Map(newer.questions.map((question) => [question.question_id, question]));
  const ids = [...new Set([...older.questions.map((question) => question.question_id), ...newer.questions.map((question) => question.question_id)])];
  const changed = ids.filter((id) => JSON.stringify(olderByID.get(id)) !== JSON.stringify(newerByID.get(id)));
  if (!changed.length) return null;
  return <section className={s.details}><Text size="sm">Question changes</Text>{changed.map((id) => {
    const before = olderByID.get(id);
    const after = newerByID.get(id);
    if (!before) return <article key={id} className={s.stack}><Text size="sm">Added question: {after?.question}</Text><Text size="xs" tone="tertiary">Question {id} · {after?.state}</Text>{after ? <CitationDeltaLinks label="Citations on added question" ids={after.observation_ids} evidence={evidence} evidenceError={evidenceError} workspace={workspace} /> : null}</article>;
    if (!after) return <article key={id} className={s.stack}><Text size="sm">Removed question: {before.question}</Text><Text size="xs" tone="tertiary">Question {id} · {before.state}</Text><CitationDeltaLinks label="Citations on removed question" ids={before.observation_ids} evidence={evidence} evidenceError={evidenceError} workspace={workspace} /></article>;
    const observations = snapshotQuestionObservationChanges(before, after);
    return <article key={id} className={s.stack}><Text size="xs" tone="tertiary">Question {id}</Text>{before.question !== after.question ? <ValueChange label="Question text" before={before.question} after={after.question} /> : null}{before.state !== after.state ? <ValueChange label="State" before={before.state} after={after.state} /> : null}{(before.resolution ?? "") !== (after.resolution ?? "") ? <ValueChange label="Resolution" before={before.resolution ?? ""} after={after.resolution ?? ""} /> : null}<CitationDeltaLinks label="Question citations added" ids={observations.added} evidence={evidence} evidenceError={evidenceError} workspace={workspace} /><CitationDeltaLinks label="Question citations removed" ids={observations.removed} evidence={evidence} evidenceError={evidenceError} workspace={workspace} /></article>;
  })}</section>;
}

function SnapshotConnectionChanges({ older, newer, evidence: evidenceRows, evidenceError, workspace }: { older: BriefSnapshot; newer: BriefSnapshot; evidence: Evidence[]; evidenceError: Error | null; workspace: string }) {
  const olderByID = new Map(older.connections.map((connection) => [connection.connection_id, connection]));
  const newerByID = new Map(newer.connections.map((connection) => [connection.connection_id, connection]));
  const ids = [...new Set([...older.connections.map((connection) => connection.connection_id), ...newer.connections.map((connection) => connection.connection_id)])];
  if (!ids.length) return <Text size="sm" tone="tertiary">No connection-level changes to explain.</Text>;
  return <section className={s.details}><Text size="sm">Connection-level changes</Text>{ids.map((id) => {
    const before = olderByID.get(id);
    const after = newerByID.get(id);
    if (!before) return <article key={id} className={s.stack}><Text size="sm">Added: {after?.from_record_name} → {after?.to_record_name}</Text><Text size="xs" tone="tertiary">Connection {id}</Text>{after ? <CitationDeltaLinks label="Citations on added connection" ids={connectionObservationIDs(after)} evidence={evidenceRows} evidenceError={evidenceError} workspace={workspace} /> : null}</article>;
    if (!after) return <article key={id} className={s.stack}><Text size="sm">Removed: {before.from_record_name} → {before.to_record_name}</Text><Text size="xs" tone="tertiary">Connection {id}</Text><CitationDeltaLinks label="Citations on removed connection" ids={connectionObservationIDs(before)} evidence={evidenceRows} evidenceError={evidenceError} workspace={workspace} /></article>;
    const changes = snapshotConnectionChanges(before, after);
    const evidence = snapshotConnectionEvidenceChanges(before, after);
    const recordObservations = snapshotConnectionRecordObservationChanges(before, after);
    return <article key={id} className={s.stack}>
      <Text size="sm">{after.from_record_name} → {after.to_record_name}</Text>
      <Text size="xs" tone="tertiary">Connection {id} · Changed: {changes.join(" · ")}</Text>
      {before.from_record_id !== after.from_record_id || before.from_record_kind !== after.from_record_kind || before.from_record_name !== after.from_record_name ? <ValueChange label="From endpoint" before={`${before.from_record_name} (${before.from_record_kind}) · ${before.from_record_id}`} after={`${after.from_record_name} (${after.from_record_kind}) · ${after.from_record_id}`} /> : null}
      {before.to_record_id !== after.to_record_id || before.to_record_kind !== after.to_record_kind || before.to_record_name !== after.to_record_name ? <ValueChange label="To endpoint" before={`${before.to_record_name} (${before.to_record_kind}) · ${before.to_record_id}`} after={`${after.to_record_name} (${after.to_record_kind}) · ${after.to_record_id}`} /> : null}
      {before.kind !== after.kind ? <ValueChange label="Relationship" before={before.kind} after={after.kind} /> : null}
      {before.state !== after.state ? <ValueChange label="Review state" before={before.state} after={after.state} /> : null}
      {before.from_record_description !== after.from_record_description ? <ValueChange label="From-record description" before={before.from_record_description} after={after.from_record_description} /> : null}
      {before.to_record_description !== after.to_record_description ? <ValueChange label="To-record description" before={before.to_record_description} after={after.to_record_description} /> : null}
      {before.rationale !== after.rationale ? <ValueChange label="Rationale" before={before.rationale} after={after.rationale} /> : null}
      <CitationDeltaLinks label="Supporting added" ids={evidence.supportingAdded} evidence={evidenceRows} evidenceError={evidenceError} workspace={workspace} />
      <CitationDeltaLinks label="Supporting removed" ids={evidence.supportingRemoved} evidence={evidenceRows} evidenceError={evidenceError} workspace={workspace} />
      <CitationDeltaLinks label="Opposing added" ids={evidence.opposingAdded} evidence={evidenceRows} evidenceError={evidenceError} workspace={workspace} />
      <CitationDeltaLinks label="Opposing removed" ids={evidence.opposingRemoved} evidence={evidenceRows} evidenceError={evidenceError} workspace={workspace} />
      <CitationDeltaLinks label="From-record citations added" ids={recordObservations.fromAdded} evidence={evidenceRows} evidenceError={evidenceError} workspace={workspace} />
      <CitationDeltaLinks label="From-record citations removed" ids={recordObservations.fromRemoved} evidence={evidenceRows} evidenceError={evidenceError} workspace={workspace} />
      <CitationDeltaLinks label="To-record citations added" ids={recordObservations.toAdded} evidence={evidenceRows} evidenceError={evidenceError} workspace={workspace} />
      <CitationDeltaLinks label="To-record citations removed" ids={recordObservations.toRemoved} evidence={evidenceRows} evidenceError={evidenceError} workspace={workspace} />
    </article>;
  })}</section>;
}

function connectionObservationIDs(connection: BriefSnapshot["connections"][number]) {
  return [...new Set([...connection.supporting_observation_ids, ...connection.opposing_observation_ids, ...connection.from_record_observation_ids, ...connection.to_record_observation_ids])];
}

function CitationDeltaLinks({ label, ids, evidence, evidenceError, workspace }: { label: string; ids: string[]; evidence: Evidence[]; evidenceError: Error | null; workspace: string }) {
  if (!ids.length) return null;
  const byID = new Map(evidence.map((row) => [row.observation_id, row]));
  return <div className={s.stack}><Text size="xs" tone="tertiary">{label}</Text>{evidenceError ? <Text size="xs" tone="tertiary">Some evidence details could not be loaded; unresolved identifiers remain visible below.</Text> : null}{ids.map((id) => {
    const row = byID.get(id);
    if (!row) return <Text key={id} size="xs" tone="tertiary">Observation {id} could not be resolved.</Text>;
    return <article key={id} className={s.observation}><div className={s.eventMeta}><Link href={sourceHref(workspace, row.source_id, row.capture_id, row.observation_id, investigationPath(workspace, "brief"))} className={s.inlineLink}>{row.source_title}</Link><span className={s.muted}>Observation {row.observation_id}</span></div><Text size="sm" className={s.evidenceStatement}>{row.statement}</Text><blockquote className={s.quote}>{row.quote}</blockquote><Text size="xs" tone="tertiary">Capture {row.capture_id} · recorded {dateLabel(row.recorded_at)}</Text></article>;
  })}</div>;
}

function ValueChange({ label, before, after }: { label: string; before: string; after: string }) {
  return <div className={s.details}><Text size="xs" tone="tertiary">{label}</Text><div className={s.snapshotCompareColumns}><div><Text size="xs" tone="tertiary">Earlier</Text><Text size="sm" className={s.body}>{before || "Not recorded."}</Text></div><div><Text size="xs" tone="tertiary">Later</Text><Text size="sm" className={s.body}>{after || "Not recorded."}</Text></div></div></div>;
}

function SnapshotColumn({ label, snapshot }: { label: string; snapshot: BriefSnapshot }) {
  return <div className={s.comparisonItem}><Text size="xs" tone="tertiary">{label} · {dateLabel(snapshot.frozen_at)}</Text><BriefSection label="Title" value={snapshot.title} /><BriefSection label="Question" value={snapshot.question} /><BriefSection label="Current account" value={snapshot.current_account} /><BriefSection label="Alternatives" value={snapshot.alternatives} /><BriefSection label="Limitations" value={snapshot.limitations} /><BriefSection label="Next steps" value={snapshot.next_steps} /></div>;
}

function changedSections(left: BriefSnapshot, right: BriefSnapshot) {
  return ["title", "question", "current_account", "alternatives", "limitations", "next_steps"].filter((key) => textValue(left[key as keyof BriefSnapshot]) !== textValue(right[key as keyof BriefSnapshot])).length;
}

function textValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function diffCount(left: string[], right: string[]) {
  return left.filter((id) => !right.includes(id)).length + right.filter((id) => !left.includes(id)).length;
}

function questionDiffCount(left: BriefSnapshot["questions"], right: BriefSnapshot["questions"]) {
  const all = new Set([...left.map((one) => one.question_id), ...right.map((one) => one.question_id)]);
  return [...all].filter((id) => JSON.stringify(left.find((one) => one.question_id === id)) !== JSON.stringify(right.find((one) => one.question_id === id))).length;
}

function connectionDiffCount(left: BriefSnapshot["connections"], right: BriefSnapshot["connections"]) {
  const all = new Set([...left.map((one) => one.connection_id), ...right.map((one) => one.connection_id)]);
  return [...all].filter((id) => JSON.stringify(left.find((one) => one.connection_id === id)) !== JSON.stringify(right.find((one) => one.connection_id === id))).length;
}

function eventRelationshipDiffCount(left: BriefSnapshot["event_relationships"], right: BriefSnapshot["event_relationships"]) {
  const all = new Set([...left.map((one) => one.relationship_id), ...right.map((one) => one.relationship_id)]);
  return [...all].filter((id) => JSON.stringify(left.find((one) => one.relationship_id === id)) !== JSON.stringify(right.find((one) => one.relationship_id === id))).length;
}

function eventDiffCount(left: BriefSnapshot["events"], right: BriefSnapshot["events"]) {
  const all = new Set([...left.map((one) => one.event_id), ...right.map((one) => one.event_id)]);
  return [...all].filter((id) => JSON.stringify(left.find((one) => one.event_id === id)) !== JSON.stringify(right.find((one) => one.event_id === id))).length;
}

function SnapshotEventChanges({ older, newer }: { older: BriefSnapshot; newer: BriefSnapshot }) {
  const olderByID = new Map(older.events.map((event) => [event.event_id, event]));
  const newerByID = new Map(newer.events.map((event) => [event.event_id, event]));
  const ids = [...new Set([...older.events.map((event) => event.event_id), ...newer.events.map((event) => event.event_id)])];
  const changed = ids.filter((id) => JSON.stringify(olderByID.get(id)) !== JSON.stringify(newerByID.get(id)));
  if (!changed.length) return null;
  return <section className={s.details}><Text size="sm">Event changes</Text>{changed.map((id) => { const before = olderByID.get(id); const after = newerByID.get(id); if (!before) return <article key={id} className={s.stack}><Text size="sm">Added event: {after?.title}</Text><Text size="xs" tone="tertiary">Event {id}</Text></article>; if (!after) return <article key={id} className={s.stack}><Text size="sm">Removed event: {before.title}</Text><Text size="xs" tone="tertiary">Event {id}</Text></article>; const beforeParticipants = before.participant_records.map((record) => `${record.name} (${record.kind})`).join(", "); const afterParticipants = after.participant_records.map((record) => `${record.name} (${record.kind})`).join(", "); const beforePlace = before.location_record ? `${before.location_record.name} (${before.location_record.kind})` : ""; const afterPlace = after.location_record ? `${after.location_record.name} (${after.location_record.kind})` : ""; return <article key={id} className={s.stack}><Text size="sm">{after.title}</Text><Text size="xs" tone="tertiary">Event {id}</Text>{before.event_revision_id !== after.event_revision_id || before.event_revision !== after.event_revision ? <ValueChange label="Frozen event revision" before={before.event_revision ? `Revision ${before.event_revision}` : before.event_revision_id || "Not pinned"} after={after.event_revision ? `Revision ${after.event_revision}` : after.event_revision_id || "Not pinned"} /> : null}{before.title !== after.title ? <ValueChange label="Event title" before={before.title} after={after.title} /> : null}{before.description !== after.description ? <ValueChange label="Description" before={before.description} after={after.description} /> : null}{before.reported_time !== after.reported_time || before.time_precision !== after.time_precision ? <ValueChange label="Reported time" before={`${before.time_precision} · ${before.reported_time}`} after={`${after.time_precision} · ${after.reported_time}`} /> : null}{before.sort_date !== after.sort_date ? <ValueChange label="Ordering date" before={before.sort_date} after={after.sort_date} /> : null}{before.location !== after.location ? <ValueChange label="Location" before={before.location} after={after.location} /> : null}{beforeParticipants !== afterParticipants ? <ValueChange label="Participants" before={beforeParticipants} after={afterParticipants} /> : null}{beforePlace !== afterPlace ? <ValueChange label="Place record" before={beforePlace} after={afterPlace} /> : null}</article>; })}</section>;
}

function SnapshotEventRelationshipChanges({ older, newer, evidence, evidenceError, workspace }: { older: BriefSnapshot; newer: BriefSnapshot; evidence: Evidence[]; evidenceError: Error | null; workspace: string }) {
  const olderByID = new Map((older.event_relationships ?? []).map((relationship) => [relationship.relationship_id, relationship]));
  const newerByID = new Map((newer.event_relationships ?? []).map((relationship) => [relationship.relationship_id, relationship]));
  const ids = [...new Set([...(older.event_relationships ?? []).map((relationship) => relationship.relationship_id), ...(newer.event_relationships ?? []).map((relationship) => relationship.relationship_id)])];
  const changed = ids.filter((id) => JSON.stringify(olderByID.get(id)) !== JSON.stringify(newerByID.get(id)));
  if (!changed.length) return null;
  return <section className={s.details}><Text size="sm">Event relationship changes</Text>{changed.map((id) => { const before = olderByID.get(id); const after = newerByID.get(id); const relationship = after ?? before!; const supporting = relationship.supporting_observation_ids ?? []; const opposing = relationship.opposing_observation_ids ?? []; if (!before) return <article key={id} className={s.stack}><Text size="sm">Added event relationship: {relationship.kind}</Text><Text size="xs" tone="tertiary">Relationship {id} · {relationship.from_event_id} → {relationship.to_event_id}</Text><Text size="sm">{relationship.rationale}</Text><CitationDeltaLinks label="Supporting citations on added relationship" ids={supporting} evidence={evidence} evidenceError={evidenceError} workspace={workspace} /><CitationDeltaLinks label="Opposing citations on added relationship" ids={opposing} evidence={evidence} evidenceError={evidenceError} workspace={workspace} /></article>; if (!after) return <article key={id} className={s.stack}><Text size="sm">Removed event relationship: {before.kind}</Text><Text size="xs" tone="tertiary">Relationship {id} · {before.from_event_id} → {before.to_event_id}</Text><Text size="sm">{before.rationale}</Text></article>; const supportChanged = JSON.stringify(before.supporting_observation_ids) !== JSON.stringify(after.supporting_observation_ids); const opposingChanged = JSON.stringify(before.opposing_observation_ids) !== JSON.stringify(after.opposing_observation_ids); return <article key={id} className={s.stack}><Text size="sm">{after.kind}</Text><Text size="xs" tone="tertiary">Relationship {id} · {after.from_event_id} → {after.to_event_id}</Text>{before.state !== after.state ? <ValueChange label="Review state" before={before.state} after={after.state} /> : null}{before.rationale !== after.rationale ? <ValueChange label="Rationale" before={before.rationale} after={after.rationale} /> : null}{supportChanged ? <><CitationDeltaLinks label="Supporting citations added" ids={(after.supporting_observation_ids ?? []).filter((observation) => !(before.supporting_observation_ids ?? []).includes(observation))} evidence={evidence} evidenceError={evidenceError} workspace={workspace} /><CitationDeltaLinks label="Supporting citations removed" ids={(before.supporting_observation_ids ?? []).filter((observation) => !(after.supporting_observation_ids ?? []).includes(observation))} evidence={evidence} evidenceError={evidenceError} workspace={workspace} /></> : null}{opposingChanged ? <><CitationDeltaLinks label="Opposing citations added" ids={(after.opposing_observation_ids ?? []).filter((observation) => !(before.opposing_observation_ids ?? []).includes(observation))} evidence={evidence} evidenceError={evidenceError} workspace={workspace} /><CitationDeltaLinks label="Opposing citations removed" ids={(before.opposing_observation_ids ?? []).filter((observation) => !(after.opposing_observation_ids ?? []).includes(observation))} evidence={evidence} evidenceError={evidenceError} workspace={workspace} /></> : null}</article>; })}</section>;
}

function EvidencePicker({ workspace, selected, evidence, setSelected, error, hasNext, fetchingNext, fetchMore }: { workspace: string; selected: string[]; evidence: Evidence[]; setSelected: (ids: string[]) => void; error: Error | null; hasNext: boolean; fetchingNext: boolean; fetchMore: () => void }) {
  const [query, setQuery] = useState("");
  const visible = filterBriefPickerRows(evidence, query, (row) => [row.observation_id, row.source_id, row.capture_id, row.source_title, row.statement, row.quote]);
  return <div className={s.details}><Text size="sm">Cited observations <span className={s.muted}>(optional, up to 12)</span></Text>{error ? <Failure error={error} /> : evidence.length ? <div className={s.stack}><Input aria-label="Filter cited observations" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter loaded observations" /><Text size="xs" tone="tertiary">Showing {visible.length} of {evidence.length} loaded observation{evidence.length === 1 ? "" : "s"}.</Text>{visible.length ? <div className={s.checkboxList}>{visible.map((row) => { const checked = selected.includes(row.observation_id); const disabled = !checked && selected.length >= 12; return <label key={row.observation_id} className={s.checkboxLabel}><input type="checkbox" checked={checked} disabled={disabled} onChange={() => setSelected(checked ? selected.filter((id) => id !== row.observation_id) : [...selected, row.observation_id])} /><span className={s.questionLinkText}>{row.source_title}: {row.statement}</span></label>; })}</div> : <Text size="xs" tone="tertiary">No loaded observations match. Clear the filter or load more.</Text>}<MoreButton available={hasNext} pending={fetchingNext} load={fetchMore} /></div> : <Text size="xs" tone="tertiary">No cited observations are loaded yet.</Text>}<SelectedCitationDetails workspace={workspace} ids={selected} evidence={evidence} /></div>;
}

function SelectedCitationDetails({ workspace, ids, evidence }: { workspace: string; ids: string[]; evidence: Evidence[] }) {
  if (!ids.length) return null;
  const byID = new Map(evidence.map((row) => [row.observation_id, row]));
  return <div className={s.stack}><Text size="xs" tone="tertiary">Selected citation details</Text>{ids.map((id) => {
    const row = byID.get(id);
    if (!row) return <Text key={id} size="xs" tone="tertiary">Observation {id} could not be resolved yet.</Text>;
    return <article key={id} className={s.observation}><div className={s.eventMeta}><Link className={s.inlineLink} href={sourceHref(workspace, row.source_id, row.capture_id, row.observation_id, investigationPath(workspace, "brief"))}>{row.source_title}</Link><span className={s.muted}>Observation {row.observation_id}</span></div><Text size="sm">{row.statement}</Text><blockquote className={s.quote}>{row.quote}</blockquote><Text size="xs" tone="tertiary">Capture {row.capture_id} · recorded {dateLabel(row.recorded_at)}</Text></article>;
  })}</div>;
}

function ClusterPicker({ selected, clusters, relations, setSelected, error, hasNext, fetchingNext, fetchMore }: { selected: string[]; clusters: EvidenceCluster[]; relations: EvidenceRelation[]; setSelected: (ids: string[]) => void; error: Error | null; hasNext: boolean; fetchingNext: boolean; fetchMore: () => void }) {
  const [query, setQuery] = useState("");
  const visible = filterBriefPickerRows(clusters, query, (row) => [row.cluster_id, row.kind, row.title, row.description, ...row.observation_ids]);
  return <div className={s.details}><Text size="sm">Evidence clusters <span className={s.muted}>(optional, up to 8)</span></Text><Text size="xs" tone="tertiary">Link the analyst-authored grouping used to support this handoff. The grouping stays qualified and does not become an automatic conclusion.</Text>{error ? <Failure error={error} /> : clusters.length ? <div className={s.stack}><Input aria-label="Filter evidence clusters" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter cluster title, qualification, or ID" /><Text size="xs" tone="tertiary">Showing {visible.length} of {clusters.length} loaded cluster{clusters.length === 1 ? "" : "s"}.</Text>{visible.length ? <div className={s.checkboxList}>{visible.map((row) => { const checked = selected.includes(row.cluster_id); const disabled = !checked && selected.length >= 8; const coverage = clusterCoverage(row, relations); return <label key={row.cluster_id} className={s.checkboxLabel}><input type="checkbox" checked={checked} disabled={disabled} onChange={() => setSelected(checked ? selected.filter((id) => id !== row.cluster_id) : [...selected, row.cluster_id])} /><span className={s.questionLinkText}>{row.kind === "claim" ? "Claim" : "Account"}: {row.title} <span className={s.muted}>({coverage.reviewed_observation_count}/{coverage.observation_count} reviewed · {coverage.contradicting_count} contradictions)</span></span></label>; })}</div> : <Text size="xs" tone="tertiary">No clusters match. Clear the filter or load more.</Text>}<MoreButton available={hasNext} pending={fetchingNext} load={fetchMore} /></div> : <Text size="xs" tone="tertiary">No evidence clusters are recorded yet.</Text>}</div>;
}

function QuestionPicker({ selected, questions, setSelected, error, hasNext, fetchingNext, fetchMore }: { selected: string[]; questions: InvestigationQuestion[]; setSelected: (ids: string[]) => void; error: Error | null; hasNext: boolean; fetchingNext: boolean; fetchMore: () => void }) {
  const [query, setQuery] = useState("");
  const visible = filterBriefPickerRows(questions, query, (row) => [row.question_id, row.question, row.context ?? "", row.resolution ?? "", row.state]);
  const unresolved = unresolvedBriefPickerIDs(selected, questions, (row) => row.question_id);
  return <div className={s.details}><Text size="sm">Linked questions <span className={s.muted}>(optional, up to 8)</span></Text>{error ? <Failure error={error} /> : questions.length ? <div className={s.stack}><Input aria-label="Filter linked questions" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter loaded questions" /><Text size="xs" tone="tertiary">Showing {visible.length} of {questions.length} loaded question{questions.length === 1 ? "" : "s"}.</Text>{visible.length ? <div className={s.checkboxList}>{visible.map((row) => { const checked = selected.includes(row.question_id); const disabled = !checked && selected.length >= 8; return <label key={row.question_id} className={s.checkboxLabel}><input type="checkbox" checked={checked} disabled={disabled} onChange={() => setSelected(checked ? selected.filter((id) => id !== row.question_id) : [...selected, row.question_id])} /><span className={s.questionLinkText}>{row.question} <span className={s.muted}>({row.state})</span></span></label>; })}</div> : <Text size="xs" tone="tertiary">No loaded questions match. Clear the filter or load more.</Text>}<MoreButton available={hasNext} pending={fetchingNext} load={fetchMore} /></div> : <Text size="xs" tone="tertiary">No investigation questions are recorded yet.</Text>}{unresolved.length ? <Text size="xs" tone="tertiary">{unresolved.length} selected question ID{unresolved.length === 1 ? " is" : "s are"} currently unresolved; the ID{unresolved.length === 1 ? " is" : "s remain"} preserved.</Text> : null}</div>;
}

function ConnectionPicker({ selected, connections, records, setSelected, error, hasNext, fetchingNext, fetchMore, recordsHasNext, recordsFetchingNext, fetchMoreRecords }: { selected: string[]; connections: ResearchConnection[]; records: ResearchRecord[]; setSelected: (ids: string[]) => void; error: Error | null; hasNext: boolean; fetchingNext: boolean; fetchMore: () => void; recordsHasNext: boolean; recordsFetchingNext: boolean; fetchMoreRecords: () => void }) {
  const [query, setQuery] = useState("");
  const recordName = new Map(records.map((record) => [record.record_id, record.name]));
  const visible = filterBriefPickerRows(connections, query, (row) => [row.connection_id, row.from_record_id, row.to_record_id, recordName.get(row.from_record_id) ?? "", recordName.get(row.to_record_id) ?? "", row.kind, row.state, row.rationale]);
  const unresolved = unresolvedBriefPickerIDs(selected, connections, (row) => row.connection_id);
  return <div className={s.details}><Text size="sm">Linked connections <span className={s.muted}>(optional, up to 8)</span></Text>{error ? <Failure error={error} /> : connections.length ? <div className={s.stack}><Input aria-label="Filter linked connections" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter loaded connections" /><Text size="xs" tone="tertiary">Showing {visible.length} of {connections.length} loaded connection{connections.length === 1 ? "" : "s"}.</Text>{visible.length ? <div className={s.checkboxList}>{visible.map((row) => { const checked = selected.includes(row.connection_id); const disabled = !checked && selected.length >= 8; return <label key={row.connection_id} className={s.checkboxLabel}><input type="checkbox" checked={checked} disabled={disabled} onChange={() => setSelected(checked ? selected.filter((id) => id !== row.connection_id) : [...selected, row.connection_id])} /><span className={s.questionLinkText}>{recordName.get(row.from_record_id) ?? row.from_record_id} → {recordName.get(row.to_record_id) ?? row.to_record_id} <span className={s.muted}>({row.kind} · {row.state})</span></span></label>; })}</div> : <Text size="xs" tone="tertiary">No loaded connections match. Clear the filter or load more.</Text>}<MoreButton available={hasNext} pending={fetchingNext} load={fetchMore} />{recordsHasNext ? <div className={s.row}><Text size="xs" tone="tertiary">Some endpoint names may be IDs until more records load.</Text><MoreButton available={recordsHasNext} pending={recordsFetchingNext} load={fetchMoreRecords} /></div> : null}</div> : <Text size="xs" tone="tertiary">No qualified connections are recorded yet.</Text>}{unresolved.length ? <Text size="xs" tone="tertiary">{unresolved.length} selected connection ID{unresolved.length === 1 ? " is" : "s are"} currently unresolved; the ID{unresolved.length === 1 ? " is" : "s remain"} preserved.</Text> : null}</div>;
}

function EventPicker({ selected, events, setSelected, error, hasNext, fetchingNext, fetchMore }: { selected: string[]; events: TimelineEvent[]; setSelected: (ids: string[]) => void; error: Error | null; hasNext: boolean; fetchingNext: boolean; fetchMore: () => void }) {
  const [query, setQuery] = useState("");
  const visible = filterBriefPickerRows(events, query, (row) => [row.event_id, row.title, row.description ?? "", row.reported_time ?? "", row.location ?? "", row.time_precision, row.sort_date ?? ""]);
  const unresolved = unresolvedBriefPickerIDs(selected, events, (row) => row.event_id);
  return <div className={s.details}><Text size="sm">Linked reported events <span className={s.muted}>(optional, up to 8)</span></Text>{error ? <Failure error={error} /> : events.length ? <div className={s.stack}><Input aria-label="Filter linked reported events" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter loaded events" /><Text size="xs" tone="tertiary">Showing {visible.length} of {events.length} loaded event{events.length === 1 ? "" : "s"}.</Text>{visible.length ? <div className={s.checkboxList}>{visible.map((row) => { const checked = selected.includes(row.event_id); const disabled = !checked && selected.length >= 8; return <label key={row.event_id} className={s.checkboxLabel}><input type="checkbox" checked={checked} disabled={disabled} onChange={() => setSelected(checked ? selected.filter((id) => id !== row.event_id) : [...selected, row.event_id])} /><span className={s.questionLinkText}>{row.title} <span className={s.muted}>({row.time_precision}{row.reported_time ? ` · ${row.reported_time}` : ""})</span></span></label>; })}</div> : <Text size="xs" tone="tertiary">No loaded events match. Clear the filter or load more.</Text>}<MoreButton available={hasNext} pending={fetchingNext} load={fetchMore} /></div> : <Text size="xs" tone="tertiary">No reported events are recorded yet.</Text>}{unresolved.length ? <Text size="xs" tone="tertiary">{unresolved.length} selected event ID{unresolved.length === 1 ? " is" : "s are"} currently unresolved; the ID{unresolved.length === 1 ? " is" : "s remain"} preserved.</Text> : null}</div>;
}

function CitationLinks({ ids, evidence, workspace, error }: { ids: string[]; evidence: Evidence[]; workspace: string; error: Error | null }) {
  const returnTo = investigationPath(workspace, "brief");
  return <section className={s.briefSection}><Text size="xs" tone="tertiary">Cited observations</Text>{error ? <Failure error={error} /> : null}{ids.length ? <div className={s.stack}>{ids.map((id) => { const found = evidence.find((one) => one.observation_id === id); return found ? <Link key={id} className={s.inlineLink} href={sourceHref(workspace, found.source_id, found.capture_id, found.observation_id, returnTo)}>{found.source_title}: {found.statement}</Link> : <Text key={id} size="xs" tone="tertiary">Citation {id}</Text>; })}</div> : <Text size="sm" tone="tertiary">No observations cited.</Text>}</section>;
}

function SnapshotClusterLinks({ clusters }: { clusters: BriefSnapshot["clusters"] }) {
  return <section className={s.briefSection}><Text size="xs" tone="tertiary">Evidence clusters at freeze</Text>{clusters.length ? <div className={s.stack}>{clusters.map((cluster) => <div key={cluster.cluster_id}><Text size="sm">{cluster.kind === "claim" ? "Claim" : "Account"}: {cluster.title}</Text>{cluster.description ? <Text size="xs" tone="tertiary">{cluster.description}</Text> : null}<Text size="xs" tone="tertiary">{cluster.observation_ids.length} grouped observation{cluster.observation_ids.length === 1 ? "" : "s"}</Text></div>)}</div> : <Text size="sm" tone="tertiary">No evidence clusters linked.</Text>}</section>;
}

function ClusterLinks({ ids, clusters, relations, error }: { ids: string[]; clusters: EvidenceCluster[]; relations: EvidenceRelation[]; error: Error | null }) {
  return <section className={s.briefSection}><Text size="xs" tone="tertiary">Authored evidence clusters</Text>{error ? <Failure error={error} /> : ids.length ? <div className={s.stack}>{ids.map((id) => { const found = clusters.find((one) => one.cluster_id === id); if (!found) return <Text key={id} size="xs" tone="tertiary">Cluster {id}</Text>; const coverage = clusterCoverage(found, relations); return <div key={id}><Text size="sm">{found.kind === "claim" ? "Claim" : "Account"}: {found.title}</Text><Text size="xs" tone="tertiary">{coverage.reviewed_observation_count}/{coverage.observation_count} observations touched by saved review · {coverage.contradicting_count} contradiction{coverage.contradicting_count === 1 ? "" : "s"}</Text>{found.description ? <Text size="xs" tone="tertiary">{found.description}</Text> : null}</div>; })}</div> : <Text size="sm" tone="tertiary">No evidence clusters linked.</Text>}</section>;
}

function QuestionLinks({ ids, questions, workspace, error }: { ids: string[]; questions: InvestigationQuestion[]; workspace: string; error: Error | null }) {
  return <section className={s.briefSection}><Text size="xs" tone="tertiary">Linked investigation questions</Text>{error ? <Failure error={error} /> : ids.length ? <div className={s.stack}>{ids.map((id) => { const found = questions.find((one) => one.question_id === id); return found ? <Link key={id} className={s.inlineLink} href={`${investigationPath(workspace, "questions")}?question=${encodeURIComponent(id)}`}>{found.question} <span className={s.muted}>({found.state})</span></Link> : <Text key={id} size="xs" tone="tertiary">Question {id}</Text>; })}</div> : <Text size="sm" tone="tertiary">No questions linked.</Text>}</section>;
}

function ConnectionLinks({ ids, connections, records, workspace, error }: { ids: string[]; connections: ResearchConnection[]; records: ResearchRecord[]; workspace: string; error: Error | null }) {
  const recordName = new Map(records.map((record) => [record.record_id, record.name]));
  return <section className={s.briefSection}><Text size="xs" tone="tertiary">Linked connections</Text>{error ? <Failure error={error} /> : ids.length ? <div className={s.stack}>{ids.map((id) => { const found = connections.find((one) => one.connection_id === id); return found ? <Link key={id} className={s.inlineLink} href={`${investigationPath(workspace, "connections")}?connection=${encodeURIComponent(id)}`}>{recordName.get(found.from_record_id) ?? found.from_record_id} → {recordName.get(found.to_record_id) ?? found.to_record_id} <span className={s.muted}>({found.kind} · {found.state})</span></Link> : <Text key={id} size="xs" tone="tertiary">Connection {id}</Text>; })}</div> : <Text size="sm" tone="tertiary">No connections linked.</Text>}</section>;
}

function EventLinks({ ids, events, workspace, error }: { ids: string[]; events: TimelineEvent[]; workspace: string; error: Error | null }) {
  return <section className={s.briefSection}><Text size="xs" tone="tertiary">Linked reported events</Text>{error ? <Failure error={error} /> : ids.length ? <div className={s.stack}>{ids.map((id) => { const found = events.find((one) => one.event_id === id); return found ? <Link key={id} className={s.inlineLink} href={`${investigationPath(workspace, "timeline")}?event=${encodeURIComponent(id)}`}>{found.title} <span className={s.muted}>({found.time_precision}{found.reported_time ? ` · ${found.reported_time}` : ""})</span></Link> : <Text key={id} size="xs" tone="tertiary">Event {id}</Text>; })}</div> : <Text size="sm" tone="tertiary">No events linked.</Text>}</section>;
}

function SnapshotConnectionLinks({ connections }: { connections: BriefSnapshot["connections"] }) {
  return <section className={s.briefSection}><Text size="xs" tone="tertiary">Connections at freeze</Text>{connections.length ? <div className={s.stack}>{connections.map((connection) => <div key={connection.connection_id}><Text size="sm">{connection.from_record_name} → {connection.to_record_name} <span className={s.muted}>({connection.kind} · {connection.state})</span></Text><Text size="xs" tone="tertiary">{connection.from_record_description || "No from-record description."} · {connection.to_record_description || "No to-record description."}</Text><Text size="xs" tone="tertiary">{connection.from_record_observation_ids.length + connection.to_record_observation_ids.length} endpoint record citation{connection.from_record_observation_ids.length + connection.to_record_observation_ids.length === 1 ? "" : "s"}</Text><Text size="xs" tone="tertiary">{connection.rationale}</Text></div>)}</div> : <Text size="sm" tone="tertiary">No connections linked.</Text>}</section>;
}

function SnapshotEventRelationshipLinks({ relationships, events, evidence, evidenceError, workspace }: { relationships: BriefSnapshot["event_relationships"]; events: BriefSnapshot["events"]; evidence: Evidence[]; evidenceError: Error | null; workspace: string }) {
  const titles = new Map(events.map((event) => [event.event_id, event.title]));
  return <section className={s.briefSection}><Text size="xs" tone="tertiary">Event relationships at freeze</Text>{relationships.length ? <div className={s.stack}>{relationships.map((relationship) => <div key={relationship.relationship_id}><Text size="sm">{titles.get(relationship.from_event_id) ?? relationship.from_event_id} → {titles.get(relationship.to_event_id) ?? relationship.to_event_id} <span className={s.muted}>({relationship.kind} · {relationship.state})</span></Text><Text size="xs" tone="tertiary">{relationship.rationale}</Text>{relationship.review_note ? <Text size="xs" tone="tertiary">Review note: {relationship.review_note}</Text> : null}<CitationDeltaLinks label="Supporting observations at freeze" ids={relationship.supporting_observation_ids ?? []} evidence={evidence} evidenceError={evidenceError} workspace={workspace} /><CitationDeltaLinks label="Opposing observations at freeze" ids={relationship.opposing_observation_ids ?? []} evidence={evidence} evidenceError={evidenceError} workspace={workspace} /></div>)}</div> : <Text size="sm" tone="tertiary">No event relationships linked.</Text>}</section>;
}

function SnapshotEventLinks({ events, workspace }: { events: BriefSnapshot["events"]; workspace: string }) {
  return <section className={s.briefSection}><Text size="xs" tone="tertiary">Events at freeze</Text>{events.length ? <div className={s.stack}>{events.map((event) => <div key={event.event_id}><Text size="sm">{event.title} <span className={s.muted}>({event.time_precision}{event.reported_time ? ` · ${event.reported_time}` : ""})</span></Text>{event.event_revision_id ? <Link className={s.inlineLink} href={eventRevisionHref(workspace, event.event_id, event.event_revision_id)}>Open frozen event revision{event.event_revision ? ` ${event.event_revision}` : ""}</Link> : <Text size="xs" tone="tertiary">Event revision was not pinned in this older handoff.</Text>}{event.location ? <Text size="xs" tone="tertiary">Location: {event.location}</Text> : null}{event.location_record ? <Text size="xs" tone="tertiary">Place record: {event.location_record.name}</Text> : null}{event.participant_records.length ? <Text size="xs" tone="tertiary">Participants: {event.participant_records.map((record) => record.name).join(", ")}</Text> : null}<Text size="xs" tone="tertiary">{event.observation_ids.length} event citation{event.observation_ids.length === 1 ? "" : "s"}</Text></div>)}</div> : <Text size="sm" tone="tertiary">No events linked.</Text>}</section>;
}
