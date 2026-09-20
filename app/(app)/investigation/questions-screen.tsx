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
import type { InvestigationQuestion, QuestionState, WriteQuestion } from "@/lib/services/questions";
import { noteDraftHref } from "@/lib/services/notes/navigation";
import { questionEvidenceHref, questionHref, type QuestionDraft } from "@/lib/services/questions/navigation";
import { mayWriteResearch } from "../_route-context";
import { PageHead } from "../_components/page-head";
import { Query, useContext } from "../_hooks";
import { evidenceByIDsQuery, evidenceQuery, questionQuery, questionsQuery } from "../_queries";
import { createQuestionAction, updateQuestionAction } from "./_actions";
import { authorLabel, dateLabel, Failure, investigationPath, MoreButton, ObservationPicker as CitationPicker, sourceHref, useResearchWrite } from "./_shared";
import s from "./investigation.module.css";

const stateLabels: Record<QuestionState, string> = {
  open: "Open",
  answered: "Answered",
  dismissed: "Dismissed",
  deferred: "Deferred",
};
const stateFilters: Array<QuestionState | ""> = ["", "open", "answered", "dismissed", "deferred"];

function stateTone(state: QuestionState): "warn" | "accent" | "neutral" | "info" {
  switch (state) {
    case "open": return "warn";
    case "answered": return "accent";
    case "deferred": return "info";
    case "dismissed": return "neutral";
  }
}

function readStateFilter(raw: string | null): QuestionState | "" {
  return raw && stateFilters.includes(raw as QuestionState) ? raw as QuestionState : "";
}

export function QuestionsScreen({ workspace }: { workspace: string }) {
  const { shell } = useContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mayWrite = mayWriteResearch(shell?.context?.workspace);
  const returnTo = searchParams.get("return") || investigationPath(workspace, "questions");
  const stateFilter = readStateFilter(searchParams.get("state"));
  const questions = useInfiniteQuery({
    queryKey: keys.questions.list(workspace, stateFilter),
    queryFn: ({ pageParam }) => questionsQuery(workspace, pageParam, stateFilter),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });
  const evidence = useInfiniteQuery({
    queryKey: keys.evidence.list(workspace),
    queryFn: ({ pageParam }) => evidenceQuery(workspace, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });
  const rows = questions.data?.pages.flatMap((page) => page.items) ?? [];
  const listedEvidenceRows = evidence.data?.pages.flatMap((page) => page.items) ?? [];
  const [filter, setFilter] = useState("");
  const visibleRows = filterLoadedRows(rows, filter, (row) => [row.question_id, row.question, row.context ?? "", row.resolution ?? "", row.state]);
  const [activeId, setActiveId] = useState<string | null>(() => searchParams.get("question"));
  const targetedQuestion = useQuery({
    queryKey: keys.questions.one(workspace, activeId ?? ""),
    queryFn: () => questionQuery(workspace, activeId!),
    enabled: Boolean(activeId) && !rows.some((row) => row.question_id === activeId),
    retry: false,
  });
  const active = rows.find((row) => row.question_id === activeId) ?? targetedQuestion.data;
  const targetedQuestionLoading = Boolean(activeId && !active && targetedQuestion.isPending);
  const draft = !activeId && searchParams.get("new") === "1" ? readQuestionDraft(searchParams) : undefined;
  const draftEvidence = useQuery({
    queryKey: keys.evidence.reviewEvidence(workspace, draft?.observation_ids ?? []),
    queryFn: () => evidenceByIDsQuery(workspace, draft!.observation_ids),
    enabled: Boolean(draft?.observation_ids.length),
  });
  const targetedObservationIds = active?.observation_ids ?? [];
  const targetedEvidence = useQuery({
    queryKey: keys.questions.evidence(workspace, active?.question_id ?? "", targetedObservationIds),
    queryFn: () => evidenceByIDsQuery(workspace, targetedObservationIds),
    enabled: targetedObservationIds.length > 0,
  });
  const evidenceRows = mergeEvidence(listedEvidenceRows, targetedEvidence.data ?? [], draftEvidence.data ?? []);
  const evidenceError = evidence.isError ? evidence.error : targetedEvidence.isError ? targetedEvidence.error : draftEvidence.isError ? draftEvidence.error : null;

  function setStateFilter(next: QuestionState | "") {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set("state", next);
    else params.delete("state");
    router.replace(`${investigationPath(workspace, "questions")}${params.size ? `?${params.toString()}` : ""}`);
  }

  return <>
    <PageHead title="Investigation questions" actions={mayWrite ? <Button type="button" intent="primary" onClick={() => setActiveId(null)}>New question</Button> : undefined}>
      Keep uncertainty explicit. Questions can point to cited observations, but an answer here remains an investigation note until a person decides what it means.
    </PageHead>
    <div className={s.columns}>
      <Panel title="Investigation questions" note={rows.length ? rows.length + " loaded" : undefined}>
        <Query of={questions} label="investigation questions">{() => <div className={s.stack}>
          <label className={s.row}><Text as="span" size="sm">Show</Text><select aria-label="Filter question state" className={s.select} value={stateFilter} onChange={(event) => setStateFilter(event.target.value as QuestionState | "")}>
            <option value="">All states</option>
            {stateFilters.filter((state): state is QuestionState => Boolean(state)).map((state) => <option key={state} value={state}>{stateLabels[state]}</option>)}
          </select></label>
          {!rows.length ? (
            <div className={s.empty}>
              <Text size="sm">{stateFilter ? `No ${stateLabels[stateFilter].toLowerCase()} questions recorded.` : "No questions recorded yet."}</Text>
              <Text size="sm" tone="tertiary">Capture what would change your understanding, then link the observations that make it worth answering.</Text>
              {mayWrite && !stateFilter ? <Button type="button" intent="primary" onClick={() => setActiveId(null)}>Record a question</Button> : null}
            </div>
          ) : (
            <div className={s.stack}>
              <Input aria-label="Filter investigation questions" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter loaded questions" />
              <Text size="xs" tone="tertiary">Showing {visibleRows.length} of {rows.length} loaded question{rows.length === 1 ? "" : "s"}{stateFilter ? ` in ${stateLabels[stateFilter].toLowerCase()} state` : ""}.</Text>
              {visibleRows.length ? <div className={s.questionList}>
                {visibleRows.map((question) => <QuestionCard key={question.question_id} question={question} active={question.question_id === activeId} evidence={evidenceRows} workspace={workspace} shell={shell} select={() => setActiveId(question.question_id)} />)}
              </div> : <Text size="sm" tone="tertiary">No loaded questions match. Clear the filter or load more.</Text>}
            </div>
          )}
          <MoreButton available={questions.hasNextPage} pending={questions.isFetchingNextPage} load={() => void questions.fetchNextPage()} />
        </div>}</Query>
      </Panel>
      <Panel title={active ? "Review question" : targetedQuestionLoading ? "Loading question" : activeId ? "Selected question" : "Record a question"}>
        {targetedQuestionLoading ? <Text size="sm" tone="tertiary">Opening the selected question…</Text> : targetedQuestion.error && !active ? <Failure error={targetedQuestion.error} /> : <QuestionEditor
            key={active?.question_id ?? (draft ? "draft" : "new")}
            workspace={workspace}
            question={active}
            initialDraft={draft}
            returnTo={returnTo}
            evidence={evidenceRows}
            evidenceError={evidenceError}
            evidenceHasNext={evidence.hasNextPage}
            evidenceFetchingNext={evidence.isFetchingNextPage}
            fetchMoreEvidence={() => void evidence.fetchNextPage()}
            mayWrite={mayWrite}
            shell={shell}
            saved={(saved) => setActiveId(saved.question_id)}
          />}
      </Panel>
    </div>
  </>;
}

function readQuestionDraft(searchParams: URLSearchParams): QuestionDraft | undefined {
  const prompt = searchParams.get("draft_question")?.trim() ?? "";
  const context = searchParams.get("draft_context")?.trim() ?? "";
  const observation_ids = (searchParams.get("draft_observations") ?? "").split(",").map((id) => id.trim()).filter(Boolean).slice(0, 8);
  return prompt ? { prompt, context, observation_ids } : undefined;
}

function mergeEvidence(primary: Evidence[], ...additionalRows: Evidence[][]) {
  const byID = new Map(primary.map((row) => [row.observation_id, row]));
  for (const additional of additionalRows) for (const row of additional) if (!byID.has(row.observation_id)) byID.set(row.observation_id, row);
  return [...byID.values()];
}

function QuestionCard({ question, active, evidence, workspace, shell, select }: {
  question: InvestigationQuestion;
  active: boolean;
  evidence: Evidence[];
  workspace: string;
  shell?: ReturnType<typeof useContext>["shell"];
  select: () => void;
}) {
  return <article className={active ? s.questionCard + " " + s.questionCardActive : s.questionCard}>
    <button type="button" className={s.questionCardSelect} onClick={select}>
      <span className={s.questionStateRow}>
        <Badge tone={stateTone(question.state)}>{stateLabels[question.state]}</Badge>
        <span className={s.muted}>{authorLabel(question.updated_by, shell)} · {dateLabel(question.updated_at)}</span>
      </span>
      <strong className={s.questionTitle}>{question.question}</strong>
      {question.context ? <span className={s.body}>{question.context}</span> : null}
      {question.resolution ? <span className={s.muted}>{question.state === "answered" ? "Answer: " : "Disposition: "}{question.resolution}</span> : null}
      {question.observation_ids.length ? <span className={s.muted}>{question.observation_ids.length} cited observation{question.observation_ids.length === 1 ? "" : "s"}</span> : null}
    </button>
    {question.observation_ids.length ? <span className={s.questionLinks}>{question.observation_ids.map((id) => {
      const found = evidence.find((one) => one.observation_id === id);
      return found ? <Link key={id} href={sourceHref(workspace, found.source_id, found.capture_id, found.observation_id, questionHref(workspace, question.question_id))} className={s.inlineLink}>{found.source_title}: {found.statement}</Link> : <span key={id} className={s.muted}>Citation {id.slice(0, 8)}…</span>;
    })}</span> : null}
  </article>;
}

function QuestionEditor({ workspace, question, initialDraft, evidence, evidenceError, evidenceHasNext, evidenceFetchingNext, fetchMoreEvidence, mayWrite, shell, saved, returnTo }: {
  workspace: string;
  question?: InvestigationQuestion;
  initialDraft?: QuestionDraft;
  evidence: Evidence[];
  evidenceError: Error | null;
  evidenceHasNext: boolean;
  evidenceFetchingNext: boolean;
  fetchMoreEvidence: () => void;
  mayWrite: boolean;
  shell?: ReturnType<typeof useContext>["shell"];
  saved: (question: InvestigationQuestion) => void;
  returnTo: string;
}) {
  const [prompt, setPrompt] = useState(question?.question ?? initialDraft?.prompt ?? "");
  const [context, setContext] = useState(question?.context ?? initialDraft?.context ?? "");
  const [state, setState] = useState<QuestionState>(question?.state ?? "open");
  const [resolution, setResolution] = useState(question?.resolution ?? "");
  const [observationIds, setObservationIds] = useState<string[]>(question?.observation_ids ?? initialDraft?.observation_ids ?? []);
  const body: WriteQuestion = { question: prompt, context, state, resolution, observation_ids: observationIds };
  const save = useResearchWrite(
    () => question ? updateQuestionAction(workspace, question.question_id, body) : createQuestionAction(workspace, body),
    [keys.questions.all(workspace)],
    saved,
  );

  if (!mayWrite) {
    return question ? <QuestionDetail question={question} evidence={evidence} workspace={workspace} shell={shell} evidenceError={evidenceError} mayWrite={mayWrite} /> : <Text size="sm" tone="tertiary">This investigation is read-only. Existing questions remain visible, but new questions require write access.</Text>;
  }

  return <form className={s.questionEditor} onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
    <Field label="Question" hint="Write the uncertainty as something a source or researcher could answer." required>{(aria) => <Textarea {...aria} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="What do we still need to establish?" />}</Field>
    <Field label="Why it matters">{(aria) => <Textarea {...aria} rows={4} value={context} onChange={(event) => setContext(event.target.value)} placeholder="What would this distinguish or change?" />}</Field>
    <Field label="State" required>{(aria) => <select {...aria} className={s.select} value={state} onChange={(event) => setState(event.target.value as QuestionState)}>
      {Object.entries(stateLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select>}</Field>
    {state !== "open" ? <Field label={state === "answered" ? "Answer" : "Disposition"} hint={state === "answered" ? "Keep the answer qualified if it is still provisional." : "Record why this question is no longer being pursued."} required>{(aria) => <Textarea {...aria} value={resolution} onChange={(event) => setResolution(event.target.value)} placeholder={state === "answered" ? "What did the investigation establish?" : "Why is this question being set aside?"} />}</Field> : null}
    <CitationPicker workspace={workspace} label="Cited observations" selected={observationIds} evidence={evidence} setSelected={setObservationIds} error={evidenceError} max={8} hasNext={evidenceHasNext} fetchingNext={evidenceFetchingNext} fetchMore={fetchMoreEvidence} returnTo={returnTo} />
    {question ? <QuestionHandoffLinks workspace={workspace} question={question} mayWrite={mayWrite} /> : null}
    <Failure error={save.error} />
    {save.isSuccess ? <Text size="sm" tone="accent" role="status">Question saved.</Text> : null}
    <div className={s.row}><Button type="submit" intent="primary" loading={save.isPending}>{question ? "Update question" : "Save question"}</Button>{question ? <Text size="xs" tone="tertiary">Last updated by {authorLabel(question.updated_by, shell)}</Text> : null}</div>
  </form>;
}

function QuestionDetail({ question, evidence, workspace, shell, evidenceError, mayWrite }: {
  question: InvestigationQuestion;
  evidence: Evidence[];
  workspace: string;
  shell?: ReturnType<typeof useContext>["shell"];
  evidenceError: Error | null;
  mayWrite: boolean;
}) {
  return <div className={s.stack}>
    <div className={s.questionStateRow}><Badge tone={stateTone(question.state)}>{stateLabels[question.state]}</Badge><span className={s.muted}>Updated by {authorLabel(question.updated_by, shell)} · {dateLabel(question.updated_at)}</span></div>
    <Text size="sm" className={s.questionTitle}>{question.question}</Text>
    {question.context ? <Text size="sm" tone="tertiary">{question.context}</Text> : null}
    {question.resolution ? <div className={s.details}><Text size="xs" tone="tertiary">{question.state === "answered" ? "Answer" : "Disposition"}</Text><Text size="sm">{question.resolution}</Text></div> : null}
    <CitationLinks ids={question.observation_ids} evidence={evidence} workspace={workspace} error={evidenceError} returnTo={questionHref(workspace, question.question_id)} />
    <QuestionHandoffLinks workspace={workspace} question={question} mayWrite={mayWrite} />
  </div>;
}

function QuestionHandoffLinks({ workspace, question, mayWrite }: { workspace: string; question: InvestigationQuestion; mayWrite: boolean }) {
  const returnTo = questionHref(workspace, question.question_id);
  return <div className={s.row}>
    <Link className={s.inlineLink} href={questionEvidenceHref(workspace, question.question_id, returnTo)}>Review linked evidence</Link>
    {mayWrite ? <Link className={s.inlineLink} href={noteDraftHref(workspace, { body: nextStepNote(question) }, returnTo, { kind: "question", id: question.question_id })}>Start a next-step note</Link> : null}
  </div>;
}

function nextStepNote(question: InvestigationQuestion): string {
  const context = question.context ? `\nWhy it matters: ${question.context}` : "";
  return `Follow-up question: ${question.question}${context}\n\nNext step: `;
}

function CitationLinks({ ids, evidence, workspace, error, returnTo }: { ids: string[]; evidence: Evidence[]; workspace: string; error: Error | null; returnTo?: string }) {
  if (!ids.length) return <Text size="sm" tone="tertiary">No cited observations attached.</Text>;
  return <div className={s.stack}><Text size="xs" tone="tertiary">Cited observations</Text>{error ? <Failure error={error} /> : null}{ids.map((id) => {
    const found = evidence.find((one) => one.observation_id === id);
    if (!found) return <Text key={id} size="xs" tone="tertiary">Citation {id} could not be resolved.</Text>;
    return <article key={id} className={s.observation}><div className={s.eventMeta}><Link className={s.inlineLink} href={sourceHref(workspace, found.source_id, found.capture_id, found.observation_id, returnTo)}>{found.source_title}</Link><span className={s.muted}>Observation {found.observation_id}</span></div><Text size="sm" className={s.evidenceStatement}>{found.statement}</Text><blockquote className={s.quote}>{found.quote}</blockquote><Text size="xs" tone="tertiary">Capture {found.capture_id} · recorded {dateLabel(found.recorded_at)}</Text></article>;
  })}</div>;
}
