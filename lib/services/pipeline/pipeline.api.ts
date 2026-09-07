import type { HttpClient } from "@/lib/http";
import type { Check, Run, SpawnPreview, ToolDef } from "./pipeline.types";

/* ─── PROPOSALS. Nothing here is served. ───────────────────────────────────
   `tool`, `check`, `run` and `invocation` are all UNBUILT in §Scope. These
   paths are what we would ask for, confined to one file so that when the real
   routes land this changes and nothing above it does.                      */

export function listTools(http: HttpClient): Promise<ToolDef[]> {
  return http.get<ToolDef[]>("/tools");
}

export function listChecks(http: HttpClient): Promise<Check[]> {
  return http.get<Check[]>("/checks");
}

export function getCheck(http: HttpClient, id: string): Promise<Check> {
  return http.get<Check>(`/checks/${encodeURIComponent(id)}`);
}

export function saveCheck(http: HttpClient, check: Check): Promise<Check> {
  return http.put<Check>(`/checks/${encodeURIComponent(check.check_id)}`, { body: check });
}

export function listRuns(http: HttpClient, checkId: string): Promise<Run[]> {
  return http.get<Run[]>(`/checks/${encodeURIComponent(checkId)}/runs`);
}

export function getRun(http: HttpClient, runId: string): Promise<Run> {
  return http.get<Run>(`/runs/${encodeURIComponent(runId)}`);
}

/** Asked before anything spawns, and answered per step.
 *
 *  A separate call rather than a field on `Check`, because the answer depends on
 *  the TARGET and a check outlives any one of them. The same chain is permitted
 *  against one engagement's scope and refused against another's, which is the
 *  gate doing its job rather than a configuration error. */
export function previewSpawn(
  http: HttpClient,
  checkId: string,
  target: string,
): Promise<SpawnPreview[]> {
  return http.get<SpawnPreview[]>(`/checks/${encodeURIComponent(checkId)}/spawn-preview`, {
    params: { target },
  });
}
