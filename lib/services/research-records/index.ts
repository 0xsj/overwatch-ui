import type { HttpClient } from "@/lib/http";

export type ResearchRecordKind = "person" | "account" | "organisation" | "place";

export type ResearchRecord = {
  record_id: string;
  workspace_id: string;
  kind: ResearchRecordKind;
  name: string;
  description?: string;
  observation_ids: string[];
  author: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};

export type ResearchRecordPage = { items: ResearchRecord[]; next_cursor: string | null };

export type WriteResearchRecord = {
  kind: ResearchRecordKind;
  name: string;
  description: string;
  observation_ids: string[];
};

const base = (workspace: string) => `/workspaces/${encodeURIComponent(workspace)}/records`;

export function listResearchRecords(http: HttpClient, workspace: string, before?: string) {
  return http.get<ResearchRecordPage>(base(workspace), { params: { before, limit: 50 } });
}

export function readResearchRecord(http: HttpClient, workspace: string, record: string) {
  return http.get<ResearchRecord>(`${base(workspace)}/${encodeURIComponent(record)}`);
}
/** Hydrate only the records a relationship surface actually needs. Missing
 * records remain absent so callers can keep the stable identifier visible;
 * other failures still reject the read. */
export async function readResearchRecordsByIDs(http: HttpClient, workspace: string, recordIDs: string[]) {
  const rows = await Promise.all(recordIDs.map(async (record) => {
    try {
      return await readResearchRecord(http, workspace, record);
    } catch (error) {
      if (isNotFoundRecordError(error)) return undefined;
      throw error;
    }
  }));
  return rows.filter((row): row is ResearchRecord => row !== undefined);
}

function isNotFoundRecordError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { kind?: unknown; status?: unknown };
  return candidate.kind === "not_found" || candidate.status === 404;
}

export function createResearchRecord(http: HttpClient, workspace: string, body: WriteResearchRecord) {
  return http.post<ResearchRecord>(base(workspace), { body });
}

export function updateResearchRecord(http: HttpClient, workspace: string, record: string, body: WriteResearchRecord) {
  return http.put<ResearchRecord>(`${base(workspace)}/${encodeURIComponent(record)}`, { body });
}
