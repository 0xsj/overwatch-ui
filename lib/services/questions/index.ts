import type { HttpClient } from "@/lib/http";

export type QuestionState = "open" | "answered" | "dismissed";

export type InvestigationQuestion = {
  question_id: string;
  workspace_id: string;
  question: string;
  context?: string;
  state: QuestionState;
  resolution?: string;
  author: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  observation_ids: string[];
};

export type QuestionPage = {
  items: InvestigationQuestion[];
  next_cursor: string | null;
};

export type WriteQuestion = {
  question: string;
  context: string;
  state: QuestionState;
  resolution: string;
  observation_ids: string[];
};

const base = (workspace: string) => "/workspaces/" + encodeURIComponent(workspace) + "/questions";

export function listQuestions(http: HttpClient, workspace: string, before?: string) {
  return http.get<QuestionPage>(base(workspace), { params: { before, limit: 50 } });
}

export function readQuestion(http: HttpClient, workspace: string, question: string) {
  return http.get<InvestigationQuestion>(base(workspace) + "/" + encodeURIComponent(question));
}
/** Hydrate explicitly linked questions without making the paginated list the
 * source of truth for a working brief. Missing rows remain unresolved by ID;
 * other failures remain fatal. */
export async function readQuestionsByIDs(http: HttpClient, workspace: string, questionIDs: string[]) {
  const rows = await Promise.all(questionIDs.map(async (question) => {
    try {
      return await readQuestion(http, workspace, question);
    } catch (error) {
      if (isNotFoundQuestionError(error)) return undefined;
      throw error;
    }
  }));
  return rows.filter((row): row is InvestigationQuestion => row !== undefined);
}

function isNotFoundQuestionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { kind?: unknown; status?: unknown };
  return candidate.kind === "not_found" || candidate.status === 404;
}

export function createQuestion(http: HttpClient, workspace: string, body: WriteQuestion) {
  return http.post<InvestigationQuestion>(base(workspace), { body });
}

export function updateQuestion(http: HttpClient, workspace: string, question: string, body: WriteQuestion) {
  return http.put<InvestigationQuestion>(base(workspace) + "/" + encodeURIComponent(question), { body });
}
