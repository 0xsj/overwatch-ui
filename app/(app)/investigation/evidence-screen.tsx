"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Badge, Panel } from "@/components/display";
import { Button, Field, Input, Textarea } from "@/components/forms";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import { filterLoadedRows } from "@/lib/query/filter";
import { relationCounts, relationKinds, type BoardReviewState, type ClusterKind, type Evidence, type EvidenceBoardItem, type EvidenceCluster, type EvidenceClusterCoverage, type EvidenceComparison, type EvidenceComparisonFinding, type EvidenceQuestionSuggestionGap, type EvidenceQuestionSuggestions, type EvidenceRelation, type EvidenceSourceLink, type EvidenceSynthesis, type QuestionSuggestionGapKind, type RelationKind, type SynthesisCandidate, type WriteEvidenceCluster } from "@/lib/services/review";
import { questionGap, recordCoverage, type QuestionGap, type RecordCoverage } from "@/lib/services/review/coverage";
import type { InvestigationQuestion } from "@/lib/services/questions";
import { questionDraftHref, questionEvidenceHref, questionHref } from "@/lib/services/questions/navigation";
import { researchRecordCandidates, synthesisText, type ResearchRecordCandidate } from "@/lib/services/research-records/candidates";
import { recordCoverageQuestionDraft, recordHref } from "@/lib/services/research-records/navigation";
import type { ResearchRecord } from "@/lib/services/research-records";
import type { TimelineEvent } from "@/lib/services/events";
import { mayWriteResearch } from "../_route-context";
import { PageHead } from "../_components/page-head";
import { Query, useContext } from "../_hooks";
import { evidenceBoardQuery, evidenceByIDsQuery, evidenceClusterCoverageQuery, evidenceClustersQuery, evidenceComparisonsQuery, evidenceQuestionSuggestionsQuery, evidenceQuery, evidenceRelationsQuery, evidenceSourceLinksQuery, evidenceSynthesesQuery, eventsQuery, questionQuery, questionsQuery, researchRecordsQuery } from "../_queries";
import { createEvidenceClusterAction, createEvidenceComparisonAction, createEvidenceQuestionSuggestionsAction, createEvidenceSynthesisAction, setEvidenceRelationAction, setEvidenceSourceLinkAction, updateEvidenceClusterAction } from "./_actions";
import { authorLabel, dateLabel, Failure, MoreButton, investigationPath, ReviewBoundary, sourceHref, useResearchWrite } from "./_shared";
import s from "./investigation.module.css";

const relationLabels: Record<RelationKind, string> = {
  supports: "Supports",
  contradicts: "Contradicts",
  repeats: "Repeats",
  unresolved: "Unresolved",
};

const clusterLabels: Record<ClusterKind, string> = { claim: "Claim cluster", account: "Account cluster" };

const coverageStatusLabels: Record<RecordCoverage["status"], string> = {
  no_evidence: "No cited evidence",
  needs_corroboration: "Needs corroboration",
  contradiction_found: "Contradiction found",
  unresolved: "Unresolved review",
  review_incomplete: "Review incomplete",
  covered: "Covered",
};

const questionGapLabels: Record<QuestionGap["status"], string> = {
  resolved: "Not an open gap",
  no_evidence: "No linked evidence",
  not_compared: "Evidence not compared",
  partially_compared: "Review still incomplete",
  conflicted: "Conflicting evidence",
  reviewed: "Reviewed",
};

const clusterCoverageLabels: Record<EvidenceClusterCoverage["status"], string> = {
  no_evidence: "No cited evidence",
  needs_corroboration: "Needs corroboration",
  contradiction_found: "Contradiction found",
  unresolved: "Unresolved review",
  review_incomplete: "Review incomplete",
  covered: "Covered",
};

const boardStateLabels: Record<BoardReviewState, string> = {
  unreviewed: "Unreviewed",
  reviewed: "Reviewed",
  contradiction: "Contradiction found",
  unresolved: "Unresolved review",
};

const comparisonFindingLabels: Record<EvidenceComparisonFinding["kind"], string> = {
  agreement: "Shared detail",
  contradiction: "Human-marked contradiction",
  possible_repetition: "Possible repetition",
  unique_detail: "Unique detail",
  coverage_gap: "Coverage gap",
};

const questionSuggestionKindLabels: Record<QuestionSuggestionGapKind, string> = {
  unresolved_relation: "Unresolved relationship",
  contradiction: "Contradiction",
  corroboration_gap: "Corroboration gap",
  review_incomplete: "Review incomplete",
  open_question: "Open question",
};

function questionSuggestionGaps(records: ResearchRecord[], questions: InvestigationQuestion[], relations: EvidenceRelation[], clusters: EvidenceCluster[], clusterCoverage: EvidenceClusterCoverage[]): EvidenceQuestionSuggestionGap[] {
  const candidates: EvidenceQuestionSuggestionGap[] = [];
  const add = (kind: QuestionSuggestionGapKind, label: string, detail: string, ids: string[]) => {
    const observationIDs = [...new Set(ids)].slice(0, 12);
    if (!label.trim() || !observationIDs.length) return;
    candidates.push({ kind, label: label.trim(), detail: detail.trim(), observation_ids: observationIDs });
  };
  for (const record of records) {
    const coverage = recordCoverage(record, relations);
    const kind = coverage.status === "contradiction_found" ? "contradiction"
      : coverage.status === "needs_corroboration" ? "corroboration_gap"
        : coverage.status === "unresolved" ? "unresolved_relation"
          : coverage.status === "review_incomplete" ? "review_incomplete" : undefined;
    if (kind) add(kind, `${record.kind}: ${record.name}`, record.description ?? `Record coverage is ${coverage.status.replaceAll("_", " ")}.`, record.observation_ids);
  }
  for (const question of questions) {
    if (question.state !== "open") continue;
    const gap = questionGap(question, relations);
    const kind = gap.status === "conflicted" ? "contradiction" : gap.status === "not_compared" || gap.status === "partially_compared" ? "review_incomplete" : undefined;
    if (kind) add(kind, question.question, question.context ?? "The open question still has an unresolved evidence gap.", question.observation_ids);
  }
  const coverageByID = new Map(clusterCoverage.map((coverage) => [coverage.cluster_id, coverage]));
  for (const cluster of clusters) {
    const coverage = coverageByID.get(cluster.cluster_id);
    if (!coverage) continue;
    const kind = coverage.status === "contradiction_found" ? "contradiction"
      : coverage.status === "needs_corroboration" ? "corroboration_gap"
        : coverage.status === "unresolved" ? "unresolved_relation"
          : coverage.status === "review_incomplete" ? "review_incomplete" : undefined;
    if (kind) add(kind, `${cluster.kind}: ${cluster.title}`, cluster.description || `Cluster coverage is ${coverage.status.replaceAll("_", " ")}.`, cluster.observation_ids);
  }
  const seen = new Set<string>();
  return candidates.filter((gap) => {
    const key = `${gap.kind}:${gap.label}:${gap.observation_ids.join(",")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}

export function EvidenceScreen({ workspace }: { workspace: string }) {
  const { shell } = useContext();
  const searchParams = useSearchParams();
  const focusedQuestionID = searchParams.get("question")?.trim() ?? "";
  const focusedClusterID = searchParams.get("cluster")?.trim() ?? "";
  const requestedReturn = searchParams.get("return") ?? "";
  const returnTo = requestedReturn.startsWith(`/investigation/${encodeURIComponent(workspace)}/questions`) ? requestedReturn : "";
  const mayWrite = mayWriteResearch(shell?.context?.workspace);
  const [boardQuery, setBoardQuery] = useState("");
  const [boardSource, setBoardSource] = useState("");
  const [boardRecord, setBoardRecord] = useState("");
  const [boardEvent, setBoardEvent] = useState("");
  const [boardState, setBoardState] = useState<BoardReviewState | "">("");
  const [boardDateFrom, setBoardDateFrom] = useState("");
  const [boardDateTo, setBoardDateTo] = useState("");
  const [boardUnresolved, setBoardUnresolved] = useState(false);
  const evidence = useInfiniteQuery({
    queryKey: keys.evidence.list(workspace),
    queryFn: ({ pageParam }) => evidenceQuery(workspace, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });
  const board = useInfiniteQuery({
    queryKey: keys.evidence.board(workspace, boardQuery, boardSource, boardState, boardRecord, boardEvent, boardDateFrom, boardDateTo, boardUnresolved),
    queryFn: ({ pageParam }) => evidenceBoardQuery(workspace, pageParam, boardQuery, boardSource, boardState, boardRecord, boardEvent, boardDateFrom, boardDateTo, boardUnresolved),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });
  const relations = useInfiniteQuery({
    queryKey: keys.evidence.relations(workspace),
    queryFn: ({ pageParam }) => evidenceRelationsQuery(workspace, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });
  const sourceLinks = useInfiniteQuery({
    queryKey: keys.evidence.sourceLinks(workspace),
    queryFn: ({ pageParam }) => evidenceSourceLinksQuery(workspace, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });
  const syntheses = useInfiniteQuery({
    queryKey: keys.evidence.syntheses(workspace),
    queryFn: ({ pageParam }) => evidenceSynthesesQuery(workspace, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });
  const comparisons = useInfiniteQuery({
    queryKey: keys.evidence.comparisons(workspace),
    queryFn: ({ pageParam }) => evidenceComparisonsQuery(workspace, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });
  const questionSuggestions = useInfiniteQuery({
    queryKey: keys.evidence.questionSuggestions(workspace),
    queryFn: ({ pageParam }) => evidenceQuestionSuggestionsQuery(workspace, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });
  const records = useInfiniteQuery({
    queryKey: keys.records.list(workspace),
    queryFn: ({ pageParam }) => researchRecordsQuery(workspace, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });
  const events = useInfiniteQuery({
    queryKey: keys.events.list(workspace),
    queryFn: ({ pageParam }) => eventsQuery(workspace, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });
  const questions = useInfiniteQuery({
    queryKey: keys.questions.list(workspace),
    queryFn: ({ pageParam }) => questionsQuery(workspace, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });
  const clusters = useInfiniteQuery({
    queryKey: keys.evidence.clusters(workspace),
    queryFn: ({ pageParam }) => evidenceClustersQuery(workspace, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });
  const clusterCoverage = useInfiniteQuery({
    queryKey: keys.evidence.clusterCoverage(workspace),
    queryFn: ({ pageParam }) => evidenceClusterCoverageQuery(workspace, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });
  const rows = evidence.data?.pages.flatMap((page) => page.items) ?? [];
  const boardRows = board.data?.pages.flatMap((page) => page.items) ?? [];
  const relationRows = relations.data?.pages.flatMap((page) => page.items) ?? [];
  const sourceLinkRows = sourceLinks.data?.pages.flatMap((page) => page.items) ?? [];
  const synthesisHistory = syntheses.data?.pages.flatMap((page) => page.items) ?? [];
  const comparisonHistory = comparisons.data?.pages.flatMap((page) => page.items) ?? [];
  const questionSuggestionHistory = questionSuggestions.data?.pages.flatMap((page) => page.items) ?? [];
  const recordRows = records.data?.pages.flatMap((page) => page.items) ?? [];
  const eventRows = events.data?.pages.flatMap((page) => page.items) ?? [];
  const questionRows = questions.data?.pages.flatMap((page) => page.items) ?? [];
  const focusedQuestionFromPage = questionRows.find((question) => question.question_id === focusedQuestionID);
  const focusedQuestionQuery = useQuery({
    queryKey: keys.questions.one(workspace, focusedQuestionID),
    queryFn: () => questionQuery(workspace, focusedQuestionID),
    enabled: Boolean(focusedQuestionID) && !focusedQuestionFromPage,
    retry: false,
  });
  const focusedQuestion = focusedQuestionFromPage ?? focusedQuestionQuery.data;
  const focusedQuestionEvidence = useQuery({
    queryKey: keys.evidence.reviewEvidence(workspace, focusedQuestion?.observation_ids ?? []),
    queryFn: () => evidenceByIDsQuery(workspace, focusedQuestion!.observation_ids),
    enabled: Boolean(focusedQuestion?.observation_ids.length),
  });
  const clusterRows = clusters.data?.pages.flatMap((page) => page.items) ?? [];
  const clusterCoverageRows = clusterCoverage.data?.pages.flatMap((page) => page.items) ?? [];
  const relationObservationIDs = [...new Set(relationRows.flatMap((relation) => [relation.left_observation_id, relation.right_observation_id]))];
  const clusterObservationIDs = [...new Set(clusterRows.flatMap((cluster) => cluster.observation_ids))];
  const recordObservationIDs = [...new Set(recordRows.flatMap((record) => record.observation_ids))];
  const questionObservationIDs = [...new Set(questionRows.flatMap((question) => question.observation_ids))];
  const sourceLinkObservationIDs = [...new Set(sourceLinkRows.flatMap((link) => [link.downstream_observation_id, link.upstream_observation_id]))];
  const loadedEvidenceIDs = new Set(rows.map((row) => row.observation_id));
  const missingRelationObservationIDs = [...new Set([...relationObservationIDs, ...clusterObservationIDs, ...recordObservationIDs, ...questionObservationIDs, ...sourceLinkObservationIDs])].filter((id) => !loadedEvidenceIDs.has(id));
  const hydratedRelationEvidence = useQuery({
    queryKey: keys.evidence.reviewEvidence(workspace, missingRelationObservationIDs),
    queryFn: () => evidenceByIDsQuery(workspace, missingRelationObservationIDs),
    enabled: missingRelationObservationIDs.length > 0,
  });
  const allEvidenceByID = new Map<string, Evidence>(rows.map((row) => [row.observation_id, row]));
  for (const row of hydratedRelationEvidence.data ?? []) allEvidenceByID.set(row.observation_id, row);
  const [filter, setFilter] = useState("");
  const visibleRows = filterLoadedRows(rows, filter, (row) => [row.observation_id, row.source_id, row.source_title, row.statement, row.quote, row.capture_id]);
  const [selected, setSelected] = useState<string[]>([]);
  const [synthesisSelected, setSynthesisSelected] = useState<string[]>([]);
  const [clusterSelected, setClusterSelected] = useState<string[]>([]);
  const selectedRows = selected.map((id) => allEvidenceByID.get(id)).filter((row): row is Evidence => Boolean(row));
  const synthesisRows = synthesisSelected.map((id) => rows.find((row) => row.observation_id === id)).filter((row): row is Evidence => Boolean(row));
  const selectedRelation = selectedRows.length === 2
    ? relationRows.find((relation) => samePair(relation, selectedRows[0].observation_id, selectedRows[1].observation_id))
    : undefined;
  const suggestionGaps = questionSuggestionGaps(recordRows, questionRows, relationRows, clusterRows, clusterCoverageRows);

  function toggle(id: string) {
    setSelected((current) => current.includes(id)
      ? current.filter((one) => one !== id)
      : current.length >= 2 ? [current[1], id] : [...current, id]);
  }

  return <>
    <PageHead title="Evidence review">Review cited observations together without merging them. Record what the pair supports, contradicts, repeats, or leaves unresolved.</PageHead>
    {focusedQuestionID ? <Panel title="Evidence for selected question" note={focusedQuestion ? `${focusedQuestion.observation_ids.length} cited observation${focusedQuestion.observation_ids.length === 1 ? "" : "s"}` : undefined}>
      {focusedQuestionQuery.isPending && !focusedQuestion ? <Text size="sm" tone="tertiary">Opening the selected question…</Text> : focusedQuestionQuery.error && !focusedQuestion ? <Failure error={focusedQuestionQuery.error} /> : focusedQuestion ? <FocusedQuestionEvidence workspace={workspace} question={focusedQuestion} evidence={focusedQuestionEvidence.data ?? []} evidenceError={focusedQuestionEvidence.error} returnTo={returnTo} /> : <Text size="sm" tone="tertiary">The selected question is no longer available in this investigation.</Text>}
    </Panel> : null}
    <Panel title="Claims board" note={boardRows.length ? `${boardRows.length} loaded` : "Workspace-wide observation triage"}>
      <Query of={board} label="claims board">{() => <BoardPanel workspace={workspace} rows={boardRows} loadedEvidence={rows} records={recordRows} events={eventRows} query={boardQuery} setQuery={setBoardQuery} source={boardSource} setSource={setBoardSource} record={boardRecord} setRecord={setBoardRecord} event={boardEvent} setEvent={setBoardEvent} state={boardState} setState={setBoardState} dateFrom={boardDateFrom} setDateFrom={setBoardDateFrom} dateTo={boardDateTo} setDateTo={setBoardDateTo} unresolved={boardUnresolved} setUnresolved={setBoardUnresolved} selected={selected} select={toggle} moreAvailable={board.hasNextPage} morePending={board.isFetchingNextPage} loadMore={() => void board.fetchNextPage()} />}</Query>
    </Panel>
    <div className={s.readerColumns}>
      <Panel title="Cited observations" note={rows.length ? rows.length + " loaded" : undefined}>
        <Query of={evidence} label="cited observations">{() => <div className={s.stack}>
          {!rows.length ? (
            <div className={s.empty}>
              <Text size="sm">No cited observations yet.</Text>
              <Text size="sm" tone="tertiary">Open a captured source and record a precise observation before reviewing relationships.</Text>
              <Button asChild intent="ghost"><Link href={investigationPath(workspace, "sources")}>Open sources</Link></Button>
            </div>
          ) : (
            <div className={s.stack}>
              <Input aria-label="Filter cited observations" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter loaded observations" />
              <Text size="xs" tone="tertiary">Showing {visibleRows.length} of {rows.length} loaded observation{rows.length === 1 ? "" : "s"}.</Text>
              {visibleRows.length ? <div className={s.evidenceList}>
                {visibleRows.map((row) => <EvidenceCard key={row.observation_id} row={row} workspace={workspace} selected={selected.includes(row.observation_id)} select={() => toggle(row.observation_id)} synthesisSelected={synthesisSelected.includes(row.observation_id)} toggleSynthesis={() => setSynthesisSelected((current) => current.includes(row.observation_id) ? current.filter((one) => one !== row.observation_id) : current.length >= 6 ? [...current.slice(1), row.observation_id] : [...current, row.observation_id])} clusterSelected={clusterSelected.includes(row.observation_id)} toggleCluster={() => setClusterSelected((current) => current.includes(row.observation_id) ? current.filter((one) => one !== row.observation_id) : current.length >= 24 ? [...current.slice(1), row.observation_id] : [...current, row.observation_id])} />)}
              </div> : <Text size="sm" tone="tertiary">No loaded observations match. Clear the filter or load more.</Text>}
            </div>
          )}
          <MoreButton available={evidence.hasNextPage} pending={evidence.isFetchingNextPage} load={() => void evidence.fetchNextPage()} />
        </div>}</Query>
      </Panel>
      <div className={s.stack}>
        <Panel title="Compare observations" note="Select two cited observations">
          <Query of={relations} label="review decisions">{() => <ComparisonPanel key={selectedRows.map((row) => row.observation_id).join(":") + ":" + (selectedRelation?.relation_id ?? "new")} workspace={workspace} rows={selectedRows} relation={selectedRelation} relations={relationRows} mayWrite={mayWrite} shell={shell} hydrating={hydratedRelationEvidencePending(selected, selectedRows, hydratedRelationEvidence.isPending)} evidenceError={hydratedRelationEvidence.error} />}</Query>
        </Panel>
        <Panel title="Assisted comparison" note="Select two to six observations above">
          <Query of={comparisons} label="assisted comparisons">{() => <AssistedComparisonPanel workspace={workspace} rows={synthesisRows} saved={comparisonHistory} historyError={comparisons.error} mayWrite={mayWrite} moreAvailable={comparisons.hasNextPage} morePending={comparisons.isFetchingNextPage} loadMore={() => void comparisons.fetchNextPage()} />}</Query>
        </Panel>
        <Panel title="Next-question suggestions" note={suggestionGaps.length ? `${suggestionGaps.length} unresolved gap${suggestionGaps.length === 1 ? "" : "s"}` : "No grounded gaps loaded"}>
          <Query of={questionSuggestions} label="next-question suggestions">{() => <QuestionSuggestionPanel workspace={workspace} gaps={suggestionGaps} saved={questionSuggestionHistory} historyError={questionSuggestions.error} evidenceByID={allEvidenceByID} mayWrite={mayWrite} moreAvailable={questionSuggestions.hasNextPage} morePending={questionSuggestions.isFetchingNextPage} loadMore={() => void questionSuggestions.fetchNextPage()} />}</Query>
        </Panel>
        <Panel title="Source-chain review" note="Record qualified derivation suspicions">
          <Query of={sourceLinks} label="source-chain review">{() => <SourceChainPanel key={selectedRows.map((row) => row.observation_id).join(":")} workspace={workspace} rows={selectedRows} links={sourceLinkRows} mayWrite={mayWrite} moreAvailable={sourceLinks.hasNextPage} morePending={sourceLinks.isFetchingNextPage} loadMore={() => void sourceLinks.fetchNextPage()} />}</Query>
        </Panel>
        <Panel title="Review ledger" note={relationRows.length ? `${relationRows.length} loaded` : "Saved pair decisions"}>
          <Query of={relations} label="review ledger">{() => <ReviewLedger workspace={workspace} relations={relationRows} evidenceByID={allEvidenceByID} error={hydratedRelationEvidence.error} moreAvailable={relations.hasNextPage} morePending={relations.isFetchingNextPage} loadMore={() => void relations.fetchNextPage()} select={(left, right) => setSelected([left, right])} />}</Query>
        </Panel>
        <Panel title="Assisted synthesis" note="Select up to six observations">
          <SynthesisPanel workspace={workspace} rows={synthesisRows} mayWrite={mayWrite} saved={synthesisHistory} historyError={syntheses.error} moreAvailable={syntheses.hasNextPage} morePending={syntheses.isFetchingNextPage} loadMore={() => void syntheses.fetchNextPage()} />
        </Panel>
        <Panel title="Evidence clusters" note={clusterRows.length ? `${clusterRows.length} saved` : "Claim or account groupings"}>
          <Query of={clusters} label="evidence clusters">{() => <Query of={clusterCoverage} label="cluster review coverage">{() => <ClusterPanel workspace={workspace} initialClusterID={focusedClusterID} saved={clusterRows} coverage={clusterCoverageRows} coverageError={clusterCoverage.error} evidence={rows} evidenceByID={allEvidenceByID} selectedIDs={clusterSelected} setSelectedIDs={setClusterSelected} error={hydratedRelationEvidence.error} mayWrite={mayWrite} moreAvailable={clusters.hasNextPage} morePending={clusters.isFetchingNextPage} loadMore={() => void clusters.fetchNextPage()} coverageMoreAvailable={clusterCoverage.hasNextPage} coverageMorePending={clusterCoverage.isFetchingNextPage} loadMoreCoverage={() => void clusterCoverage.fetchNextPage()} />}</Query>}</Query>
        </Panel>
      </div>
    </div>
    <Panel title="Corroboration & gaps" note="Derived from authored clusters, record citations, saved pair decisions, and open questions">
      <Query of={records} label="research record coverage">{() => <Query of={questions} label="question coverage">{() => <CoverageBoard workspace={workspace} records={recordRows} questions={questionRows} relations={relationRows} clusters={clusterRows} clusterCoverage={clusterCoverageRows} evidenceByID={allEvidenceByID} recordsHasNext={records.hasNextPage} recordsFetchingNext={records.isFetchingNextPage} fetchMoreRecords={() => void records.fetchNextPage()} questionsHasNext={questions.hasNextPage} questionsFetchingNext={questions.isFetchingNextPage} fetchMoreQuestions={() => void questions.fetchNextPage()} relationsHasNext={relations.hasNextPage} relationsFetchingNext={relations.isFetchingNextPage} fetchMoreRelations={() => void relations.fetchNextPage()} clustersHasNext={clusters.hasNextPage} clustersFetchingNext={clusters.isFetchingNextPage} fetchMoreClusters={() => void clusters.fetchNextPage()} clusterCoverageHasNext={clusterCoverage.hasNextPage} clusterCoverageFetchingNext={clusterCoverage.isFetchingNextPage} fetchMoreClusterCoverage={() => void clusterCoverage.fetchNextPage()} />}</Query>}</Query>
    </Panel>
  </>;
}

function SourceChainPanel({ workspace, rows, links, mayWrite, moreAvailable, morePending, loadMore }: { workspace: string; rows: Evidence[]; links: EvidenceSourceLink[]; mayWrite: boolean; moreAvailable: boolean; morePending: boolean; loadMore: () => void }) {
  const [downstream, setDownstream] = useState(rows[0]?.observation_id ?? "");
  const [upstream, setUpstream] = useState(rows[1]?.observation_id ?? "");
  const existing = links.find((link) => link.downstream_observation_id === downstream && link.upstream_observation_id === upstream);
  const [rationale, setRationale] = useState(existing?.rationale ?? "");
  const save = useResearchWrite(
    () => setEvidenceSourceLinkAction(workspace, { downstream_observation_id: downstream, upstream_observation_id: upstream, rationale }),
    [keys.evidence.sourceLinks(workspace)],
  );
  const byID = new Map(rows.map((row) => [row.observation_id, row]));
  return <div className={s.stack}>
    <Text size="sm" tone="tertiary">Mark one selected observation as possibly derived from the other. This is an analyst suspicion, not proven provenance; cycle flags are warnings for review.</Text>
    {rows.length < 2 ? <div className={s.empty}><Text size="sm">Choose two observations to record a source-chain suspicion.</Text><Text size="sm" tone="tertiary">Use the claims board or cited-observation list above to select a pair.</Text></div> : <>
      {mayWrite ? <form className={s.stack} onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
        <Field label="Possibly derivative observation" required>{(aria) => <select {...aria} className={s.select} value={downstream} onChange={(event) => { setDownstream(event.target.value); setRationale(links.find((link) => link.downstream_observation_id === event.target.value && link.upstream_observation_id === upstream)?.rationale ?? ""); }}>{rows.map((row) => <option key={row.observation_id} value={row.observation_id}>{row.source_title}: {row.statement}</option>)}</select>}</Field>
        <Field label="Possible upstream observation" required>{(aria) => <select {...aria} className={s.select} value={upstream} onChange={(event) => { setUpstream(event.target.value); setRationale(links.find((link) => link.downstream_observation_id === downstream && link.upstream_observation_id === event.target.value)?.rationale ?? ""); }}>{rows.filter((row) => row.observation_id !== downstream).map((row) => <option key={row.observation_id} value={row.observation_id}>{row.source_title}: {row.statement}</option>)}</select>}</Field>
        <Field label="Rationale" hint="Explain the signal: matching wording, an explicit citation, timing, or another qualified reason." required>{(aria) => <Textarea {...aria} value={rationale} onChange={(event) => setRationale(event.target.value)} placeholder="The later notice appears to repeat the earlier report's distinctive wording." />}</Field>
        <Failure error={save.error} />
        {save.isSuccess ? <Text size="sm" tone="accent" role="status">Source-chain note saved.</Text> : null}
        <Button type="submit" intent="primary" loading={save.isPending}>{existing ? "Update source-chain note" : "Save source-chain note"}</Button>
      </form> : <Text size="sm" tone="tertiary">This investigation is read-only. Existing source-chain notes remain visible, but new suspicions require write access.</Text>}
      {existing ? <SourceLinkCard workspace={workspace} link={existing} evidenceByID={byID} /> : null}
    </>}
    {links.length ? <div className={s.details}><Text size="sm">Saved source-chain notes</Text><div className={s.stack}>{links.map((link) => <SourceLinkCard key={link.source_link_id} workspace={workspace} link={link} evidenceByID={byID} />)}</div></div> : null}
    <MoreButton available={moreAvailable} pending={morePending} load={loadMore} />
  </div>;
}

function SourceLinkCard({ workspace, link, evidenceByID }: { workspace: string; link: EvidenceSourceLink; evidenceByID: Map<string, Evidence> }) {
  const downstream = evidenceByID.get(link.downstream_observation_id);
  const upstream = evidenceByID.get(link.upstream_observation_id);
  const downstreamTitle = downstream?.source_title ?? link.downstream_source_title;
  const upstreamTitle = upstream?.source_title ?? link.upstream_source_title;
  const downstreamCapture = downstream?.capture_id ?? link.downstream_capture_id;
  const upstreamCapture = upstream?.capture_id ?? link.upstream_capture_id;
  const downstreamSource = downstream?.source_id ?? link.downstream_source_id;
  const upstreamSource = upstream?.source_id ?? link.upstream_source_id;
  return <article className={s.coverageCard}>
    <div className={s.row}><Badge tone={link.cycle_detected ? "crit" : "warn"}>{link.cycle_detected ? "Circular reporting warning" : "Possible derivation"}</Badge><span className={s.muted}>Updated {dateLabel(link.updated_at)}</span></div>
    <Text size="sm">{downstreamSource && downstreamCapture ? <Link className={s.inlineLink} href={sourceHref(workspace, downstreamSource, downstreamCapture, link.downstream_observation_id, investigationPath(workspace, "evidence"))}>{downstreamTitle || "Downstream observation"}</Link> : downstreamTitle || "Downstream observation"} may derive from {upstreamSource && upstreamCapture ? <Link className={s.inlineLink} href={sourceHref(workspace, upstreamSource, upstreamCapture, link.upstream_observation_id, investigationPath(workspace, "evidence"))}>{upstreamTitle || "upstream observation"}</Link> : upstreamTitle || "upstream observation"}.</Text>
    <Text size="xs" tone="tertiary">{downstream?.statement ?? link.downstream_statement} ← {upstream?.statement ?? link.upstream_statement}</Text>
    <Text size="sm">{link.rationale}</Text>
  </article>;
}

function BoardPanel({ workspace, rows, loadedEvidence, records, events, query, setQuery, source, setSource, record, setRecord, event, setEvent, state, setState, dateFrom, setDateFrom, dateTo, setDateTo, unresolved, setUnresolved, selected, select, moreAvailable, morePending, loadMore }: {
  workspace: string;
  rows: EvidenceBoardItem[];
  loadedEvidence: Evidence[];
  records: ResearchRecord[];
  events: TimelineEvent[];
  query: string;
  setQuery: (value: string) => void;
  source: string;
  setSource: (value: string) => void;
  record: string;
  setRecord: (value: string) => void;
  event: string;
  setEvent: (value: string) => void;
  state: BoardReviewState | "";
  setState: (value: BoardReviewState | "") => void;
  dateFrom: string;
  setDateFrom: (value: string) => void;
  dateTo: string;
  setDateTo: (value: string) => void;
  unresolved: boolean;
  setUnresolved: (value: boolean) => void;
  selected: string[];
  select: (id: string) => void;
  moreAvailable: boolean;
  morePending: boolean;
  loadMore: () => void;
}) {
  const sourceOptions = [...new Map(loadedEvidence.map((row) => [row.source_id, row.source_title])).entries()].sort((left, right) => left[1].localeCompare(right[1]));
  const recordOptions = records.slice().sort((left, right) => left.name.localeCompare(right.name));
  const eventOptions = events.slice().sort((left, right) => left.title.localeCompare(right.title));
  const contradictionCount = rows.filter((row) => row.review_state === "contradiction").length;
  const unresolvedCount = rows.filter((row) => row.review_state === "unresolved").length;
  return <div className={s.stack}>
    <Text size="sm" tone="tertiary">A derived workspace-wide view of cited observations. Review state summarizes saved pair decisions and cluster membership; it does not establish truth, identity, or source independence.</Text>
    <div className={s.row}><Badge tone={rows.length ? "neutral" : "accent"}>{rows.length} observation{rows.length === 1 ? "" : "s"}</Badge><Badge tone={contradictionCount ? "crit" : "neutral"}>{contradictionCount} contradiction{contradictionCount === 1 ? "" : "s"}</Badge><Badge tone={unresolvedCount ? "warn" : "neutral"}>{unresolvedCount} unresolved</Badge></div>
    <div className={s.row}>
      <Input aria-label="Search claims board" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search source, statement, quote, or locator" />
      <Field label="Source">{(aria) => <select {...aria} className={s.select} value={source} onChange={(event) => setSource(event.target.value)}><option value="">All loaded sources</option>{sourceOptions.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select>}</Field>
      <Field label="Record">{(aria) => <select {...aria} className={s.select} value={record} onChange={(event) => setRecord(event.target.value)}><option value="">All records</option>{recordOptions.map((one) => <option key={one.record_id} value={one.record_id}>{one.name}</option>)}</select>}</Field>
      <Field label="Event">{(aria) => <select {...aria} className={s.select} value={event} onChange={(event) => setEvent(event.target.value)}><option value="">All events</option>{eventOptions.map((one) => <option key={one.event_id} value={one.event_id}>{one.title}</option>)}</select>}</Field>
      <Field label="Review state">{(aria) => <select {...aria} className={s.select} value={state} onChange={(event) => setState(event.target.value as BoardReviewState | "")}><option value="">All states</option>{Object.entries(boardStateLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}</Field>
    </div>
    <div className={s.row}>
      <Field label="Recorded from">{(aria) => <Input {...aria} type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />}</Field>
      <Field label="Recorded through">{(aria) => <Input {...aria} type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />}</Field>
      <label className={s.checkboxLabel}><input type="checkbox" checked={unresolved} onChange={(event) => setUnresolved(event.target.checked)} /><span>Only unresolved evidence</span></label>
    </div>
    {rows.length ? <div className={s.stack}>{rows.map((row) => <BoardCard key={row.observation_id} workspace={workspace} row={row} selected={selected.includes(row.observation_id)} select={() => select(row.observation_id)} />)}</div> : <div className={s.empty}><Text size="sm">No observations match this board view.</Text><Text size="sm" tone="tertiary">Record a precise citation from a retained source, or clear the filters to inspect the full investigation.</Text></div>}
    <MoreButton available={moreAvailable} pending={morePending} load={loadMore} />
  </div>;
}

function BoardCard({ workspace, row, selected, select }: { workspace: string; row: EvidenceBoardItem; selected: boolean; select: () => void }) {
  const tone = row.review_state === "contradiction" ? "crit" : row.review_state === "unresolved" ? "warn" : row.review_state === "reviewed" ? "accent" : "neutral";
  return <article className={s.evidenceCard}>
    <div className={s.row}><Badge tone={tone}>{boardStateLabels[row.review_state]}</Badge><Link className={s.inlineLink} href={sourceHref(workspace, row.source_id, row.capture_id, row.observation_id, investigationPath(workspace, "evidence"))}>{row.source_title}</Link><span className={s.muted}>{dateLabel(row.recorded_at)}</span></div>
    <Text size="sm" className={s.evidenceStatement}>{row.statement}</Text>
    <blockquote className={s.quote}>{row.quote}</blockquote>
    <div className={s.row}><Text size="xs" tone="tertiary">{row.supports} supporting · {row.contradicts} contradicting · {row.repeats} repeating · {row.unresolved} unresolved · {row.cluster_count} cluster{row.cluster_count === 1 ? "" : "s"}</Text><Button type="button" size="sm" intent={selected ? "primary" : "ghost"} onClick={select}>{selected ? "Selected for comparison" : "Compare this"}</Button></div>
  </article>;
}

function CoverageBoard({ workspace, records, questions, relations, clusters, clusterCoverage, evidenceByID, recordsHasNext, recordsFetchingNext, fetchMoreRecords, questionsHasNext, questionsFetchingNext, fetchMoreQuestions, relationsHasNext, relationsFetchingNext, fetchMoreRelations, clustersHasNext, clustersFetchingNext, fetchMoreClusters, clusterCoverageHasNext, clusterCoverageFetchingNext, fetchMoreClusterCoverage }: { workspace: string; records: ResearchRecord[]; questions: InvestigationQuestion[]; relations: EvidenceRelation[]; clusters: EvidenceCluster[]; clusterCoverage: EvidenceClusterCoverage[]; evidenceByID: Map<string, Evidence>; recordsHasNext: boolean; recordsFetchingNext: boolean; fetchMoreRecords: () => void; questionsHasNext: boolean; questionsFetchingNext: boolean; fetchMoreQuestions: () => void; relationsHasNext: boolean; relationsFetchingNext: boolean; fetchMoreRelations: () => void; clustersHasNext: boolean; clustersFetchingNext: boolean; fetchMoreClusters: () => void; clusterCoverageHasNext: boolean; clusterCoverageFetchingNext: boolean; fetchMoreClusterCoverage: () => void }) {
  const [filter, setFilter] = useState("");
  const recordCoverageRows = records.map((record) => ({ record, coverage: recordCoverage(record, relations) }));
  const questionGapRows = questions.filter((question) => question.state === "open").map((question) => ({ question, gap: questionGap(question, relations) }));
  const coverageByCluster = new Map(clusterCoverage.map((coverage) => [coverage.cluster_id, coverage]));
  const clusterGapRows = clusters.flatMap((cluster) => {
    const coverage = coverageByCluster.get(cluster.cluster_id);
    return coverage && coverage.status !== "covered" ? [{ cluster, coverage }] : [];
  });
  const visibleRecords = filterLoadedRows(recordCoverageRows, filter, ({ record, coverage }) => [record.record_id, record.name, record.kind, record.description ?? "", coverage.status]);
  const visibleQuestions = filterLoadedRows(questionGapRows, filter, ({ question, gap }) => [question.question_id, question.question, question.context ?? "", gap.status]);
  const visibleClusters = filterLoadedRows(clusterGapRows, filter, ({ cluster, coverage }) => [cluster.cluster_id, cluster.title, cluster.description, cluster.kind, coverage.status]);
  const contradictionCount = recordCoverageRows.filter(({ coverage }) => coverage.status === "contradiction_found").length;
  const recordGapCount = recordCoverageRows.filter(({ coverage }) => coverage.status !== "covered").length;
  const questionGapCount = questionGapRows.filter(({ gap }) => gap.is_gap).length;
  return <div className={s.stack}>
    <Text size="sm" tone="tertiary">This is a derived review queue, not an identity or truth engine. It shows where authored records and open questions need more analyst attention.</Text>
    <div className={s.row}><Badge tone={clusterGapRows.length ? "warn" : "accent"}>{clusterGapRows.length} cluster gap{clusterGapRows.length === 1 ? "" : "s"}</Badge><Badge tone={contradictionCount ? "crit" : "neutral"}>{contradictionCount} record contradiction{contradictionCount === 1 ? "" : "s"}</Badge><Badge tone={recordGapCount ? "warn" : "accent"}>{recordGapCount} record gap{recordGapCount === 1 ? "" : "s"}</Badge><Badge tone={questionGapCount ? "warn" : "accent"}>{questionGapCount} open question gap{questionGapCount === 1 ? "" : "s"}</Badge></div>
    {relationsHasNext ? <Text size="xs" tone="tertiary">Coverage uses {relations.length} loaded pair decision{relations.length === 1 ? "" : "s"}; load more to extend the derived review queue.</Text> : null}
    {(clusters.length || records.length || questionGapRows.length) ? <Input aria-label="Filter corroboration and gaps" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter clusters, records, questions, or review status" /> : null}
    <section className={s.stack}>
      <div className={s.row}><Text size="sm">Claim and account gaps</Text><span className={s.muted}>{clusters.length} loaded</span></div>
      {visibleClusters.length ? <div className={s.stack}>{visibleClusters.map(({ cluster, coverage }) => <ClusterGapCard key={cluster.cluster_id} workspace={workspace} cluster={cluster} coverage={coverage} evidenceByID={evidenceByID} />)}</div> : <Text size="sm" tone="tertiary">{clusterGapRows.length ? "No loaded cluster gaps match." : clusters.length ? "No loaded clusters currently need corroboration review." : "No authored claim or account clusters yet."}</Text>}
      <div className={s.row}><MoreButton available={clustersHasNext} pending={clustersFetchingNext} load={fetchMoreClusters} /><MoreButton available={clusterCoverageHasNext} pending={clusterCoverageFetchingNext} load={fetchMoreClusterCoverage} /></div>
    </section>
    <div className={s.coverageColumns}>
      <section className={s.stack}>
        <div className={s.row}><Text size="sm">Record coverage</Text><span className={s.muted}>{records.length} loaded</span></div>
        {visibleRecords.length ? <div className={s.stack}>{visibleRecords.map(({ record, coverage }) => <CoverageRecordCard key={record.record_id} workspace={workspace} record={record} coverage={coverage} evidenceByID={evidenceByID} />)}</div> : <Text size="sm" tone="tertiary">{records.length ? "No loaded records match." : "No authored records yet."}</Text>}
        <MoreButton available={recordsHasNext} pending={recordsFetchingNext} load={fetchMoreRecords} />
      </section>
      <section className={s.stack}>
        <div className={s.row}><Text size="sm">Open question gaps</Text><span className={s.muted}>{questionGapRows.length} open</span></div>
        {visibleQuestions.length ? <div className={s.stack}>{visibleQuestions.map(({ question, gap }) => <QuestionGapCard key={question.question_id} workspace={workspace} question={question} gap={gap} evidenceByID={evidenceByID} />)}</div> : <Text size="sm" tone="tertiary">{questionGapRows.length ? "No open questions match." : "No open question gaps."}</Text>}
        <MoreButton available={questionsHasNext} pending={questionsFetchingNext} load={fetchMoreQuestions} />
      </section>
    </div>
    <MoreButton available={relationsHasNext} pending={relationsFetchingNext} load={fetchMoreRelations} />
  </div>;
}

function CoverageRecordCard({ workspace, record, coverage, evidenceByID }: { workspace: string; record: ResearchRecord; coverage: RecordCoverage; evidenceByID: Map<string, Evidence> }) {
  const tone = coverage.status === "contradiction_found" ? "crit" : coverage.status === "covered" ? "accent" : "warn";
  const questionDraft = recordCoverageQuestionDraft({ recordId: record.record_id, name: record.name, kind: record.kind, description: record.description, status: coverage.status, observationCount: coverage.observation_count, supportingCount: coverage.supporting_count, contradictingCount: coverage.contradicting_count, unresolvedCount: coverage.unresolved_count, observationIds: record.observation_ids });
  return <article className={s.coverageCard}>
    <div className={s.row}><Badge tone={tone}>{coverageStatusLabels[coverage.status]}</Badge><Link className={s.inlineLink} href={`${investigationPath(workspace, "records")}?record=${encodeURIComponent(record.record_id)}`}>{record.name}</Link><span className={s.muted}>{record.kind}</span></div>
    <Text size="xs" tone="tertiary">{coverage.observation_count} cited observation{coverage.observation_count === 1 ? "" : "s"} · {coverage.reviewed_observation_count} touched by saved review</Text>
    <Text size="xs" tone="tertiary">{coverage.supporting_count} supporting · {coverage.contradicting_count} contradicting · {coverage.repeating_count} repeating · {coverage.unresolved_count} unresolved</Text>
    {coverage.unreviewed_internal_pairs ? <Text size="xs" tone="tertiary">{coverage.unreviewed_internal_pairs} of {coverage.possible_internal_pairs} internal comparison{coverage.possible_internal_pairs === 1 ? "" : "s"} still need review.</Text> : null}
    <CoverageCitations workspace={workspace} observationIDs={record.observation_ids} evidenceByID={evidenceByID} />
    {coverage.status !== "covered" ? <Link className={s.inlineLink} href={questionDraftHref(workspace, questionDraft, investigationPath(workspace, "evidence"))}>Draft a question about this record gap</Link> : null}
  </article>;
}

function FocusedQuestionEvidence({ workspace, question, evidence, evidenceError, returnTo }: { workspace: string; question: InvestigationQuestion; evidence: Evidence[]; evidenceError: Error | null; returnTo: string }) {
  const evidenceReturn = questionEvidenceHref(workspace, question.question_id, returnTo || undefined);
  const stateTone = question.state === "open" ? "warn" : question.state === "answered" ? "accent" : question.state === "deferred" ? "info" : "neutral";
  return <div className={s.stack}>
    <div className={s.row}><Badge tone={stateTone}>{question.state}</Badge><Link className={s.inlineLink} href={questionHref(workspace, question.question_id, returnTo || undefined)}>Open question</Link></div>
    {question.context ? <Text size="sm" tone="tertiary">{question.context}</Text> : null}
    {evidenceError ? <Failure error={evidenceError} /> : null}
    {question.observation_ids.length ? <CoverageCitations workspace={workspace} observationIDs={question.observation_ids} evidenceByID={new Map(evidence.map((row) => [row.observation_id, row]))} returnTo={evidenceReturn} /> : <Text size="sm" tone="tertiary">No cited observations are attached to this question yet.</Text>}
  </div>;
}

function QuestionGapCard({ workspace, question, gap, evidenceByID }: { workspace: string; question: InvestigationQuestion; gap: QuestionGap; evidenceByID: Map<string, Evidence> }) {
  return <article className={s.coverageCard}>
    <div className={s.row}><Badge tone={gap.is_gap ? "warn" : "accent"}>{questionGapLabels[gap.status]}</Badge><Link className={s.inlineLink} href={questionHref(workspace, question.question_id, investigationPath(workspace, "evidence"))}>{question.question}</Link></div>
    {question.context ? <Text size="xs" tone="tertiary">{question.context}</Text> : null}
    <Text size="xs" tone="tertiary">{gap.cited_observation_count} cited observation{gap.cited_observation_count === 1 ? "" : "s"} · {gap.compared_observation_count} compared · {gap.unresolved_relation_count} unresolved relation{gap.unresolved_relation_count === 1 ? "" : "s"}{gap.contradicting_relation_count ? ` · ${gap.contradicting_relation_count} contradiction${gap.contradicting_relation_count === 1 ? "" : "s"}` : ""}</Text>
    <CoverageCitations workspace={workspace} observationIDs={question.observation_ids} evidenceByID={evidenceByID} />
  </article>;
}

function ClusterGapCard({ workspace, cluster, coverage, evidenceByID }: { workspace: string; cluster: EvidenceCluster; coverage: EvidenceClusterCoverage; evidenceByID: Map<string, Evidence> }) {
  const tone = coverage.status === "contradiction_found" ? "crit" : "warn";
  const prompt = `What would corroborate or challenge “${cluster.title}”?`;
  const context = `${cluster.description ? `${cluster.description.slice(0, 700)} ` : ""}This ${cluster.kind} grouping has ${coverage.observation_count} cited observation${coverage.observation_count === 1 ? "" : "s"} across ${coverage.distinct_source_count} retained source${coverage.distinct_source_count === 1 ? "" : "s"}. Treat source count as coverage, not proof of independence.`;
  return <article className={s.coverageCard}>
    <div className={s.row}><Badge tone={tone}>{clusterCoverageLabels[coverage.status]}</Badge><Text size="sm">{clusterLabels[cluster.kind]} · {cluster.title}</Text></div>
    <Text size="xs" tone="tertiary">{coverage.observation_count} cited observation{coverage.observation_count === 1 ? "" : "s"} · {coverage.distinct_source_count} distinct retained source{coverage.distinct_source_count === 1 ? "" : "s"} · {coverage.supporting_count} supporting · {coverage.contradicting_count} contradicting · {coverage.repeating_count} repeating</Text>
    {coverage.unreviewed_internal_pairs ? <Text size="xs" tone="tertiary">{coverage.unreviewed_internal_pairs} of {coverage.possible_internal_pairs} internal comparison{coverage.possible_internal_pairs === 1 ? "" : "s"} still need review.</Text> : null}
    <CoverageCitations workspace={workspace} observationIDs={cluster.observation_ids} evidenceByID={evidenceByID} />
    <Link className={s.inlineLink} href={questionDraftHref(workspace, { prompt, context, observation_ids: cluster.observation_ids.slice(0, 8), origin: { kind: "cluster", id: cluster.cluster_id } }, investigationPath(workspace, "evidence"))}>Draft an investigation question</Link>
  </article>;
}

function CoverageCitations({ workspace, observationIDs, evidenceByID, returnTo }: { workspace: string; observationIDs: string[]; evidenceByID: Map<string, Evidence>; returnTo?: string }) {
  if (!observationIDs.length) return null;
  return <div className={s.stack}><Text size="xs" tone="tertiary">Exact cited observations</Text>{observationIDs.map((id) => {
    const row = evidenceByID.get(id);
    return row ? <Link key={id} className={s.inlineLink} href={sourceHref(workspace, row.source_id, row.capture_id, row.observation_id, returnTo ?? investigationPath(workspace, "evidence"))}>{row.source_title}: {row.statement}</Link> : <Text key={id} size="xs" tone="tertiary">Observation {id} is not available in the current evidence context.</Text>;
  })}</div>;
}

function hydratedRelationEvidencePending(selected: string[], rows: Evidence[], pending: boolean) {
  return selected.length === 2 && rows.length < 2 && pending;
}

function ClusterPanel({ workspace, initialClusterID, saved, coverage, coverageError, evidence, evidenceByID, selectedIDs, setSelectedIDs, error, mayWrite, moreAvailable, morePending, loadMore, coverageMoreAvailable, coverageMorePending, loadMoreCoverage }: { workspace: string; initialClusterID?: string; saved: EvidenceCluster[]; coverage: EvidenceClusterCoverage[]; coverageError: Error | null; evidence: Evidence[]; evidenceByID: Map<string, Evidence>; selectedIDs: string[]; setSelectedIDs: (ids: string[]) => void; error: Error | null; mayWrite: boolean; moreAvailable: boolean; morePending: boolean; loadMore: () => void; coverageMoreAvailable: boolean; coverageMorePending: boolean; loadMoreCoverage: () => void }) {
  const [view, setView] = useState(() => initialClusterID || "__new__");
  const selected = view === "__new__" ? undefined : saved.find((cluster) => cluster.cluster_id === view);
  return <div className={s.stack}>
    {saved.length ? <ClusterCoverageBoard workspace={workspace} clusters={saved} coverage={coverage} error={coverageError} moreAvailable={coverageMoreAvailable} morePending={coverageMorePending} loadMore={loadMoreCoverage} /> : null}
    {saved.length ? <Field label="Saved cluster">{(aria) => <select {...aria} className={s.select} value={view} onChange={(event) => setView(event.target.value)}><option value="__new__">New cluster from selected observations</option>{saved.map((cluster) => <option key={cluster.cluster_id} value={cluster.cluster_id}>{clusterLabels[cluster.kind]} · {cluster.title}</option>)}</select>}</Field> : null}
    <ClusterEditor key={view} workspace={workspace} cluster={selected} evidence={evidence} evidenceByID={evidenceByID} selectedIDs={selectedIDs} setSelectedIDs={setSelectedIDs} error={error} mayWrite={mayWrite} saved={(cluster) => setView(cluster.cluster_id)} />
    <MoreButton available={moreAvailable} pending={morePending} load={loadMore} />
  </div>;
}

function ClusterCoverageBoard({ workspace, clusters, coverage, error, moreAvailable, morePending, loadMore }: { workspace: string; clusters: EvidenceCluster[]; coverage: EvidenceClusterCoverage[]; error: Error | null; moreAvailable: boolean; morePending: boolean; loadMore: () => void }) {
  const byID = new Map(coverage.map((row) => [row.cluster_id, row]));
  return <section className={s.details}><div className={s.row}><Text size="sm">Cluster review coverage</Text><Link className={s.inlineLink} href={investigationPath(workspace, "brief")}>Use clusters in brief</Link></div><Text size="xs" tone="tertiary">Coverage is calculated across every saved internal pair, not just the currently loaded relation ledger. It does not establish truth or source independence.</Text><Failure error={error} /><div className={s.stack}>{clusters.map((cluster) => { const found = byID.get(cluster.cluster_id); return found ? <ClusterCoverageCard key={cluster.cluster_id} cluster={cluster} coverage={found} /> : <Text key={cluster.cluster_id} size="xs" tone="tertiary">Coverage for {cluster.title} is not loaded yet.</Text>; })}</div><MoreButton available={moreAvailable} pending={morePending} load={loadMore} /></section>;
}

function ClusterCoverageCard({ cluster, coverage }: { cluster: EvidenceCluster; coverage: EvidenceClusterCoverage }) {
  const tone = coverage.status === "contradiction_found" ? "crit" : coverage.status === "covered" ? "accent" : "warn";
  return <article className={s.coverageCard}><div className={s.row}><Badge tone={tone}>{clusterCoverageLabels[coverage.status]}</Badge><Text size="sm">{clusterLabels[cluster.kind]} · {cluster.title}</Text></div><Text size="xs" tone="tertiary">{coverage.observation_count} cited observation{coverage.observation_count === 1 ? "" : "s"} · {coverage.distinct_source_count} distinct retained source{coverage.distinct_source_count === 1 ? "" : "s"} · {coverage.reviewed_observation_count} touched by saved review</Text><Text size="xs" tone="tertiary">{coverage.supporting_count} supporting · {coverage.contradicting_count} contradicting · {coverage.repeating_count} repeating · {coverage.unresolved_count} unresolved</Text>{coverage.unreviewed_internal_pairs ? <Text size="xs" tone="tertiary">{coverage.unreviewed_internal_pairs} of {coverage.possible_internal_pairs} internal comparison{coverage.possible_internal_pairs === 1 ? "" : "s"} still need review.</Text> : null}</article>;
}

function ClusterEditor({ workspace, cluster, evidence, evidenceByID, selectedIDs, setSelectedIDs, error, mayWrite, saved }: { workspace: string; cluster?: EvidenceCluster; evidence: Evidence[]; evidenceByID: Map<string, Evidence>; selectedIDs: string[]; setSelectedIDs: (ids: string[]) => void; error: Error | null; mayWrite: boolean; saved: (cluster: EvidenceCluster) => void }) {
  const [kind, setKind] = useState<ClusterKind>(cluster?.kind ?? "claim");
  const [title, setTitle] = useState(cluster?.title ?? "");
  const [description, setDescription] = useState(cluster?.description ?? "");
  const [editedObservationIDs, setEditedObservationIDs] = useState<string[]>(cluster?.observation_ids ?? []);
  const [filter, setFilter] = useState("");
  const observationIDs = cluster ? editedObservationIDs : selectedIDs;
  const setObservationIDs = cluster ? setEditedObservationIDs : setSelectedIDs;
  const pickerRows = [...new Map([...evidence, ...observationIDs.map((id) => evidenceByID.get(id)).filter((row): row is Evidence => Boolean(row))].map((row) => [row.observation_id, row])).values()];
  const visibleRows = filterLoadedRows(pickerRows, filter, (row) => [row.observation_id, row.source_id, row.source_title, row.statement, row.quote]);
  const body: WriteEvidenceCluster = { kind, title, description, observation_ids: observationIDs };
  const save = useResearchWrite(() => cluster ? updateEvidenceClusterAction(workspace, cluster.cluster_id, body) : createEvidenceClusterAction(workspace, body), [keys.evidence.all(workspace), keys.evidence.clusters(workspace)], saved);
  if (!mayWrite && !cluster) return <div className={s.empty}><Text size="sm">No cluster selected.</Text><Text size="sm" tone="tertiary">This investigation is read-only. Existing clusters remain visible, but new groupings require write access.</Text></div>;
  if (!mayWrite && cluster) return <ClusterDetail workspace={workspace} cluster={cluster} evidenceByID={evidenceByID} error={error} />;
  return <form className={s.stack} onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
    <Text size="sm" tone="tertiary">A cluster is a qualified analyst grouping of observations. It does not merge identities or prove the grouped material is independent.</Text>
    <Field label="Grouping type" required>{(aria) => <select {...aria} className={s.select} value={kind} onChange={(event) => setKind(event.target.value as ClusterKind)}>{Object.entries(clusterLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}</Field>
    <Field label="Title" required>{(aria) => <Input {...aria} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="East Quay location account" />}</Field>
    <Field label="Qualification" hint="Explain why these observations are being grouped and what remains uncertain.">{(aria) => <Textarea {...aria} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="These reports may describe the same account, but independence has not been established." />}</Field>
    <ClusterObservationPicker rows={visibleRows} selected={observationIDs} setSelected={setObservationIDs} filter={filter} setFilter={setFilter} />
    <Failure error={error ?? save.error} />
    {save.isSuccess ? <Text size="sm" tone="accent" role="status">Cluster saved.</Text> : null}
    <Button type="submit" intent="primary" loading={save.isPending} disabled={!observationIDs.length}>{cluster ? "Update cluster" : "Save cluster"}</Button>
  </form>;
}

function ClusterObservationPicker({ rows, selected, setSelected, filter, setFilter }: { rows: Evidence[]; selected: string[]; setSelected: (ids: string[]) => void; filter: string; setFilter: (value: string) => void }) {
  return <div className={s.details}><Text size="sm">Grouped observations <span className={s.muted}>(up to 24)</span></Text><Input aria-label="Filter cluster observations" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter loaded observations" />{rows.length ? <div className={s.checkboxList}>{rows.map((row) => { const checked = selected.includes(row.observation_id); return <label key={row.observation_id} className={s.checkboxLabel}><input type="checkbox" checked={checked} onChange={() => setSelected(checked ? selected.filter((id) => id !== row.observation_id) : [...selected, row.observation_id])} /><span className={s.questionLinkText}>{row.source_title}: {row.statement}</span></label>; })}</div> : <Text size="xs" tone="tertiary">No loaded observations match.</Text>}<Text size="xs" tone="tertiary">{selected.length} observation{selected.length === 1 ? "" : "s"} selected.</Text></div>;
}

function ClusterDetail({ workspace, cluster, evidenceByID, error }: { workspace: string; cluster: EvidenceCluster; evidenceByID: Map<string, Evidence>; error: Error | null }) {
  return <div className={s.stack}><div className={s.row}><Badge tone="neutral">{clusterLabels[cluster.kind]}</Badge><span className={s.muted}>Updated {dateLabel(cluster.updated_at)}</span></div><Text size="sm">{cluster.title}</Text>{cluster.description ? <Text size="sm" tone="tertiary">{cluster.description}</Text> : null}<Failure error={error} /><div className={s.stack}>{cluster.observation_ids.map((id) => <LedgerEndpoint key={id} workspace={workspace} row={evidenceByID.get(id)} id={id} />)}</div></div>;
}

function ReviewLedger({ workspace, relations, evidenceByID, error, moreAvailable, morePending, loadMore, select }: {
  workspace: string;
  relations: EvidenceRelation[];
  evidenceByID: Map<string, Evidence>;
  error: Error | null;
  moreAvailable: boolean;
  morePending: boolean;
  loadMore: () => void;
  select: (left: string, right: string) => void;
}) {
  const [filter, setFilter] = useState("");
  const [kind, setKind] = useState<RelationKind | "all">("all");
  const counts = relationCounts(relations);
  const filtered = filterLoadedRows(relations.filter((relation) => kind === "all" || relation.kind === kind), filter, (relation) => {
    const left = evidenceByID.get(relation.left_observation_id);
    const right = evidenceByID.get(relation.right_observation_id);
    return [relation.kind, relation.rationale, relation.author, relation.left_observation_id, relation.right_observation_id, left?.source_title ?? "", left?.statement ?? "", right?.source_title ?? "", right?.statement ?? ""];
  });
  return <div className={s.stack}>
    <Failure error={error} />
    {!relations.length ? <div className={s.empty}><Text size="sm">No pair decisions yet.</Text><Text size="sm" tone="tertiary">Saved comparisons will appear here as a workspace-wide review ledger, with the exact source citations used on each side.</Text></div> : <>
      <div className={s.row}>{relationKinds.map((relationKind) => <Badge key={relationKind} tone="neutral">{relationLabels[relationKind]} {counts[relationKind]}</Badge>)}</div>
      <Field label="Decision type">{(aria) => <select {...aria} className={s.select} value={kind} onChange={(event) => setKind(event.target.value as RelationKind | "all")}><option value="all">All decisions</option>{relationKinds.map((relationKind) => <option key={relationKind} value={relationKind}>{relationLabels[relationKind]}</option>)}</select>}</Field>
      <Input aria-label="Filter review ledger" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter rationale, source, statement, or ID" />
      <Text size="xs" tone="tertiary">Showing {filtered.length} of {relations.length} loaded decision{relations.length === 1 ? "" : "s"}. Filters apply to loaded decisions; load more to extend the ledger.</Text>
      {filtered.length ? <div className={s.stack}>{filtered.map((relation) => <ReviewLedgerCard key={relation.relation_id} workspace={workspace} relation={relation} left={evidenceByID.get(relation.left_observation_id)} right={evidenceByID.get(relation.right_observation_id)} select={() => select(relation.left_observation_id, relation.right_observation_id)} />)}</div> : <Text size="sm" tone="tertiary">No saved decisions match this filter.</Text>}
    </>}
    <MoreButton available={moreAvailable} pending={morePending} load={loadMore} />
  </div>;
}

function ReviewLedgerCard({ workspace, relation, left, right, select }: { workspace: string; relation: EvidenceRelation; left?: Evidence; right?: Evidence; select: () => void }) {
  return <article className={s.ledgerCard}>
    <div className={s.row}><Badge tone="neutral">{relationLabels[relation.kind]}</Badge><span className={s.muted}>Updated {dateLabel(relation.updated_at)}</span></div>
    <div className={s.ledgerEndpoints}><LedgerEndpoint workspace={workspace} row={left} id={relation.left_observation_id} /><LedgerEndpoint workspace={workspace} row={right} id={relation.right_observation_id} /></div>
    <Text size="sm">{relation.rationale}</Text>
    <div className={s.row}><Button type="button" size="sm" intent="ghost" onClick={select}>Compare pair</Button><span className={s.muted}>Reviewed by {relation.author}</span></div>
  </article>;
}

function LedgerEndpoint({ workspace, row, id }: { workspace: string; row?: Evidence; id: string }) {
  if (!row) return <div className={s.ledgerEndpoint}><Text size="sm">Observation unavailable</Text><Text size="xs" tone="tertiary">{id}</Text></div>;
  return <div className={s.ledgerEndpoint}><Link className={s.inlineLink} href={sourceHref(workspace, row.source_id, row.capture_id, row.observation_id, investigationPath(workspace, "evidence"))}>{row.source_title}</Link><Text size="sm">{row.statement}</Text><blockquote className={s.quote}>{row.quote}</blockquote></div>;
}

function EvidenceCard({ row, workspace, selected, select, synthesisSelected, toggleSynthesis, clusterSelected, toggleCluster }: { row: Evidence; workspace: string; selected: boolean; select: () => void; synthesisSelected: boolean; toggleSynthesis: () => void; clusterSelected: boolean; toggleCluster: () => void }) {
  return <article className={selected ? s.evidenceCard + " " + s.evidenceCardSelected : s.evidenceCard}>
    <div className={s.row}>
      <Badge tone="neutral">{row.source_title}</Badge>
      <span className={s.muted}>{dateLabel(row.recorded_at)}</span>
    </div>
    <Text size="sm" className={s.evidenceStatement}>{row.statement}</Text>
    <blockquote className={s.quote}>{row.quote}</blockquote>
    <div className={s.row}>
      <Button type="button" size="sm" intent={selected ? "primary" : "ghost"} onClick={select}>{selected ? "Selected" : "Select for comparison"}</Button>
      <Button type="button" size="sm" intent={synthesisSelected ? "primary" : "ghost"} onClick={toggleSynthesis}>{synthesisSelected ? "In comparison set" : "Add to comparison set"}</Button>
      <Button type="button" size="sm" intent={clusterSelected ? "primary" : "ghost"} onClick={toggleCluster}>{clusterSelected ? "In cluster" : "Add to cluster"}</Button>
      <Link className={s.inlineLink} href={sourceHref(workspace, row.source_id, row.capture_id, row.observation_id, investigationPath(workspace, "evidence"))}>Open citation</Link>
    </div>
  </article>;
}

const autoComparison = "__auto_comparison__";

const autoQuestionSuggestions = "__auto_question_suggestions__";

function QuestionSuggestionPanel({ workspace, gaps, saved, historyError, evidenceByID, mayWrite, moreAvailable, morePending, loadMore }: { workspace: string; gaps: EvidenceQuestionSuggestionGap[]; saved: EvidenceQuestionSuggestions[]; historyError: Error | null; evidenceByID: Map<string, Evidence>; mayWrite: boolean; moreAvailable: boolean; morePending: boolean; loadMore: () => void }) {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [view, setView] = useState(autoQuestionSuggestions);
  const keyFor = (gap: EvidenceQuestionSuggestionGap) => `${gap.kind}:${gap.label}:${gap.observation_ids.join(",")}`;
  const selectedGaps = gaps.filter((gap) => selectedKeys.includes(keyFor(gap)));
  const current = view === autoQuestionSuggestions ? undefined : saved.find((one) => one.question_suggestions_id === view);
  const currentFailed = Boolean(current && current.status !== "completed" && current.status !== "empty");
  const run = useResearchWrite(
    () => createEvidenceQuestionSuggestionsAction(workspace, selectedGaps),
    [keys.evidence.questionSuggestions(workspace)],
    (value) => setView(value.question_suggestions_id),
  );
  const toggle = (gap: EvidenceQuestionSuggestionGap) => {
    const key = keyFor(gap);
    setSelectedKeys((currentKeys) => currentKeys.includes(key) ? currentKeys.filter((one) => one !== key) : currentKeys.length >= 6 ? [...currentKeys.slice(1), key] : [...currentKeys, key]);
    setView(autoQuestionSuggestions);
  };
  return <div className={s.stack}>
    <Failure error={historyError} />
    <Text size="sm" tone="tertiary">Select unresolved gaps to draft bounded next questions. The assistant only proposes prompts; saving a question remains a human action.</Text>
    {gaps.length ? <div className={s.stack}>{gaps.map((gap) => {
      const key = keyFor(gap);
      const checked = selectedKeys.includes(key);
      return <button key={key} type="button" className={checked ? s.coverageCard + " " + s.evidenceCardSelected : s.coverageCard} onClick={() => toggle(gap)} aria-pressed={checked}>
        <div className={s.row}><Badge tone={checked ? "accent" : "warn"}>{questionSuggestionKindLabels[gap.kind]}</Badge><span className={s.muted}>{gap.observation_ids.length} citation{gap.observation_ids.length === 1 ? "" : "s"}</span></div>
        <Text size="sm">{gap.label}</Text>
        {gap.detail ? <Text size="xs" tone="tertiary">{gap.detail}</Text> : null}
      </button>;
    })}</div> : <div className={s.empty}><Text size="sm">No unresolved gaps are available in the loaded review context.</Text><Text size="xs" tone="tertiary">Load more records, questions, clusters, or review decisions to widen the gap set.</Text></div>}
    {saved.length ? <label className={s.row}><Text as="span" size="sm">Saved proposal</Text><select aria-label="Saved next-question proposal" className={s.select} value={view} onChange={(event) => setView(event.target.value)}><option value={autoQuestionSuggestions}>{selectedGaps.length ? "Current selection · preview" : "Select a saved proposal"}</option>{saved.map((one) => <option key={one.question_suggestions_id} value={one.question_suggestions_id}>{dateLabel(one.created_at)} · {one.suggestions.length} suggestion{one.suggestions.length === 1 ? "" : "s"} · {questionSuggestionStatusLabel(one.status)}</option>)}</select></label> : null}
    <MoreButton available={moreAvailable} pending={morePending} load={loadMore} />
    {current && currentFailed ? <div className={s.details}><div className={s.row}><Badge tone={current.status === "unsupported" ? "warn" : "crit"}>{questionSuggestionStatusLabel(current.status)}</Badge></div><Text size="sm">This question-suggestion provider attempt was retained for the audit history but did not produce prompts.</Text><Text size="xs" tone="tertiary">{current.error || "The provider did not return a usable result."} Run another proposal to retry with the current provider.</Text></div> : current ? <QuestionSuggestionResult workspace={workspace} proposal={current} evidenceByID={evidenceByID} /> : null}
    {mayWrite ? <form onSubmit={(event) => { event.preventDefault(); run.mutate(); }}><Failure error={run.error} /><Button type="submit" intent="primary" loading={run.isPending} disabled={!selectedGaps.length}>{current ? "Run another proposal" : "Suggest next questions"}</Button></form> : <Text size="xs" tone="tertiary">This investigation is read-only. Existing proposals remain visible, but new suggestions require write access.</Text>}
  </div>;
}

function questionSuggestionStatusLabel(status: EvidenceQuestionSuggestions["status"]) {
  return status === "timed_out" ? "timed out" : status;
}

function QuestionSuggestionResult({ workspace, proposal, evidenceByID }: { workspace: string; proposal: EvidenceQuestionSuggestions; evidenceByID: Map<string, Evidence> }) {
  return <div className={s.stack}>
    <ReviewBoundary kind="proposal" />
    <Text size="xs" tone="tertiary">Saved {proposal.provider} proposal ({proposal.method}, {proposal.template_version}) from {dateLabel(proposal.created_at)}. These are drafts, not authored questions.</Text>
    <pre className={s.quote}>{proposal.output}</pre>
    {proposal.suggestions.map((suggestion, index) => <article key={`${suggestion.kind}:${index}`} className={s.coverageCard}>
      <div className={s.row}><Badge tone="neutral">{questionSuggestionKindLabels[suggestion.kind]}</Badge></div>
      <Text size="sm">{suggestion.prompt}</Text>
      <Text size="xs" tone="tertiary">{suggestion.context}</Text>
      <QuestionSuggestionCitations workspace={workspace} ids={suggestion.observation_ids} evidenceByID={evidenceByID} />
      <Link className={s.inlineLink} href={questionDraftHref(workspace, { prompt: suggestion.prompt, context: suggestion.context, observation_ids: suggestion.observation_ids }, investigationPath(workspace, "evidence"))}>Review as investigation question</Link>
    </article>)}
  </div>;
}

function QuestionSuggestionCitations({ workspace, ids, evidenceByID }: { workspace: string; ids: string[]; evidenceByID: Map<string, Evidence> }) {
  return <div className={s.details}><Text size="xs" tone="tertiary">Exact gap citations</Text><div className={s.questionLinks}>{ids.map((id) => {
    const row = evidenceByID.get(id);
    return row ? <Link key={id} className={s.inlineLink} href={sourceHref(workspace, row.source_id, row.capture_id, row.observation_id, investigationPath(workspace, "evidence"))}>{row.source_title}: {row.statement}</Link> : <Text key={id} size="xs" tone="tertiary">Observation {id} is not available in the current evidence context.</Text>;
  })}</div></div>;
}

function AssistedComparisonPanel({ workspace, rows, mayWrite, saved, historyError, moreAvailable, morePending, loadMore }: { workspace: string; rows: Evidence[]; mayWrite: boolean; saved: EvidenceComparison[]; historyError: Error | null; moreAvailable: boolean; morePending: boolean; loadMore: () => void }) {
  const currentIDs = rows.map((row) => row.observation_id);
  const selectionKey = currentIDs.join(":");
  const [comparisonView, setComparisonView] = useState({ key: "", id: autoComparison });
  const selectedComparisonID = comparisonView.key === selectionKey ? comparisonView.id : autoComparison;
  const exactSaved = rows.length ? saved.find((one) => sameIDs(one.observation_ids, currentIDs)) : undefined;
  const automatic = exactSaved ?? (!rows.length ? saved[0] : undefined);
  const selected = selectedComparisonID === autoComparison ? automatic : saved.find((one) => one.comparison_id === selectedComparisonID);
  const selectedFailed = Boolean(selected && selected.status !== "completed" && selected.status !== "empty");
  const citationIDs = selected?.observation_ids ?? currentIDs;
  const visibleCitations = citationIDs.map((id) => rows.find((row) => row.observation_id === id)).filter((row): row is Evidence => Boolean(row));
  const missingCitationIDs = citationIDs.filter((id) => !visibleCitations.some((row) => row.observation_id === id));
  const citationQuery = useQuery({
    queryKey: keys.evidence.comparisonEvidence(workspace, selected?.comparison_id ?? "preview"),
    queryFn: () => evidenceByIDsQuery(workspace, missingCitationIDs),
    enabled: missingCitationIDs.length > 0,
  });
  const citations = [...visibleCitations, ...(citationQuery.data ?? [])];
  const save = useResearchWrite(
    () => createEvidenceComparisonAction(workspace, currentIDs),
    [keys.evidence.comparisons(workspace)],
  );
  if (!rows.length && !selected) return <div className={s.empty}><Failure error={historyError} /><Text size="sm">Choose two to six observations for assisted comparison.</Text><Text size="sm" tone="tertiary">The assistant will propose structured review points from the selected citations and saved human pair decisions. It will not write a relation or conclusion.</Text></div>;
  return <div className={s.stack}>
    <Failure error={historyError} />
    {saved.length ? <label className={s.row}><Text as="span" size="sm">Saved comparison</Text><select aria-label="Saved assisted comparison" className={s.select} value={selectedComparisonID} onChange={(event) => setComparisonView({ key: selectionKey, id: event.target.value })}><option value={autoComparison}>{exactSaved ? "Current selection · saved" : rows.length ? "Current selection · not run" : "Latest saved run"}</option>{saved.map((one) => <option key={one.comparison_id} value={one.comparison_id}>{dateLabel(one.created_at)} · {one.observation_ids.length} observation{one.observation_ids.length === 1 ? "" : "s"} · {comparisonStatusLabel(one.status)}{one.comparison_id === exactSaved?.comparison_id ? " · current" : ""}</option>)}</select></label> : null}
    <MoreButton available={moreAvailable} pending={morePending} load={loadMore} />
    <ReviewBoundary kind="proposal" text={selected ? "This saved comparison is a review lead tied to the selected citations; it does not accept, reject, or rewrite evidence." : "The comparison will be a review lead tied to the selected citations; it will not accept, reject, or rewrite evidence."} />
    <Text size="sm" tone="tertiary">{selected ? `Saved ${selected.provider} proposal (${selected.method}, ${selected.template_version}) from ${dateLabel(selected.created_at)}. Findings remain reviewable suggestions.` : `Ready to compare ${rows.length} selected observations. The output will preserve each finding's exact citations.`}</Text>
    {selected && selectedFailed ? <div className={s.details}><div className={s.row}><Badge tone={selected.status === "unsupported" ? "warn" : "crit"}>{comparisonStatusLabel(selected.status)}</Badge></div><Text size="sm">This comparison provider attempt was retained for the audit history but did not produce findings.</Text><Text size="xs" tone="tertiary">{selected.error || "The provider did not return a usable result."} Run another comparison to retry with the current provider.</Text></div> : selected ? <><pre className={s.quote}>{selected.output}</pre><ComparisonFindings workspace={workspace} findings={selected.findings} rows={citations} error={citationQuery.error} /></> : null}
    {mayWrite && currentIDs.length >= 2 ? <form onSubmit={(event) => { event.preventDefault(); save.mutate(); }}><Failure error={save.error} /><Button type="submit" intent="primary" loading={save.isPending}>{selected ? "Run another comparison" : "Run assisted comparison"}</Button></form> : null}
    {!mayWrite ? <Text size="xs" tone="tertiary">This investigation is read-only. Saved comparison proposals remain visible, but new runs require write access.</Text> : null}
  </div>;
}

function comparisonStatusLabel(status: EvidenceComparison["status"]) {
  return status === "timed_out" ? "timed out" : status;
}

function ComparisonFindings({ workspace, findings, rows, error }: { workspace: string; findings: EvidenceComparisonFinding[]; rows: Evidence[]; error: Error | null }) {
  const byID = new Map(rows.map((row) => [row.observation_id, row]));
  return <div className={s.details}><Text size="sm">Structured findings</Text><Text size="xs" tone="tertiary">Shared wording is a review lead, not proof of agreement, independence, or truth. Contradictions are surfaced from saved human pair decisions.</Text>{error ? <Failure error={error} /> : null}<div className={s.stack}>{findings.map((finding, index) => <article key={`${finding.kind}:${index}`} className={s.observation}><div className={s.row}><Badge tone={finding.kind === "contradiction" ? "crit" : finding.kind === "coverage_gap" ? "warn" : "neutral"}>{comparisonFindingLabels[finding.kind]}</Badge></div><Text size="sm">{finding.summary}</Text><div className={s.questionLinks}>{finding.observation_ids.map((id) => { const row = byID.get(id); return row ? <Link key={id} className={s.inlineLink} href={sourceHref(workspace, row.source_id, row.capture_id, row.observation_id, investigationPath(workspace, "evidence"))}>{row.source_title}: {row.statement}</Link> : <Text key={id} size="xs" tone="tertiary">Observation {id} could not be resolved.</Text>; })}</div></article>)}</div></div>;
}

const autoSynthesis = "__auto__";

function SynthesisPanel({ workspace, rows, mayWrite, saved, historyError, moreAvailable, morePending, loadMore }: { workspace: string; rows: Evidence[]; mayWrite: boolean; saved: EvidenceSynthesis[]; historyError: Error | null; moreAvailable: boolean; morePending: boolean; loadMore: () => void }) {
  const currentIDs = rows.map((row) => row.observation_id);
  const selectionKey = currentIDs.join(":");
  const [synthesisView, setSynthesisView] = useState({ key: "", id: autoSynthesis });
  const selectedSynthesis = synthesisView.key === selectionKey ? synthesisView.id : autoSynthesis;
  const exactSaved = rows.length ? saved.find((one) => sameIDs(one.observation_ids, rows.map((row) => row.observation_id))) : undefined;
  const automatic = exactSaved ?? (!rows.length ? saved[0] : undefined);
  const selected = selectedSynthesis === autoSynthesis ? automatic : saved.find((one) => one.synthesis_id === selectedSynthesis);
  const selectedMatches = Boolean(selected && sameIDs(selected.observation_ids, currentIDs));
  const selectedFailed = Boolean(selected && selected.status !== "completed");
  const selectedStatus = selected ? synthesisStatusLabel(selected.status) : "";
  const candidates = selected?.candidates ?? researchRecordCandidates(rows);
  const citationIDs = selected?.observation_ids ?? currentIDs;
  const visibleCitations = citationIDs.map((id) => rows.find((row) => row.observation_id === id)).filter((row): row is Evidence => Boolean(row));
  const needsCitationHydration = Boolean(selected && visibleCitations.length < citationIDs.length);
  const citationQuery = useQuery({
    queryKey: keys.evidence.synthesisEvidence(workspace, selected?.synthesis_id ?? "preview"),
    queryFn: () => evidenceByIDsQuery(workspace, citationIDs),
    enabled: needsCitationHydration,
  });
  const citations = citationQuery.data ?? visibleCitations;
  const save = useResearchWrite(
    () => createEvidenceSynthesisAction(workspace, rows.map((row) => row.observation_id)),
    [keys.evidence.syntheses(workspace)],
  );
  if (!rows.length && !selected) return <div className={s.empty}><Failure error={historyError} /><Text size="sm">Choose observations to synthesize.</Text><Text size="sm" tone="tertiary">This review-only pass keeps the selected statements and exact identifiers visible; it does not create records or conclusions.</Text></div>;
  return <div className={s.stack}>
    <Failure error={historyError} />
    {saved.length ? <label className={s.row}><Text as="span" size="sm">Saved run</Text><select aria-label="Saved synthesis run" className={s.select} value={selectedSynthesis} onChange={(event) => setSynthesisView({ key: selectionKey, id: event.target.value })}><option value={autoSynthesis}>{exactSaved ? "Current selection · saved" : rows.length ? "Current selection · preview" : "Latest saved run"}</option>{saved.map((one) => <option key={one.synthesis_id} value={one.synthesis_id}>{dateLabel(one.created_at)} · {one.observation_ids.length} observation{one.observation_ids.length === 1 ? "" : "s"} · {synthesisStatusLabel(one.status)}{one.synthesis_id === exactSaved?.synthesis_id ? " · current" : ""}</option>)}</select></label> : null}
    <MoreButton available={moreAvailable} pending={morePending} load={loadMore} />
    <ReviewBoundary kind="proposal" text={selected ? "This saved synthesis is a review lead tied to the exact supporting observations; it does not create a record or conclusion." : "This synthesis is a working aid over the selected observations; it does not create a record or conclusion."} />
    <Text size="sm" tone="tertiary">{selected ? `Saved ${selected.provider} review pass (${selected.method}) from ${dateLabel(selected.created_at)}${selectedMatches ? "." : ` over ${selected.observation_ids.length} other selected observation${selected.observation_ids.length === 1 ? "" : "s"}.`}` : `Local review pass over ${rows.length} selected observation${rows.length === 1 ? "" : "s"}. The text below is a working aid, not an asserted conclusion.`}</Text>
    {!selectedMatches && selected && rows.length ? <Text size="xs" tone="tertiary">This is a historical run. Choose its observations above to align the current selection, or save a new synthesis for the observations currently selected.</Text> : null}
    {selected && selectedFailed ? <div className={s.details}><div className={s.row}><Badge tone={selected.status === "unsupported" ? "warn" : "crit"}>{selectedStatus}</Badge></div><Text size="sm">This provider attempt was retained for the audit history but did not produce a synthesis.</Text><Text size="xs" tone="tertiary">{selected.error || "The provider did not return a usable result."} Run Save synthesis again to retry with the current provider.</Text></div> : <pre className={s.quote}>{selected?.output ?? synthesisText(rows)}</pre>}
    <SynthesisCitations workspace={workspace} ids={citationIDs} rows={citations} error={citationQuery.error} />
    {!selectedFailed ? <><Text size="sm">Candidate records</Text>{candidates.length ? <div className={s.stack}>{candidates.map((candidate) => <CandidateCard key={`${candidate.kind}:${candidate.name}`} workspace={workspace} candidate={candidate} evidence={citations} mayWrite={mayWrite} />)}</div> : <Text size="sm" tone="tertiary">No exact account-shaped identifiers were found. Create a record manually when the material supports one.</Text>}</> : null}
    {mayWrite && rows.length ? <form onSubmit={(event) => { event.preventDefault(); save.mutate(); }}><Failure error={save.error} /><Button type="submit" intent="primary" loading={save.isPending}>{selected ? "Save another synthesis" : "Save synthesis"}</Button></form> : null}
    {!mayWrite ? <Text size="xs" tone="tertiary">This investigation is read-only. Saved synthesis runs remain visible, but new runs require write access.</Text> : null}
  </div>;
}

function synthesisStatusLabel(status: EvidenceSynthesis["status"]) {
  return status === "timed_out" ? "timed out" : status;
}

function SynthesisCitations({ workspace, ids, rows, error }: { workspace: string; ids: string[]; rows: Evidence[]; error: Error | null }) {
  if (!ids.length) return null;
  const byID = new Map(rows.map((row) => [row.observation_id, row]));
  return <div className={s.details}><Text size="sm">Exact supporting observations</Text><Text size="xs" tone="tertiary">These retained citations are the evidence set supplied to this synthesis run.</Text>{error ? <Failure error={error} /> : null}<div className={s.stack}>{ids.map((id) => {
    const row = byID.get(id);
    if (!row) return <Text key={id} size="xs" tone="tertiary">Observation {id} could not be resolved.</Text>;
    return <article key={id} className={s.observation}><div className={s.eventMeta}><Link href={sourceHref(workspace, row.source_id, row.capture_id, row.observation_id, investigationPath(workspace, "evidence"))} className={s.inlineLink}>{row.source_title}</Link><span className={s.muted}>Observation {row.observation_id}</span></div><Text size="sm" className={s.evidenceStatement}>{row.statement}</Text><blockquote className={s.quote}>{row.quote}</blockquote><Text size="xs" tone="tertiary">Capture {row.capture_id} · recorded {dateLabel(row.recorded_at)}</Text></article>;
  })}</div></div>;
}

function CandidateCard({ workspace, candidate, evidence, mayWrite }: { workspace: string; candidate: ResearchRecordCandidate | SynthesisCandidate; evidence: Evidence[]; mayWrite: boolean }) {
  return <article className={s.observation}><div className={s.eventMeta}><Badge tone="warn">candidate</Badge><Text size="sm">{candidate.name}</Text></div><Text size="xs" tone="tertiary">{candidate.rationale}</Text><Text size="xs" tone="tertiary">Supported by {candidate.observation_ids.length} selected observation{candidate.observation_ids.length === 1 ? "" : "s"}.</Text><CandidateSupport workspace={workspace} ids={candidate.observation_ids} evidence={evidence} />{mayWrite ? <Link className={s.inlineLink} href={recordHref(workspace, candidate.observation_ids, { kind: candidate.kind, name: candidate.name, description: candidate.rationale }, undefined, investigationPath(workspace, "evidence"))}>Review as research record</Link> : null}</article>;
}

function CandidateSupport({ workspace, ids, evidence }: { workspace: string; ids: string[]; evidence: Evidence[] }) {
  const byID = new Map(evidence.map((row) => [row.observation_id, row]));
  return <div className={s.details}><Text size="xs" tone="tertiary">Supporting citations</Text><div className={s.questionLinks}>{ids.map((id) => {
    const row = byID.get(id);
    return row
      ? <Link key={id} className={s.inlineLink} href={sourceHref(workspace, row.source_id, row.capture_id, row.observation_id, investigationPath(workspace, "evidence"))}>{row.source_title}: {row.statement}</Link>
      : <Text key={id} size="xs" tone="tertiary">Observation {id} could not be resolved.</Text>;
  })}</div></div>;
}

function sameIDs(left: string[], right: string[]) {
  return left.length === right.length && left.every((one, index) => one === right[index]);
}

function ComparisonPanel({ workspace, rows, relation, relations, mayWrite, shell, hydrating, evidenceError }: {
  workspace: string;
  rows: Evidence[];
  relation?: EvidenceRelation;
  relations: EvidenceRelation[];
  mayWrite: boolean;
  shell?: ReturnType<typeof useContext>["shell"];
  hydrating?: boolean;
  evidenceError?: Error | null;
}) {
  const [kind, setKind] = useState<RelationKind>(relation?.kind ?? "unresolved");
  const [rationale, setRationale] = useState(relation?.rationale ?? "");
  const save = useResearchWrite(
    () => setEvidenceRelationAction(workspace, {
      left_observation_id: rows[0]?.observation_id ?? "",
      right_observation_id: rows[1]?.observation_id ?? "",
      kind,
      rationale,
    }),
    [keys.evidence.all(workspace), keys.evidence.relations(workspace)],
  );

  if (rows.length < 2) {
    return <div className={s.empty}><Failure error={evidenceError ?? null} /><Text size="sm">{hydrating ? "Loading the saved pair." : "Choose two observations."}</Text><Text size="sm" tone="tertiary">{hydrating ? "The ledger is restoring both exact citations before opening the comparison." : "The comparison is deliberately human-led: select a pair, then explain the relationship in your own words."}</Text></div>;
  }
  return <div className={s.stack}>
    <div className={s.comparisonPair}>
      {rows.map((row) => <div key={row.observation_id} className={s.comparisonItem}><span className={s.muted}>{row.source_title}</span><Text size="sm">{row.statement}</Text></div>)}
    </div>
    {relation ? <Text size="xs" tone="tertiary">Last reviewed by {authorLabel(relation.author, shell)} · {dateLabel(relation.updated_at)}</Text> : null}
    {mayWrite ? <form className={s.stack} onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
      <Field label="Decision" required>{(aria) => <select {...aria} className={s.select} value={kind} onChange={(event) => setKind(event.target.value as RelationKind)}>
        {Object.entries(relationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>}</Field>
      <Field label="Rationale" hint="Keep the comparison specific to these two citations." required>{(aria) => <Textarea {...aria} value={rationale} onChange={(event) => setRationale(event.target.value)} placeholder="What does this pair show, and what does it not show?" />}</Field>
      <Failure error={save.error} />
      {save.isSuccess ? <Text size="sm" tone="accent" role="status">Review decision saved.</Text> : null}
      <Button type="submit" intent="primary" loading={save.isPending}>{relation ? "Update decision" : "Save decision"}</Button>
    </form> : <Text size="sm" tone="tertiary">This investigation is read-only. Existing decisions remain visible, but new review decisions require write access.</Text>}
    {relations.length ? <div className={s.details}><Text size="xs" tone="tertiary">{relations.length} decision{relations.length === 1 ? "" : "s"} recorded in this investigation.</Text></div> : null}
  </div>;
}

function samePair(relation: EvidenceRelation, left: string, right: string) {
  return (relation.left_observation_id === left && relation.right_observation_id === right)
    || (relation.left_observation_id === right && relation.right_observation_id === left);
}
