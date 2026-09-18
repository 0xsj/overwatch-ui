import type { HttpClient } from "@/lib/http";
import type { Report, ReportInput, Revision } from "./reports.types";

/** REAL — `decisions/0042`, and **the only routes a `client` reaches**. Every
 *  other workspace route now refuses one, because the gate is fail-closed: a
 *  route added tomorrow excludes clients without anybody remembering to. */
const ws = (id: string) => `/workspaces/${encodeURIComponent(id)}`;

export function listReports(
  http: HttpClient,
  workspaceId: string,
  options?: { target?: string; limit?: number; signal?: AbortSignal },
): Promise<Report[]> {
  return http.get<Report[]>(`${ws(workspaceId)}/reports`, {
    params: { target: options?.target, limit: options?.limit },
    signal: options?.signal,
  });
}

export function openReport(
  http: HttpClient,
  workspaceId: string,
  input: ReportInput,
): Promise<Report> {
  return http.post<Report>(`${ws(workspaceId)}/reports`, { body: input });
}

export function readReport(
  http: HttpClient,
  workspaceId: string,
  reportId: string,
  options?: { signal?: AbortSignal },
): Promise<Report> {
  return http.get<Report>(`${ws(workspaceId)}/reports/${encodeURIComponent(reportId)}`, {
    signal: options?.signal,
  });
}

/** Turning `coverage` off is a 400 whose message is the thesis, so a screen
 *  must not offer the toggle rather than offer it and explain the refusal. */
export function toggleSection(
  http: HttpClient,
  workspaceId: string,
  reportId: string,
  section: string,
  enabled: boolean,
): Promise<Report> {
  return http.put<Report>(
    `${ws(workspaceId)}/reports/${encodeURIComponent(reportId)}/sections/${encodeURIComponent(section)}`,
    { body: { enabled } },
  );
}

/** **The SAME function `issue` uses.** Two implementations of one render drift,
 *  and the one that drifts is the preview — which is the half somebody reads
 *  before deciding. Build the editor against this; it is byte-for-byte what
 *  issuing would freeze. */
export function previewReport(
  http: HttpClient,
  workspaceId: string,
  reportId: string,
  options?: { signal?: AbortSignal },
): Promise<Revision> {
  return http.get<Revision>(
    `${ws(workspaceId)}/reports/${encodeURIComponent(reportId)}/preview`,
    { signal: options?.signal },
  );
}

/** ISSUE. **Not undoable** — it freezes bytes somebody may already have. */
export function issueReport(
  http: HttpClient,
  workspaceId: string,
  reportId: string,
): Promise<Revision> {
  return http.post<Revision>(
    `${ws(workspaceId)}/reports/${encodeURIComponent(reportId)}/revisions`,
  );
}

/** The frozen bytes. `X-Report-Hash` carries the content address so a reader
 *  can check what they got. */
export function readRevision(
  http: HttpClient,
  workspaceId: string,
  revisionId: string,
  options?: { signal?: AbortSignal },
): Promise<Revision> {
  return http.get<Revision>(`${ws(workspaceId)}/revisions/${encodeURIComponent(revisionId)}`, {
    signal: options?.signal,
  });
}
