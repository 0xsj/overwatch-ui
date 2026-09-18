import type { HttpClient } from "@/lib/http";

export type ResearchResolutionState = "proposed" | "accepted" | "rejected" | "reversed";
export type ResearchResolutionDecision = "accept" | "reject";

export type ResearchResolution = {
  resolution_id: string;
  workspace_id: string;
  alias_record_id: string;
  canonical_record_id: string;
  state: ResearchResolutionState;
  rationale: string;
  proposed_by: string;
  proposed_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  reversed_by?: string;
  reversed_at?: string;
  canonical_observation_ids_before: string[];
  added_observation_ids: string[];
  canonical_observation_ids_after: string[];
};

export type ResearchResolutionPage = { items: ResearchResolution[]; next_cursor: string | null };
export type ProposeResearchResolution = { canonical_record_id: string; rationale: string };

const base = (workspace: string) => `/workspaces/${encodeURIComponent(workspace)}`;

export function listResearchResolutions(http: HttpClient, workspace: string, before?: string) {
  return http.get<ResearchResolutionPage>(`${base(workspace)}/resolutions`, { params: { before, limit: 50 } });
}
export function createResearchResolution(http: HttpClient, workspace: string, alias: string, body: ProposeResearchResolution) {
  return http.post<ResearchResolution>(`${base(workspace)}/records/${encodeURIComponent(alias)}/resolutions`, { body });
}
export function reviewResearchResolution(http: HttpClient, workspace: string, resolution: string, decision: ResearchResolutionDecision) {
  return http.put<ResearchResolution>(`${base(workspace)}/resolutions/${encodeURIComponent(resolution)}`, { body: { decision } });
}
export function reverseResearchResolution(http: HttpClient, workspace: string, resolution: string) {
  return http.post<ResearchResolution>(`${base(workspace)}/resolutions/${encodeURIComponent(resolution)}/reverse`, { body: {} });
}
