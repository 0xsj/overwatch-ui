import type { HttpClient } from "@/lib/http";

export type AssistanceProposalState = "proposed" | "accepted" | "rejected";
export type AssistanceDecision = "accept" | "reject";

export type AssistanceProviderPolicy = {
  workspace_id: string;
  allow_external: boolean;
  updated_by?: string;
  updated_at?: string;
};

export type AssistanceProviderRun = {
  provider_run_id: string;
  workspace_id: string;
  kind: "extraction" | "synthesis" | "comparison" | "question_suggestions" | "brief_draft" | "connection_review";
  result_id: string;
  provider: string;
  method: string;
  template_version: string;
  status: "completed" | "empty" | "partial" | "failed" | "unsupported" | "timed_out";
  input_bytes: number;
  output_bytes: number;
  duration_ms: number;
  timed_out: boolean;
  error?: string;
  created_by: string;
  created_at: string;
  completed_at: string;
};

export type AssistanceProviderRunPage = { items: AssistanceProviderRun[] };

export type AssistanceOperation = {
  operation_id: string;
  workspace_id: string;
  source_id: string;
  capture_id: string;
  extraction_id?: string;
  status: "completed" | "empty" | "partial" | "failed" | "unsupported";
  provider: string;
  method: string;
  template_version: string;
  created_by: string;
  created_at: string;
  completed_at: string;
  proposal_count: number;
  input_bytes: number;
  output_bytes: number;
  duration_ms: number;
  timed_out: boolean;
  error?: string;
  retry_of?: string;
};

export type AssistanceProposal = {
  proposal_id: string;
  operation_id: string;
  workspace_id: string;
  source_id: string;
  capture_id: string;
  extraction_id?: string;
  generated_statement: string;
  generated_quote: string;
  generated_quote_start: number;
  generated_quote_end: number;
  candidate_kind?: "person" | "account" | "organisation" | "place";
  candidate_name?: string;
  candidate_description?: string;
  relationship_kind?: "associated_with" | "may_belong_to" | "mentions" | "concerns_same_event" | "located_at" | "possible_same_subject";
  related_candidate_kind?: "person" | "account" | "organisation" | "place";
  related_candidate_name?: string;
  relationship_description?: string;
  state: AssistanceProposalState;
  reviewed_statement?: string;
  reviewed_quote?: string;
  reviewed_quote_start?: number;
  reviewed_quote_end?: number;
  reviewed_by?: string;
  reviewed_at?: string;
  review_note?: string;
  created_at: string;
};

export type AssistanceDetail = { operation: AssistanceOperation; proposals: AssistanceProposal[] };
export type LatestAssistance = { operation: AssistanceOperation | null; proposals: AssistanceProposal[] };
export type AssistanceHistoryPage = { items: AssistanceDetail[] };
export type ReviewAssistanceProposal = { decision: AssistanceDecision; statement?: string; quote?: string; quote_start?: number; note?: string };

const captureBase = (workspace: string, source: string, capture: string) => `/workspaces/${encodeURIComponent(workspace)}/sources/${encodeURIComponent(source)}/captures/${encodeURIComponent(capture)}/assistance`;
const operationBase = (workspace: string, operation: string) => `/workspaces/${encodeURIComponent(workspace)}/assistance/${encodeURIComponent(operation)}`;
const policyPath = (workspace: string) => `/workspaces/${encodeURIComponent(workspace)}/assistance/policy`;
const providerRunsPath = (workspace: string) => `/workspaces/${encodeURIComponent(workspace)}/assistance/runs`;

export function readAssistanceProviderPolicy(http: HttpClient, workspace: string) {
  return http.get<AssistanceProviderPolicy>(policyPath(workspace));
}
export function setAssistanceProviderPolicy(http: HttpClient, workspace: string, allowExternal: boolean) {
  return http.put<AssistanceProviderPolicy>(policyPath(workspace), { body: { allow_external: allowExternal } });
}

export function readAssistanceProviderRuns(http: HttpClient, workspace: string, limit = 50) {
  return http.get<AssistanceProviderRunPage>(providerRunsPath(workspace), { params: { limit } });
}

export function generateAssistance(http: HttpClient, workspace: string, source: string, capture: string, extraction?: string, retryOperation?: string) {
  return http.post<AssistanceDetail>(captureBase(workspace, source, capture), { body: { ...(extraction ? { extraction_id: extraction } : {}), ...(retryOperation ? { retry_operation_id: retryOperation } : {}) } });
}
export function readLatestAssistance(http: HttpClient, workspace: string, source: string, capture: string, extraction?: string) {
  return http.get<LatestAssistance>(captureBase(workspace, source, capture), { params: { extraction_id: extraction || undefined } });
}
export function readAssistanceHistory(http: HttpClient, workspace: string, source: string, capture: string, extraction?: string) {
  return http.get<AssistanceHistoryPage>(`${captureBase(workspace, source, capture)}/history`, { params: { extraction_id: extraction || undefined, limit: 20 } });
}
export function readAssistance(http: HttpClient, workspace: string, operation: string) {
  return http.get<AssistanceDetail>(operationBase(workspace, operation));
}
export function reviewAssistanceProposal(http: HttpClient, workspace: string, operation: string, proposal: string, body: ReviewAssistanceProposal) {
  return http.put<AssistanceProposal>(`${operationBase(workspace, operation)}/proposals/${encodeURIComponent(proposal)}`, { body });
}
