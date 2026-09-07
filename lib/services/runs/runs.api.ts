import type { HttpClient } from "@/lib/http";
import type { RunDetail, RunPage } from "./runs.types";

/** REAL — `internal/run`. Under `/workspaces`: a run is a CLAIM ABOUT A CLIENT,
 *  which is the side of `0031`'s test that keeps the narrow key.
 *
 *  The gate is `write`, raised to `admin` for a loud check — computed from the
 *  chain's tools. A `write` holder starting a loud check gets **404, not 403**:
 *  the engagement is visible to them, and the refusal follows the same
 *  non-disclosure rule as everything else on this surface. */
const ws = (id: string) => `/workspaces/${encodeURIComponent(id)}`;

export function listRuns(
  http: HttpClient,
  workspaceId: string,
  options?: { target?: string; limit?: number; after?: string; signal?: AbortSignal },
): Promise<RunPage> {
  return http.get<RunPage>(`${ws(workspaceId)}/runs`, {
    params: { target: options?.target, limit: options?.limit, after: options?.after },
    signal: options?.signal,
  });
}

/** **202, and it returns the PLAN rather than a result.**
 *
 *  Nothing has spawned when the response arrives. Every step already has an
 *  invocation row and the spawn gate has already been asked, so `refused` and
 *  `skipped` states are present before any process existed. Render that
 *  immediately, then poll `readRun`. */
export function startRun(
  http: HttpClient,
  workspaceId: string,
  input: { target_id: string; check_id: string },
): Promise<RunDetail> {
  return http.post<RunDetail>(`${ws(workspaceId)}/runs`, { body: input });
}

/** The SAME walk as `startRun`, writing nothing — 200.
 *
 *  Not a separate `verdict`/`reason` shape: preview and plan are literally one
 *  function server-side, and two implementations of that walk drift. The one
 *  that drifts is the preview, which is the half a person reads BEFORE deciding.
 *
 *  So read `state` and `refusal` off the invocations:
 *
 *      pending   would spawn
 *      refused   would not, and `refusal` says why
 *      skipped   nothing to feed it
 *
 *  It needs the same reach as starting — seeing which commands would run
 *  against a client is the disclosure, not the spawning. */
export function previewRun(
  http: HttpClient,
  workspaceId: string,
  input: { target_id: string; check_id: string },
): Promise<RunDetail> {
  return http.post<RunDetail>(`${ws(workspaceId)}/runs/preview`, { body: input });
}

export function readRun(
  http: HttpClient,
  workspaceId: string,
  runId: string,
  options?: { signal?: AbortSignal },
): Promise<RunDetail> {
  return http.get<RunDetail>(`${ws(workspaceId)}/runs/${encodeURIComponent(runId)}`, {
    signal: options?.signal,
  });
}

/** The URL only. **Never render these bytes inline.**
 *
 *  They are a scanner's output pointed at a hostile target. Served inline and
 *  sniffed, an artifact is stored XSS on the analyst's own origin — which is why
 *  the server sends `Content-Disposition: attachment` and `nosniff`. A viewer
 *  that fetches and renders as TEXT is fine; `innerHTML` is not, ever. */
export function artifactUrl(baseUrl: string, workspaceId: string, artifactId: string): string {
  return `${baseUrl.replace(/\/+$/, "")}${ws(workspaceId)}/artifacts/${encodeURIComponent(artifactId)}`;
}
