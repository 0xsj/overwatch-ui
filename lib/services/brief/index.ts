import type { HttpClient } from "@/lib/http";

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
  question_ids: string[];
  connection_ids: string[];
  author: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};

export type WriteBrief = {
  title: string;
  question: string;
  current_account: string;
  alternatives: string;
  limitations: string;
  next_steps: string;
  observation_ids: string[];
  question_ids: string[];
  connection_ids: string[];
};

export type BriefSnapshotQuestion = {
  question_id: string;
  question: string;
  state: "open" | "answered" | "dismissed";
  resolution?: string;
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
  questions: BriefSnapshotQuestion[];
  connections: BriefSnapshotConnection[];
  author: string;
  updated_by: string;
  frozen_by: string;
  source_updated_at: string;
  frozen_at: string;
};

export type BriefSnapshotPage = { items: BriefSnapshot[]; next_cursor: string | null };

const path = (workspace: string) => `/workspaces/${encodeURIComponent(workspace)}/brief`;

export function readBrief(http: HttpClient, workspace: string) {
  return http.get<WorkingBrief | null>(path(workspace));
}

export function saveBrief(http: HttpClient, workspace: string, body: WriteBrief) {
  return http.put<WorkingBrief>(path(workspace), { body });
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
