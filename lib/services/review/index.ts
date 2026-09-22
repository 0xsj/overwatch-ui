import type { HttpClient } from "@/lib/http";

export type RelationKind = "supports" | "contradicts" | "repeats" | "unresolved";

export const relationKinds: RelationKind[] = ["supports", "contradicts", "repeats", "unresolved"];

export type ClusterKind = "claim" | "account";

export type Evidence = {
  observation_id: string;
  workspace_id: string;
  source_id: string;
  source_title: string;
  capture_id: string;
  extraction_id?: string;
  statement: string;
  quote: string;
  quote_start: number;
  quote_end: number;
  locator?: string;
  author: string;
  recorded_at: string;
};

export type BoardReviewState = "unreviewed" | "reviewed" | "contradiction" | "unresolved";
export type EvidenceBoardItem = Evidence & {
  review_state: BoardReviewState;
  supports: number;
  contradicts: number;
  repeats: number;
  unresolved: number;
  cluster_count: number;
};

export type EvidenceRelation = {
  relation_id: string;
  workspace_id: string;
  left_observation_id: string;
  right_observation_id: string;
  kind: RelationKind;
  rationale: string;
  author: string;
  created_at: string;
  updated_at: string;
};

export type EvidenceSourceLink = {
  source_link_id: string;
  workspace_id: string;
  downstream_observation_id: string;
  upstream_observation_id: string;
  rationale: string;
  author: string;
  created_at: string;
  updated_at: string;
  downstream_source_id: string;
  downstream_source_title: string;
  downstream_capture_id: string;
  downstream_statement: string;
  upstream_source_id: string;
  upstream_source_title: string;
  upstream_capture_id: string;
  upstream_statement: string;
  cycle_detected: boolean;
};

export type EvidenceCluster = {
  cluster_id: string;
  workspace_id: string;
  kind: ClusterKind;
  title: string;
  description: string;
  observation_ids: string[];
  author: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};

export type EvidenceClusterCoverageStatus = "no_evidence" | "needs_corroboration" | "contradiction_found" | "unresolved" | "review_incomplete" | "covered";
export type EvidenceClusterCoverage = {
  cluster_id: string;
  observation_count: number;
  distinct_source_count: number;
  reviewed_observation_count: number;
  supporting_count: number;
  contradicting_count: number;
  repeating_count: number;
  unresolved_count: number;
  internal_reviewed_pairs: number;
  possible_internal_pairs: number;
  unreviewed_internal_pairs: number;
  status: EvidenceClusterCoverageStatus;
};

export type EvidenceClusterPage = { items: EvidenceCluster[]; next_cursor: string | null };
export type WriteEvidenceCluster = { kind: ClusterKind; title: string; description: string; observation_ids: string[] };

export function relationCounts(relations: EvidenceRelation[]) {
  return relationKinds.reduce<Record<RelationKind, number>>((counts, kind) => {
    counts[kind] = relations.filter((relation) => relation.kind === kind).length;
    return counts;
  }, { supports: 0, contradicts: 0, repeats: 0, unresolved: 0 });
}

export type SynthesisCandidate = {
  kind: "account";
  name: string;
  observation_ids: string[];
  rationale: string;
};

export type EvidenceSynthesis = {
  synthesis_id: string;
  workspace_id: string;
  observation_ids: string[];
  provider: string;
  method: string;
  status: "completed" | "failed" | "unsupported" | "timed_out";
  output: string;
  candidates: SynthesisCandidate[];
  created_by: string;
  created_at: string;
  error?: string;
};

export type EvidenceComparisonFindingKind = "agreement" | "contradiction" | "possible_repetition" | "unique_detail" | "coverage_gap";
export type EvidenceComparisonFinding = {
  kind: EvidenceComparisonFindingKind;
  summary: string;
  observation_ids: string[];
};
export type EvidenceComparison = {
  comparison_id: string;
  workspace_id: string;
  observation_ids: string[];
  provider: string;
  method: string;
  template_version: string;
  status: "completed" | "empty" | "failed" | "unsupported" | "timed_out";
  output: string;
  findings: EvidenceComparisonFinding[];
  created_by: string;
  created_at: string;
  error?: string;
};

export type Page<T> = { items: T[]; next_cursor: string | null };
export type SetEvidenceRelation = {
  left_observation_id: string;
  right_observation_id: string;
  kind: RelationKind;
  rationale: string;
};
export type SetEvidenceSourceLink = {
  downstream_observation_id: string;
  upstream_observation_id: string;
  rationale: string;
};

const base = (workspace: string) => `/workspaces/${encodeURIComponent(workspace)}/evidence`;

export function listEvidence(http: HttpClient, workspace: string, before?: string) {
  return http.get<Page<Evidence>>(base(workspace), { params: { before, limit: 50 } });
}
export function listEvidenceBoard(http: HttpClient, workspace: string, before?: string, query = "", source = "", state: BoardReviewState | "" = "", record = "", event = "", dateFrom = "", dateTo = "", unresolved = false) {
  return http.get<Page<EvidenceBoardItem>>(`${base(workspace)}/board`, { params: { before, q: query.trim() || undefined, source: source || undefined, record: record || undefined, event: event || undefined, state: state || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined, unresolved: unresolved ? "true" : undefined, limit: 50 } });
}
export function readEvidence(http: HttpClient, workspace: string, observation: string) {
  return http.get<Evidence>(`${base(workspace)}/${encodeURIComponent(observation)}`);
}
/** Read a citation set without allowing one historical missing observation to
 * hide every citation that still exists. A not-found row is intentionally
 * omitted: callers render the requested identifier as unresolved. Other
 * failures remain fatal so transport and server problems cannot masquerade as
 * a missing citation. */
export async function readEvidenceByIDs(http: HttpClient, workspace: string, observationIds: string[]) {
  const rows = await Promise.all(observationIds.map(async (observation) => {
    try {
      return await readEvidence(http, workspace, observation);
    } catch (error) {
      if (isNotFoundEvidenceError(error)) return undefined;
      throw error;
    }
  }));
  return rows.filter((row): row is Evidence => row !== undefined);
}

function isNotFoundEvidenceError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { kind?: unknown; status?: unknown };
  return candidate.kind === "not_found" || candidate.status === 404;
}
export function listEvidenceRelations(http: HttpClient, workspace: string, before?: string) {
  return http.get<Page<EvidenceRelation>>(`${base(workspace)}/relations`, { params: { before, limit: 100 } });
}
export function setEvidenceRelation(http: HttpClient, workspace: string, body: SetEvidenceRelation) {
  return http.put<EvidenceRelation>(`${base(workspace)}/relations`, { body });
}
export function listEvidenceSourceLinks(http: HttpClient, workspace: string, before?: string) {
  return http.get<Page<EvidenceSourceLink>>(`${base(workspace)}/source-links`, { params: { before, limit: 50 } });
}
export function setEvidenceSourceLink(http: HttpClient, workspace: string, body: SetEvidenceSourceLink) {
  return http.put<EvidenceSourceLink>(`${base(workspace)}/source-links`, { body });
}
export function listEvidenceClusters(http: HttpClient, workspace: string, before?: string) {
  return http.get<EvidenceClusterPage>(`${base(workspace)}/clusters`, { params: { before, limit: 50 } });
}
export function listEvidenceClusterCoverage(http: HttpClient, workspace: string, before?: string) {
  return http.get<Page<EvidenceClusterCoverage>>(`${base(workspace)}/clusters/coverage`, { params: { before, limit: 50 } });
}
export function readEvidenceCluster(http: HttpClient, workspace: string, cluster: string) {
  return http.get<EvidenceCluster>(`${base(workspace)}/clusters/${encodeURIComponent(cluster)}`);
}
export function createEvidenceCluster(http: HttpClient, workspace: string, body: WriteEvidenceCluster) {
  return http.post<EvidenceCluster>(`${base(workspace)}/clusters`, { body });
}
export function updateEvidenceCluster(http: HttpClient, workspace: string, cluster: string, body: WriteEvidenceCluster) {
  return http.put<EvidenceCluster>(`${base(workspace)}/clusters/${encodeURIComponent(cluster)}`, { body });
}
export function listEvidenceSyntheses(http: HttpClient, workspace: string, before?: string) {
  return http.get<Page<EvidenceSynthesis>>(`${base(workspace)}/syntheses`, { params: { before, limit: 20 } });
}
export function readEvidenceSynthesis(http: HttpClient, workspace: string, synthesis: string) {
  return http.get<EvidenceSynthesis>(`${base(workspace)}/syntheses/${encodeURIComponent(synthesis)}`);
}
export function createEvidenceSynthesis(http: HttpClient, workspace: string, observationIds: string[]) {
  return http.post<EvidenceSynthesis>(`${base(workspace)}/syntheses`, { body: { observation_ids: observationIds } });
}
export function listEvidenceComparisons(http: HttpClient, workspace: string, before?: string) {
  return http.get<Page<EvidenceComparison>>(`${base(workspace)}/comparisons`, { params: { before, limit: 20 } });
}
export function readEvidenceComparison(http: HttpClient, workspace: string, comparison: string) {
  return http.get<EvidenceComparison>(`${base(workspace)}/comparisons/${encodeURIComponent(comparison)}`);
}
export function createEvidenceComparison(http: HttpClient, workspace: string, observationIds: string[]) {
  return http.post<EvidenceComparison>(`${base(workspace)}/comparisons`, { body: { observation_ids: observationIds } });
}

export type QuestionSuggestionGapKind = "unresolved_relation" | "contradiction" | "corroboration_gap" | "review_incomplete" | "open_question";
export type EvidenceQuestionSuggestionGap = {
  kind: QuestionSuggestionGapKind;
  label: string;
  detail: string;
  observation_ids: string[];
};
export type EvidenceQuestionSuggestion = {
  kind: QuestionSuggestionGapKind;
  prompt: string;
  context: string;
  observation_ids: string[];
};
export type EvidenceQuestionSuggestions = {
  question_suggestions_id: string;
  workspace_id: string;
  gaps: EvidenceQuestionSuggestionGap[];
  provider: string;
  method: string;
  template_version: string;
  status: "completed" | "empty" | "failed" | "unsupported" | "timed_out";
  output: string;
  suggestions: EvidenceQuestionSuggestion[];
  created_by: string;
  created_at: string;
  error?: string;
};
export function listEvidenceQuestionSuggestions(http: HttpClient, workspace: string, before?: string) {
  return http.get<Page<EvidenceQuestionSuggestions>>(`${base(workspace)}/question-suggestions`, { params: { before, limit: 20 } });
}
export function readEvidenceQuestionSuggestions(http: HttpClient, workspace: string, suggestion: string) {
  return http.get<EvidenceQuestionSuggestions>(`${base(workspace)}/question-suggestions/${encodeURIComponent(suggestion)}`);
}
export function createEvidenceQuestionSuggestions(http: HttpClient, workspace: string, gaps: EvidenceQuestionSuggestionGap[]) {
  return http.post<EvidenceQuestionSuggestions>(`${base(workspace)}/question-suggestions`, { body: { gaps } });
}
