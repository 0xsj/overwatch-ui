import type { HttpClient } from "@/lib/http";
import type { ResearchRecordKind } from "@/lib/services/research-records";

export type ResearchConnectionKind = "associated_with" | "may_belong_to" | "mentions" | "concerns_same_event" | "located_at" | "possible_same_subject";
export type ResearchConnectionState = "proposed" | "accepted" | "rejected" | "deferred";
export type ResearchConnectionReviewFilter = "" | "open" | "conflicted" | "uncited";
export type ResearchConnectionReviewFlags = { open: boolean; conflicted: boolean; uncited: boolean };

export type ResearchConnection = {
  connection_id: string;
  workspace_id: string;
  from_record_id: string;
  to_record_id: string;
  kind: ResearchConnectionKind;
  state: ResearchConnectionState;
  rationale: string;
  supporting_observation_ids: string[];
  opposing_observation_ids: string[];
  author: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  review_flags: ResearchConnectionReviewFlags;
};

export type ResearchConnectionPage = { items: ResearchConnection[]; next_cursor: string | null };
export type ResearchConnectionSummary = {
  connection_count: number;
  state_counts: Record<ResearchConnectionState, number>;
  open_count: number;
  conflicted_count: number;
  uncited_count: number;
};

export type ResearchConnectionRevision = {
  revision_id: string;
  workspace_id: string;
  connection_id: string;
  revision: number;
  from_record_id: string;
  from_record_kind: ResearchRecordKind;
  from_record_name: string;
  from_record_description: string;
  from_record_observation_ids: string[];
  to_record_id: string;
  to_record_kind: ResearchRecordKind;
  to_record_name: string;
  to_record_description: string;
  to_record_observation_ids: string[];
  kind: ResearchConnectionKind;
  state: ResearchConnectionState;
  rationale: string;
  supporting_observation_ids: string[];
  opposing_observation_ids: string[];
  changed_by: string;
  changed_at: string;
};

export type ResearchConnectionRevisionPage = { items: ResearchConnectionRevision[] };

export type WriteResearchConnection = {
  from_record_id: string;
  to_record_id: string;
  kind: ResearchConnectionKind;
  state: ResearchConnectionState;
  rationale: string;
  supporting_observation_ids: string[];
  opposing_observation_ids: string[];
};

export type ResearchConnectionReviewFindingKind = "support" | "opposition" | "alternative" | "discriminating_evidence";
export type ResearchConnectionReviewFinding = {
  kind: ResearchConnectionReviewFindingKind;
  summary: string;
  observation_ids: string[];
};
export type ResearchConnectionReview = {
  connection_review_id: string;
  workspace_id: string;
  connection_id: string;
  from_record_id: string;
  to_record_id: string;
  connection_kind: ResearchConnectionKind;
  connection_state: ResearchConnectionState;
  connection_rationale: string;
  supporting_observation_ids: string[];
  opposing_observation_ids: string[];
  provider: string;
  method: string;
  template_version: string;
  status: "completed" | "empty" | "failed" | "unsupported" | "timed_out";
  output: string;
  findings: ResearchConnectionReviewFinding[];
  created_by: string;
  created_at: string;
  error?: string;
};
export type ResearchConnectionReviewPage = { items: ResearchConnectionReview[]; next_cursor: string | null };

const base = (workspace: string) => "/workspaces/" + encodeURIComponent(workspace) + "/connections";

export function listResearchConnections(http: HttpClient, workspace: string, before?: string, state: ResearchConnectionState | "" = "", review: ResearchConnectionReviewFilter = "") {
  return http.get<ResearchConnectionPage>(base(workspace), { params: { before, state: state || undefined, review: review || undefined, limit: 50 } });
}

export function readResearchConnectionSummary(http: HttpClient, workspace: string) {
  return http.get<ResearchConnectionSummary>(base(workspace) + "/summary");
}

export function readResearchConnection(http: HttpClient, workspace: string, connection: string) {
  return http.get<ResearchConnection>(base(workspace) + "/" + encodeURIComponent(connection));
}
/** Hydrate a bounded set of linked assessments without making a paginated list
 * the source of truth for a brief or selected relationship. */
export async function readResearchConnectionsByIDs(http: HttpClient, workspace: string, connectionIDs: string[]) {
  const rows = await Promise.all(connectionIDs.map(async (connection) => {
    try {
      return await readResearchConnection(http, workspace, connection);
    } catch (error) {
      if (isNotFoundConnectionError(error)) return undefined;
      throw error;
    }
  }));
  return rows.filter((row): row is ResearchConnection => row !== undefined);
}

function isNotFoundConnectionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { kind?: unknown; status?: unknown };
  return candidate.kind === "not_found" || candidate.status === 404;
}

export function listResearchConnectionRevisions(http: HttpClient, workspace: string, connection: string) {
  return http.get<ResearchConnectionRevisionPage>(base(workspace) + "/" + encodeURIComponent(connection) + "/revisions");
}

export function readResearchConnectionRevision(http: HttpClient, workspace: string, connection: string, revision: string) {
  return http.get<ResearchConnectionRevision>(base(workspace) + "/" + encodeURIComponent(connection) + "/revisions/" + encodeURIComponent(revision));
}

export function createResearchConnection(http: HttpClient, workspace: string, body: WriteResearchConnection) {
  return http.post<ResearchConnection>(base(workspace), { body });
}

export function updateResearchConnection(http: HttpClient, workspace: string, connection: string, body: WriteResearchConnection) {
  return http.put<ResearchConnection>(base(workspace) + "/" + encodeURIComponent(connection), { body });
}

function reviewBase(workspace: string, connection: string) {
  return base(workspace) + "/" + encodeURIComponent(connection) + "/reviews";
}

export function listResearchConnectionReviews(http: HttpClient, workspace: string, connection: string, before?: string) {
  return http.get<ResearchConnectionReviewPage>(reviewBase(workspace, connection), { params: { before, limit: 20 } });
}

export function readResearchConnectionReview(http: HttpClient, workspace: string, connection: string, review: string) {
  return http.get<ResearchConnectionReview>(reviewBase(workspace, connection) + "/" + encodeURIComponent(review));
}

export function createResearchConnectionReview(http: HttpClient, workspace: string, connection: string) {
  return http.post<ResearchConnectionReview>(reviewBase(workspace, connection), { body: {} });
}
