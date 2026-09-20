import type { NoteContext } from "./index";

export const noteHref = (workspace: string, note?: string, returnTo?: string) => {
  const path = `/investigation/${encodeURIComponent(workspace)}/notes`;
  const params = new URLSearchParams();
  if (note) params.set("note", note);
  if (returnTo) params.set("return", returnTo);
  return `${path}${params.size ? `?${params}` : ""}`;
};

export type NoteDraft = { body: string; context?: NoteContext };

export const noteDraftHref = (workspace: string, draft: NoteDraft, returnTo?: string, context?: NoteContext) => {
  const path = `/investigation/${encodeURIComponent(workspace)}/notes`;
  const params = new URLSearchParams({ new: "1", draft_note: draft.body });
  if (returnTo) params.set("return", returnTo);
  if (context) {
    params.set("context_kind", context.kind);
    params.set("context_id", context.id);
  }
  return `${path}?${params}`;
};

export function noteContextHref(workspace: string, context: NoteContext): string {
  const base = `/investigation/${encodeURIComponent(workspace)}`;
  switch (context.kind) {
    case "question": return `${base}/questions?question=${encodeURIComponent(context.id)}`;
    case "record": return `${base}/records?record=${encodeURIComponent(context.id)}`;
    case "event": return `${base}/timeline?event=${encodeURIComponent(context.id)}`;
    case "connection": return `${base}/connections?connection=${encodeURIComponent(context.id)}`;
    case "brief": return `${base}/brief`;
  }
}

export function noteContextLabel(kind: NoteContext["kind"]): string {
  return kind === "question" ? "Question" : kind === "record" ? "Record" : kind === "event" ? "Event" : kind === "connection" ? "Connection" : "Working brief";
}
