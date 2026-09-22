import type { HttpClient } from "@/lib/http";
import type { AuditPage } from "@/lib/services/ledger";
import type { QuestionState } from "@/lib/services/questions";

export type WorkingBrief = {
  brief_id: string;
  workspace_id: string;
  title: string;
  question: string;
  current_account?: string;
  alternatives?: string;
  limitations?: string;
  next_steps?: string;
  observation_ids: string[];
  cluster_ids: string[];
  question_ids: string[];
  connection_ids: string[];
  event_ids: string[];
  author: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};

export type BriefDraftSection = "title" | "question" | "current_account" | "alternatives" | "limitations" | "next_steps";
export type BriefDraftInput = {
  brief_id: string;
  title: string;
  question: string;
  current_account?: string;
  alternatives?: string;
  limitations?: string;
  next_steps?: string;
  observation_ids: string[];
};
export type BriefDraftChange = {
  section: BriefDraftSection;
  before: string;
  after: string;
  rationale: string;
  observation_ids: string[];
};
export type BriefDraft = {
  brief_draft_id: string;
  workspace_id: string;
  input: BriefDraftInput;
  provider: string;
  method: string;
  template_version: string;
  status: "completed" | "empty" | "failed" | "unsupported" | "timed_out";
  output: string;
  changes: BriefDraftChange[];
  created_by: string;
  created_at: string;
  error?: string;
};
export type BriefDraftPage = { items: BriefDraft[]; next_cursor: string | null };

export type WriteBrief = {
  title: string;
  question: string;
  current_account: string;
  alternatives: string;
  limitations: string;
  next_steps: string;
  observation_ids: string[];
  cluster_ids: string[];
  question_ids: string[];
  connection_ids: string[];
  event_ids: string[];
};

export type BriefSnapshotQuestion = {
  question_id: string;
  question: string;
  state: QuestionState;
  resolution?: string;
  observation_ids: string[];
};

export type BriefSnapshotCluster = {
  cluster_id: string;
  kind: "claim" | "account";
  title: string;
  description: string;
  observation_ids: string[];
};

export type BriefSnapshotConnection = {
  connection_id: string;
  from_record_id: string;
  from_record_kind: string;
  from_record_name: string;
  from_record_description: string;
  from_record_observation_ids: string[];
  to_record_id: string;
  to_record_kind: string;
  to_record_name: string;
  to_record_description: string;
  to_record_observation_ids: string[];
  kind: string;
  state: string;
  rationale: string;
  supporting_observation_ids: string[];
  opposing_observation_ids: string[];
};

export type BriefSnapshotEventRecord = {
  record_id: string;
  kind: string;
  name: string;
  description: string;
  observation_ids: string[];
  place_geometry?: { latitude: number; longitude: number; precision: "exact" | "approximate" | "region"; observation_ids: string[] };
};

export type BriefSnapshotEvent = {
  event_id: string;
  event_revision_id?: string;
  event_revision?: number;
  title: string;
  description: string;
  reported_time: string;
  time_precision: string;
  sort_date: string;
  location: string;
  observation_ids: string[];
  participant_records: BriefSnapshotEventRecord[];
  location_record?: BriefSnapshotEventRecord;
};

export type BriefSnapshotEventRelationship = {
  relationship_id: string;
  from_event_id: string;
  to_event_id: string;
  kind: string;
  rationale: string;
  state: string;
  review_note?: string;
  supporting_observation_ids: string[];
  opposing_observation_ids: string[];
};

export type BriefSnapshot = {
  snapshot_id: string;
  workspace_id: string;
  brief_id: string;
  title: string;
  question: string;
  current_account?: string;
  alternatives?: string;
  limitations?: string;
  next_steps?: string;
  observation_ids: string[];
  clusters: BriefSnapshotCluster[];
  questions: BriefSnapshotQuestion[];
  connections: BriefSnapshotConnection[];
  events: BriefSnapshotEvent[];
  event_relationships: BriefSnapshotEventRelationship[];
  author: string;
  updated_by: string;
  frozen_by: string;
  source_updated_at: string;
  frozen_at: string;
};

export type BriefSnapshotPage = { items: BriefSnapshot[]; next_cursor: string | null };

export type SnapshotReviewState = "pending" | "approved" | "changes_requested";

export type BriefSnapshotReviewDecision = {
  decision_id: string;
  reviewer_id: string;
  state: Exclude<SnapshotReviewState, "pending">;
  note?: string;
  created_at: string;
};

export type BriefSnapshotReview = {
  workspace_id: string;
  snapshot_id: string;
  state: SnapshotReviewState;
  assignee_id?: string;
  assigned_by?: string;
  assigned_at?: string;
  updated_at: string;
  decisions: BriefSnapshotReviewDecision[];
};

export type SnapshotReviewAssignment = { assignee_id: string | null };
export type SnapshotReviewDecision = { state: Exclude<SnapshotReviewState, "pending">; note: string };

export type BriefSnapshotComment = {
  comment_id: string;
  workspace_id: string;
  snapshot_id: string;
  author: string;
  body: string;
  created_at: string;
};

export type AddSnapshotComment = { body: string };

export type BriefRecipientHandoff = {
  snapshot_id: string;
  workspace_id: string;
  visibility: "recipient";
  redactions: string[];
  title: string;
  question: string;
  current_account?: string;
  alternatives?: string;
  limitations?: string;
  next_steps?: string;
  clusters: { kind: string; title: string; description?: string }[];
  questions: { question: string; state: string; resolution?: string }[];
  connections: { from_name: string; to_name: string; kind: string; state: string; rationale: string }[];
  events: { title: string; description?: string; reported_time?: string; time_precision: string; sort_date?: string; location?: string }[];
  event_relationships: { from_title: string; to_title: string; kind: string; state: string; rationale: string }[];
  source_updated_at: string;
  frozen_at: string;
};

export type BriefRecipientHandoffPage = { items: BriefRecipientHandoff[]; next_cursor: string | null };

export type BriefHandoffShare = {
  share_id: string;
  workspace_id: string;
  snapshot_id: string;
  created_by: string;
  created_at: string;
  revoked_at?: string;
  revoked_by?: string;
  token?: string;
};

export type BriefHandoffExport = {
  filename: string;
  content_type: "text/markdown";
  content: string;
};

const path = (workspace: string) => `/workspaces/${encodeURIComponent(workspace)}/brief`;

export function readBrief(http: HttpClient, workspace: string) {
  return http.get<WorkingBrief | null>(path(workspace));
}

export function saveBrief(http: HttpClient, workspace: string, body: WriteBrief) {
  return http.put<WorkingBrief>(path(workspace), { body });
}

export function listBriefDrafts(http: HttpClient, workspace: string, before?: string) {
  return http.get<BriefDraftPage>(`${path(workspace)}/drafts`, { params: { before, limit: 20 } });
}
export function readBriefDraft(http: HttpClient, workspace: string, draft: string) {
  return http.get<BriefDraft>(`${path(workspace)}/drafts/${encodeURIComponent(draft)}`);
}
export function createBriefDraft(http: HttpClient, workspace: string, observationIds: string[]) {
  return http.post<BriefDraft>(`${path(workspace)}/drafts`, { body: { observation_ids: observationIds } });
}

export function listBriefSnapshots(http: HttpClient, workspace: string, before?: string) {
  return http.get<BriefSnapshotPage>(`${path(workspace)}/snapshots`, { params: { before, limit: 50 } });
}

export function createBriefSnapshot(http: HttpClient, workspace: string) {
  return http.post<BriefSnapshot>(`${path(workspace)}/snapshots`, { body: {} });
}

export function readBriefSnapshot(http: HttpClient, workspace: string, snapshot: string) {
  return http.get<BriefSnapshot>(`${path(workspace)}/snapshots/${encodeURIComponent(snapshot)}`);
}

export function readBriefSnapshotActivity(http: HttpClient, workspace: string, snapshot: string, options?: { after?: string; facet?: string }) {
  return http.get<AuditPage>(`${path(workspace)}/snapshots/${encodeURIComponent(snapshot)}/activity`, { params: { after: options?.after, limit: 50, facet: options?.facet } });
}

export function readBriefSnapshotReview(http: HttpClient, workspace: string, snapshot: string) {
  return http.get<BriefSnapshotReview>(`${path(workspace)}/snapshots/${encodeURIComponent(snapshot)}/review`);
}

export function assignBriefSnapshotReviewer(http: HttpClient, workspace: string, snapshot: string, body: SnapshotReviewAssignment) {
  return http.put<BriefSnapshotReview>(`${path(workspace)}/snapshots/${encodeURIComponent(snapshot)}/review/assignment`, { body });
}

export function submitBriefSnapshotReview(http: HttpClient, workspace: string, snapshot: string, body: SnapshotReviewDecision) {
  return http.post<BriefSnapshotReview>(`${path(workspace)}/snapshots/${encodeURIComponent(snapshot)}/review/decisions`, { body });
}

export function listBriefSnapshotComments(http: HttpClient, workspace: string, snapshot: string) {
  return http.get<BriefSnapshotComment[]>(`${path(workspace)}/snapshots/${encodeURIComponent(snapshot)}/comments`);
}

export function addBriefSnapshotComment(http: HttpClient, workspace: string, snapshot: string, body: AddSnapshotComment) {
  return http.post<BriefSnapshotComment>(`${path(workspace)}/snapshots/${encodeURIComponent(snapshot)}/comments`, { body });
}

export function listBriefRecipientHandoffs(http: HttpClient, workspace: string, before?: string) {
  return http.get<BriefRecipientHandoffPage>(`${path(workspace)}/handoffs`, { params: { before, limit: 50 } });
}

export function readBriefRecipientHandoff(http: HttpClient, workspace: string, snapshot: string) {
  return http.get<BriefRecipientHandoff>(`${path(workspace)}/handoffs/${encodeURIComponent(snapshot)}`);
}

export function listBriefSnapshotShares(http: HttpClient, workspace: string, snapshot: string) {
  return http.get<BriefHandoffShare[]>(`${path(workspace)}/snapshots/${encodeURIComponent(snapshot)}/shares`);
}

export function createBriefSnapshotShare(http: HttpClient, workspace: string, snapshot: string) {
  return http.post<BriefHandoffShare>(`${path(workspace)}/snapshots/${encodeURIComponent(snapshot)}/shares`, { body: {} });
}

export function revokeBriefSnapshotShare(http: HttpClient, workspace: string, share: string) {
  return http.post<BriefHandoffShare>(`${path(workspace)}/shares/${encodeURIComponent(share)}/revoke`, { body: {} });
}

export function readBriefSharedHandoff(http: HttpClient, workspace: string, token: string) {
  return http.get<BriefRecipientHandoff>(`${path(workspace)}/shared/${encodeURIComponent(token)}`);
}

export function readBriefRecipientHandoffExport(http: HttpClient, workspace: string, snapshot: string) {
  return http.get<BriefHandoffExport>(`${path(workspace)}/handoffs/${encodeURIComponent(snapshot)}/export`);
}

export function readBriefSharedHandoffExport(http: HttpClient, workspace: string, token: string) {
  return http.get<BriefHandoffExport>(`${path(workspace)}/shared/${encodeURIComponent(token)}/export`);
}
