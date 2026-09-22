import type { InvestigationQuestion, QuestionContext } from "./index";

export const questionHref = (workspace: string, question?: string, returnTo?: string) => {
  const path = `/investigation/${encodeURIComponent(workspace)}/questions`;
  const params = new URLSearchParams();
  if (question) params.set("question", question);
  if (returnTo) params.set("return", returnTo);
  return `${path}${params.size ? `?${params}` : ""}`;
};

export const questionEvidenceHref = (workspace: string, question: string, returnTo?: string) => {
  const path = `/investigation/${encodeURIComponent(workspace)}/evidence`;
  const params = new URLSearchParams({ question });
  if (returnTo) params.set("return", returnTo);
  return `${path}?${params}`;
};

export type QuestionDraft = {
  prompt: string;
  context: string;
  observation_ids: string[];
  origin?: QuestionContext;
};

export const questionDraftHref = (workspace: string, draft: QuestionDraft, returnTo?: string) => {
  const path = `/investigation/${encodeURIComponent(workspace)}/questions`;
  const params = new URLSearchParams({
    new: "1",
    draft_question: draft.prompt,
    draft_context: draft.context,
    draft_observations: draft.observation_ids.join(","),
  });
  if (draft.origin) {
    params.set("draft_context_kind", draft.origin.kind);
    params.set("draft_context_id", draft.origin.id);
  }
  if (returnTo) params.set("return", returnTo);
  return `${path}?${params}`;
};

export function questionContextHref(workspace: string, context: QuestionContext): string {
  const base = `/investigation/${encodeURIComponent(workspace)}`;
  switch (context.kind) {
    case "question": return `${base}/questions?question=${encodeURIComponent(context.id)}`;
    case "record": return `${base}/records?record=${encodeURIComponent(context.id)}`;
    case "event": return `${base}/timeline?event=${encodeURIComponent(context.id)}`;
    case "connection": return `${base}/connections?connection=${encodeURIComponent(context.id)}`;
    case "event_relationship": return `${base}/timeline?relationship=${encodeURIComponent(context.id)}`;
    case "brief": return `${base}/brief`;
    case "cluster": return `${base}/evidence?cluster=${encodeURIComponent(context.id)}`;
  }
}

export function questionContextLabel(kind: QuestionContext["kind"]): string {
  switch (kind) {
    case "question": return "question";
    case "record": return "record";
    case "event": return "event";
    case "connection": return "connection";
    case "event_relationship": return "event relationship";
    case "brief": return "working brief";
    case "cluster": return "evidence cluster";
  }
}

export function questionContextFrom(question: InvestigationQuestion): QuestionContext | undefined {
  return question.context_kind && question.context_id ? { kind: question.context_kind, id: question.context_id } : undefined;
}
