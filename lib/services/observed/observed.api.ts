import type { HttpClient } from "@/lib/http";
import type { Extraction, Lineage, Observation, Subject } from "./observed.types";

const ws = (id: string) => `/workspaces/${encodeURIComponent(id)}`;

export function listSubjects(
  http: HttpClient,
  workspaceId: string,
  options?: { signal?: AbortSignal },
): Promise<Subject[]> {
  return http.get<Subject[]>(`${ws(workspaceId)}/subjects`, { signal: options?.signal });
}

/** **An observation is about something** — 400 `an observation is about
 *  something` without a filter, deliberately. There is no "every observation in
 *  the engagement" read, because that is a question nobody asks and a table
 *  nobody can page.
 *
 *  Two filters and not three, which the union makes unfalsifiable. `subject` is
 *  the asset drawer's read and `invocation` is the run detail's; **`kind` alone
 *  is a 400** — walked against the live server 2026-09-07, where
 *  `?kind=host` answers exactly as no filter at all does. It qualifies a
 *  subject and cannot stand on its own, because two different kinds can carry
 *  the same string and neither is a question.
 *
 *  It does NOT deduplicate. Two runs a day apart are two statements, and
 *  collapsing them loses the second date; *the state of each field* is the
 *  first row per field, which the ordering already hands back. */
export type ObservationFilter =
  | { subject: string; kind?: string; limit?: number }
  | { invocation: string; limit?: number };

export function listObservations(
  http: HttpClient,
  workspaceId: string,
  filter: ObservationFilter,
  options?: { signal?: AbortSignal },
): Promise<Observation[]> {
  return http.get<Observation[]>(`${ws(workspaceId)}/observations`, {
    params: { ...filter },
    signal: options?.signal,
  });
}

export function readLineage(
  http: HttpClient,
  workspaceId: string,
  observationId: string,
  options?: { signal?: AbortSignal },
): Promise<Lineage> {
  return http.get<Lineage>(
    `${ws(workspaceId)}/observations/${encodeURIComponent(observationId)}/lineage`,
    { signal: options?.signal },
  );
}

export function readExtraction(
  http: HttpClient,
  workspaceId: string,
  invocationId: string,
  options?: { signal?: AbortSignal },
): Promise<Extraction> {
  return http.get<Extraction>(
    `${ws(workspaceId)}/invocations/${encodeURIComponent(invocationId)}/extraction`,
    { signal: options?.signal },
  );
}
