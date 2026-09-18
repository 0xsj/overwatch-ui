import type { HttpClient } from "@/lib/http";

export type RelationKind = "supports" | "contradicts" | "repeats" | "unresolved";

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
  output: string;
  candidates: SynthesisCandidate[];
  created_by: string;
  created_at: string;
};

export type Page<T> = { items: T[]; next_cursor: string | null };
export type SetEvidenceRelation = {
  left_observation_id: string;
  right_observation_id: string;
  kind: RelationKind;
  rationale: string;
};

const base = (workspace: string) => `/workspaces/${encodeURIComponent(workspace)}/evidence`;

export function listEvidence(http: HttpClient, workspace: string, before?: string) {
  return http.get<Page<Evidence>>(base(workspace), { params: { before, limit: 50 } });
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
export function listEvidenceSyntheses(http: HttpClient, workspace: string, before?: string) {
  return http.get<Page<EvidenceSynthesis>>(`${base(workspace)}/syntheses`, { params: { before, limit: 20 } });
}
export function readEvidenceSynthesis(http: HttpClient, workspace: string, synthesis: string) {
  return http.get<EvidenceSynthesis>(`${base(workspace)}/syntheses/${encodeURIComponent(synthesis)}`);
}
export function createEvidenceSynthesis(http: HttpClient, workspace: string, observationIds: string[]) {
  return http.post<EvidenceSynthesis>(`${base(workspace)}/syntheses`, { body: { observation_ids: observationIds } });
}
