import type { HttpClient } from "@/lib/http";
import type { Coverage } from "./coverage.types";

/** REAL — `decisions/0011` and `0037`. *What have I not looked at* — the
 *  question `PRODUCT.md` says is not answerable in any competitor. */
export function readCoverage(
  http: HttpClient,
  workspaceId: string,
  options?: { target?: string; limit?: number; signal?: AbortSignal },
): Promise<Coverage> {
  return http.get<Coverage>(`/workspaces/${encodeURIComponent(workspaceId)}/coverage`, {
    params: { target: options?.target, limit: options?.limit },
    signal: options?.signal,
  });
}
