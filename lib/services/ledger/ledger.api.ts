import type { HttpClient } from "@/lib/http";
import type { AuditPage, ChainStep, PageOptions } from "./ledger.types";

/** All REAL, walked on 2026-09-07. */

const paging = (options?: PageOptions) => ({
  params: { after: options?.after, limit: options?.limit },
  signal: options?.signal,
});

/** The caller's own history. Takes no id, because it is not a way to read
 *  anybody else's. */
export function getMyActivity(http: HttpClient, options?: PageOptions): Promise<AuditPage> {
  return http.get<AuditPage>("/me/activity", paging(options));
}

/** One engagement's ledger. Needs `read` on that workspace, which is the gate
 *  `decisions/0019` describes — and the reason there is no org-wide version. */
export function getWorkspaceAudit(
  http: HttpClient,
  workspaceId: string,
  options?: PageOptions,
): Promise<AuditPage> {
  return http.get<AuditPage>(
    `/workspaces/${encodeURIComponent(workspaceId)}/audit`,
    paging(options),
  );
}

/** What else was part of one act. */
export function getChain(
  http: HttpClient,
  correlationId: string,
  options?: { signal?: AbortSignal },
): Promise<ChainStep[]> {
  return http.get<ChainStep[]>(`/chains/${encodeURIComponent(correlationId)}`, {
    signal: options?.signal,
  });
}
