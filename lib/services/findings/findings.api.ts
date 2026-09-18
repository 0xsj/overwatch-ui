import type { HttpClient } from "@/lib/http";
import type { Finding, FindingState, Severity } from "./findings.types";

const ws = (id: string) => `/workspaces/${encodeURIComponent(id)}`;

/** Sorted **worst first, then newest** — server-side, and it matters: a board
 *  sorted by time puts a critical from Tuesday under an info from this morning. */
export function listFindings(
  http: HttpClient,
  workspaceId: string,
  options?: { state?: FindingState; fragment?: string; limit?: number; signal?: AbortSignal },
): Promise<Finding[]> {
  return http.get<Finding[]>(`${ws(workspaceId)}/findings`, {
    params: { state: options?.state, fragment: options?.fragment, limit: options?.limit },
    signal: options?.signal,
  });
}

export function readFinding(
  http: HttpClient,
  workspaceId: string,
  findingId: string,
  options?: { signal?: AbortSignal },
): Promise<Finding> {
  return http.get<Finding>(`${ws(workspaceId)}/findings/${encodeURIComponent(findingId)}`, {
    signal: options?.signal,
  });
}

/** `reason` is REQUIRED for `dismissed` and optional for `resolved`. Sending
 *  `state: "open"` is a 400 — a finding reopens by being seen again. */
export function decideFinding(
  http: HttpClient,
  workspaceId: string,
  findingId: string,
  input: { state: Exclude<FindingState, "open">; reason?: string },
): Promise<Finding> {
  return http.put<Finding>(
    `${ws(workspaceId)}/findings/${encodeURIComponent(findingId)}/state`,
    { body: input },
  );
}

/** `basis` is REQUIRED. Replacing somebody else's assessment is a disagreement,
 *  and one with no stated reason records that somebody disagreed without saying
 *  why they were right. The response carries the prior claim in
 *  `severity_by.superseded`. */
export function reassessFinding(
  http: HttpClient,
  workspaceId: string,
  findingId: string,
  input: { severity: Severity; basis: string },
): Promise<Finding> {
  return http.put<Finding>(
    `${ws(workspaceId)}/findings/${encodeURIComponent(findingId)}/severity`,
    { body: input },
  );
}
