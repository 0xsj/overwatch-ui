import type { HttpClient } from "@/lib/http";
import type { PlaceGeometry } from "../research-records";

export type EventTimePrecision = "unknown" | "exact" | "approximate" | "range";
export type EventParticipantRole = "associated" | "actor" | "subject" | "target" | "witness" | "affected" | "reporter";
export type EventParticipantLink = { record_id: string; role: EventParticipantRole };
export type TimelineEvent = {
  event_id: string;
  workspace_id: string;
  title: string;
  description?: string;
  reported_time?: string;
  time_precision: EventTimePrecision;
  sort_date?: string;
  location?: string;
  observation_ids: string[];
  participant_record_ids: string[];
  participant_links?: EventParticipantLink[];
  location_record_id?: string;
  author: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};
export type EventPage = { items: TimelineEvent[]; next_cursor: string | null };
export type EventRecordSnapshot = {
  record_id: string;
  kind: string;
  name: string;
  description?: string;
  observation_ids: string[];
  place_geometry?: PlaceGeometry;
  role?: EventParticipantRole;
};
export type TimelineEventRevision = {
  revision_id: string;
  workspace_id: string;
  event_id: string;
  revision: number;
  title: string;
  description?: string;
  reported_time?: string;
  time_precision: EventTimePrecision;
  sort_date?: string;
  location?: string;
  observation_ids: string[];
  participant_record_ids: string[];
  participant_links?: EventParticipantLink[];
  participant_records: EventRecordSnapshot[];
  location_record_id?: string;
  location_record?: EventRecordSnapshot;
  changed_by: string;
  changed_at: string;
};
export type TimelineEventRevisionPage = { items: TimelineEventRevision[] };
export type EventAccount = {
  account_id: string;
  workspace_id: string;
  event_id: string;
  title: string;
  description?: string;
  reported_time?: string;
  time_precision: EventTimePrecision;
  sort_date?: string;
  location?: string;
  observation_ids: string[];
  participant_record_ids: string[];
  location_record_id?: string;
  author: string;
  created_at: string;
  updated_at: string;
};
export type EventReconciliationDecision = "unresolved" | "retain_event" | "prefer_account";
export type EventReconciliation = {
  reconciliation_id: string;
  workspace_id: string;
  event_id: string;
  decision: EventReconciliationDecision;
  selected_account_id?: string;
  rationale: string;
  reviewed_by: string;
  reviewed_at: string;
};
export type EventAccountPage = { items: EventAccount[]; reconciliation?: EventReconciliation };
export type EventClusterState = "proposed" | "accepted" | "rejected";
export type EventCluster = {
  cluster_id: string;
  workspace_id: string;
  title: string;
  description: string;
  event_ids: string[];
  state: EventClusterState;
  review_note?: string;
  author: string;
  updated_by: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
};
export type EventClusterPage = { items: EventCluster[]; next_cursor: string | null };
export type EventRelationshipKind = "related" | "precedes" | "overlaps" | "same_occurrence_candidate" | "possibly_causes";
export type EventRelationshipState = "proposed" | "accepted" | "rejected";
export type EventRelationship = {
  relationship_id: string;
  workspace_id: string;
  from_event_id: string;
  to_event_id: string;
  kind: EventRelationshipKind;
  rationale: string;
  state: EventRelationshipState;
  review_note?: string;
  supporting_observation_ids: string[];
  opposing_observation_ids: string[];
  author: string;
  updated_by: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
};
export type EventRelationshipPage = { items: EventRelationship[]; next_cursor: string | null };
export type WriteEventRelationship = { from_event_id: string; to_event_id: string; kind: EventRelationshipKind; rationale: string; supporting_observation_ids: string[]; opposing_observation_ids: string[] };
export type WriteEvent = {
  title: string;
  description: string;
  reported_time: string;
  time_precision: EventTimePrecision;
  sort_date: string;
  location: string;
  observation_ids: string[];
  participant_record_ids: string[];
  participant_links: EventParticipantLink[];
  location_record_id?: string;
};
export type WriteEventAccount = WriteEvent;
export type WriteEventCluster = { title: string; description: string; event_ids: string[] };

const base = (workspace: string) => `/workspaces/${encodeURIComponent(workspace)}/events`;
export function listEvents(http: HttpClient, workspace: string, before?: string) { return http.get<EventPage>(base(workspace), { params: { before, limit: 100 } }); }
export function readEvent(http: HttpClient, workspace: string, event: string) { return http.get<TimelineEvent>(`${base(workspace)}/${encodeURIComponent(event)}`); }
export function createEvent(http: HttpClient, workspace: string, body: WriteEvent) { return http.post<TimelineEvent>(base(workspace), { body }); }
export function updateEvent(http: HttpClient, workspace: string, event: string, body: WriteEvent) { return http.put<TimelineEvent>(`${base(workspace)}/${encodeURIComponent(event)}`, { body }); }
export function listEventRevisions(http: HttpClient, workspace: string, event: string) { return http.get<TimelineEventRevisionPage>(`${base(workspace)}/${encodeURIComponent(event)}/revisions`); }
export function readEventRevision(http: HttpClient, workspace: string, event: string, revision: string) { return http.get<TimelineEventRevision>(`${base(workspace)}/${encodeURIComponent(event)}/revisions/${encodeURIComponent(revision)}`); }
export function listEventAccounts(http: HttpClient, workspace: string, event: string) { return http.get<EventAccountPage>(`${base(workspace)}/${encodeURIComponent(event)}/accounts`); }
export function createEventAccount(http: HttpClient, workspace: string, event: string, body: WriteEventAccount) { return http.post<EventAccount>(`${base(workspace)}/${encodeURIComponent(event)}/accounts`, { body }); }
export function reconcileEventAccounts(http: HttpClient, workspace: string, event: string, body: { decision: EventReconciliationDecision; selected_account_id?: string; rationale: string }) { return http.put<EventReconciliation>(`${base(workspace)}/${encodeURIComponent(event)}/accounts/reconciliation`, { body }); }
export function listEventClusters(http: HttpClient, workspace: string, before?: string) { return http.get<EventClusterPage>(`/workspaces/${encodeURIComponent(workspace)}/event-clusters`, { params: { before, limit: 50 } }); }
export function readEventCluster(http: HttpClient, workspace: string, cluster: string) { return http.get<EventCluster>(`/workspaces/${encodeURIComponent(workspace)}/event-clusters/${encodeURIComponent(cluster)}`); }
export function createEventCluster(http: HttpClient, workspace: string, body: WriteEventCluster) { return http.post<EventCluster>(`/workspaces/${encodeURIComponent(workspace)}/event-clusters`, { body }); }
export function updateEventCluster(http: HttpClient, workspace: string, cluster: string, body: WriteEventCluster) { return http.put<EventCluster>(`/workspaces/${encodeURIComponent(workspace)}/event-clusters/${encodeURIComponent(cluster)}`, { body }); }
export function reviewEventCluster(http: HttpClient, workspace: string, cluster: string, body: { state: EventClusterState; note: string }) { return http.put<EventCluster>(`/workspaces/${encodeURIComponent(workspace)}/event-clusters/${encodeURIComponent(cluster)}/review`, { body }); }
export function listEventRelationships(http: HttpClient, workspace: string, before?: string) { return http.get<EventRelationshipPage>(`/workspaces/${encodeURIComponent(workspace)}/event-relationships`, { params: { before, limit: 50 } }); }
export function readEventRelationship(http: HttpClient, workspace: string, relationship: string) { return http.get<EventRelationship>(`/workspaces/${encodeURIComponent(workspace)}/event-relationships/${encodeURIComponent(relationship)}`); }
export function createEventRelationship(http: HttpClient, workspace: string, body: WriteEventRelationship) { return http.post<EventRelationship>(`/workspaces/${encodeURIComponent(workspace)}/event-relationships`, { body }); }
export function reviewEventRelationship(http: HttpClient, workspace: string, relationship: string, body: { state: EventRelationshipState; note: string }) { return http.put<EventRelationship>(`/workspaces/${encodeURIComponent(workspace)}/event-relationships/${encodeURIComponent(relationship)}/review`, { body }); }
