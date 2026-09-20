import type { HttpClient } from "@/lib/http";

export type ResearchResolutionSet = {
  resolution_set_id: string;
  workspace_id: string;
  alias_record_ids: string[];
  canonical_record_id: string;
  state: "proposed" | "accepted" | "rejected" | "reversed";
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

export type ResearchResolutionSetPage = { items: ResearchResolutionSet[]; next_cursor: string | null };
export type ProposeResearchResolutionSet = { canonical_record_id: string; alias_record_ids: string[]; rationale: string };
export type ResearchResolutionSetDecision = "accept" | "reject";

const base = (workspace: string) => `/workspaces/${encodeURIComponent(workspace)}/resolution-sets`;

export function listResearchResolutionSets(http: HttpClient, workspace: string, before?: string) {
  return http.get<ResearchResolutionSetPage>(base(workspace), { params: { before, limit: 50 } });
}
export function createResearchResolutionSet(http: HttpClient, workspace: string, body: ProposeResearchResolutionSet) {
  return http.post<ResearchResolutionSet>(base(workspace), { body });
}
export function reviewResearchResolutionSet(http: HttpClient, workspace: string, resolutionSet: string, decision: ResearchResolutionSetDecision) {
  return http.put<ResearchResolutionSet>(`${base(workspace)}/${encodeURIComponent(resolutionSet)}`, { body: { decision } });
}
export function reverseResearchResolutionSet(http: HttpClient, workspace: string, resolutionSet: string) {
  return http.post<ResearchResolutionSet>(`${base(workspace)}/${encodeURIComponent(resolutionSet)}/reverse`, { body: {} });
}
export function readResearchResolutionSetImpact(http: HttpClient, workspace: string, resolutionSet: string) {
  return http.get<import("@/lib/services/research-resolutions").ResearchResolutionImpact>(`${base(workspace)}/${encodeURIComponent(resolutionSet)}/impact`);
}
