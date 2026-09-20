import type { HttpClient } from "@/lib/http";
import type { ChangePage } from "./changes.types";

const ws = (id: string) => `/workspaces/${encodeURIComponent(id)}`;

/** The server compares the two latest completed runs. The browser renders the
 * result; it does not reconstruct a change from observations it happened to
 * have cached. */
export function listChanges(
  http: HttpClient,
  workspaceId: string,
  options?: { signal?: AbortSignal },
): Promise<ChangePage> {
  return http.get<ChangePage>(`${ws(workspaceId)}/changes`, { signal: options?.signal });
}

/** Persist the current account's What’s new watermark on the server. The
 * server supplies the timestamp; the client never posts one. */
export function markChangesSeen(
  http: HttpClient,
  workspaceId: string,
  options?: { signal?: AbortSignal },
): Promise<{ seen_at: string }> {
  return http.post<{ seen_at: string }>(`${ws(workspaceId)}/changes/seen`, { signal: options?.signal });
}
