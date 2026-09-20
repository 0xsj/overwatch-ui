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
};

export const questionDraftHref = (workspace: string, draft: QuestionDraft, returnTo?: string) => {
  const path = `/investigation/${encodeURIComponent(workspace)}/questions`;
  const params = new URLSearchParams({
    new: "1",
    draft_question: draft.prompt,
    draft_context: draft.context,
    draft_observations: draft.observation_ids.join(","),
  });
  if (returnTo) params.set("return", returnTo);
  return `${path}?${params}`;
};
