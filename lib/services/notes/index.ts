import type { HttpClient } from "@/lib/http";

export type WorkingNote = {
  note_id: string;
  body: string;
  author: string;
  created_at: string;
  updated_at: string;
  edited: boolean;
  mine: boolean;
};
const path = (workspace: string) => `/workspaces/${encodeURIComponent(workspace)}/notes`;

export function listWorkingNotes(http: HttpClient, workspace: string) {
  return http.get<WorkingNote[]>(path(workspace), { params: { summary: true, limit: 100 } });
}
export function readWorkingNote(http: HttpClient, workspace: string, note: string) {
  return http.get<WorkingNote>(`${path(workspace)}/${encodeURIComponent(note)}`);
}
export function writeWorkingNote(http: HttpClient, workspace: string, body: string) {
  return http.post<WorkingNote>(path(workspace), { body: { body } });
}
export function editWorkingNote(http: HttpClient, workspace: string, note: string, body: string) {
  return http.put<WorkingNote>(`${path(workspace)}/${encodeURIComponent(note)}`, { body: { body } });
}
