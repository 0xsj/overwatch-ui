import type { HttpClient } from "@/lib/http";

export type WorkingNote = {
  note_id: string;
  body: string;
  author: string;
  created_at: string;
  updated_at: string;
  edited: boolean;
  mine: boolean;
  context_kind?: NoteContextKind;
  context_id?: string;
};
export type NoteContextKind = "question" | "record" | "event" | "connection" | "brief";
export type NoteContext = { kind: NoteContextKind; id: string };
export type WorkingNotePage = {
  items: WorkingNote[];
  next_cursor: string | null;
};
const path = (workspace: string) => `/workspaces/${encodeURIComponent(workspace)}/notes`;

export function listWorkingNotes(http: HttpClient, workspace: string) {
  return http.get<WorkingNote[]>(path(workspace), { params: { summary: true, limit: 100 } });
}
export function listWorkingNotesPage(http: HttpClient, workspace: string, before?: string, query = "", contextKind?: NoteContextKind) {
  const params: Record<string, string | number | boolean | undefined> = { page: true, summary: true, before, q: query.trim() || undefined, limit: 50 };
  if (contextKind) params.context_kind = contextKind;
  return http.get<WorkingNotePage>(path(workspace), { params });
}
export function readWorkingNote(http: HttpClient, workspace: string, note: string) {
  return http.get<WorkingNote>(`${path(workspace)}/${encodeURIComponent(note)}`);
}
export function writeWorkingNote(http: HttpClient, workspace: string, body: string, context?: NoteContext) {
  return http.post<WorkingNote>(path(workspace), { body: { body, context_kind: context?.kind, context_id: context?.id } });
}
export function editWorkingNote(http: HttpClient, workspace: string, note: string, body: string) {
  return http.put<WorkingNote>(`${path(workspace)}/${encodeURIComponent(note)}`, { body: { body } });
}
