import type { HttpClient } from "@/lib/http";

export type EventTimePrecision = "unknown" | "exact" | "approximate" | "range";
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
  author: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};
export type EventPage = { items: TimelineEvent[]; next_cursor: string | null };
export type WriteEvent = {
  title: string;
  description: string;
  reported_time: string;
  time_precision: EventTimePrecision;
  sort_date: string;
  location: string;
  observation_ids: string[];
};

const base = (workspace: string) => `/workspaces/${encodeURIComponent(workspace)}/events`;
export function listEvents(http: HttpClient, workspace: string, before?: string) { return http.get<EventPage>(base(workspace), { params: { before, limit: 100 } }); }
export function readEvent(http: HttpClient, workspace: string, event: string) { return http.get<TimelineEvent>(`${base(workspace)}/${encodeURIComponent(event)}`); }
export function createEvent(http: HttpClient, workspace: string, body: WriteEvent) { return http.post<TimelineEvent>(base(workspace), { body }); }
export function updateEvent(http: HttpClient, workspace: string, event: string, body: WriteEvent) { return http.put<TimelineEvent>(`${base(workspace)}/${encodeURIComponent(event)}`, { body }); }
