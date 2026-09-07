import type { HttpClient } from "@/lib/http";
import type { Chain, ChainInput, Check, CheckInput } from "./checks.types";

/** REAL — `internal/check`. Under `/orgs`, for `0031`'s reason and `0032`'s: a
 *  check is a question the firm knows how to ask, the same for every client.
 *
 *  A per-engagement "do not run this here" is NOT modelled and must not be —
 *  that is what `scope` already is, and a second flag would be a second,
 *  invisible authority over the same question. */
const org = (id: string) => `/orgs/${encodeURIComponent(id)}`;

export function listChecks(
  http: HttpClient,
  orgId: string,
  options?: { archived?: boolean; signal?: AbortSignal },
): Promise<Check[]> {
  return http.get<Check[]>(`${org(orgId)}/checks`, {
    params: { archived: options?.archived ? 1 : undefined },
    signal: options?.signal,
  });
}

export function addCheck(http: HttpClient, orgId: string, input: CheckInput): Promise<Check> {
  return http.post<Check>(`${org(orgId)}/checks`, { body: input });
}

export function updateCheck(
  http: HttpClient,
  orgId: string,
  checkId: string,
  input: CheckInput,
): Promise<Check> {
  return http.patch<Check>(`${org(orgId)}/checks/${encodeURIComponent(checkId)}`, { body: input });
}

export function archiveCheck(http: HttpClient, orgId: string, checkId: string): Promise<void> {
  return http.delete<void>(`${org(orgId)}/checks/${encodeURIComponent(checkId)}`);
}

export function readChain(
  http: HttpClient,
  orgId: string,
  checkId: string,
  options?: { signal?: AbortSignal },
): Promise<Chain> {
  return http.get<Chain>(`${org(orgId)}/checks/${encodeURIComponent(checkId)}/chain`, {
    signal: options?.signal,
  });
}

/** The WHOLE graph, and a save is a diff on the server's side rather than a
 *  replace — a run records which step produced which invocation, and an id that
 *  churned under it would make that record point at nothing.
 *
 *  **A cycle is a 400 with `the chain has a cycle`, before anything is
 *  written.** A diamond — two paths joining — is not a cycle and saves fine. */
export function saveChain(
  http: HttpClient,
  orgId: string,
  checkId: string,
  input: ChainInput,
): Promise<Chain> {
  return http.put<Chain>(`${org(orgId)}/checks/${encodeURIComponent(checkId)}/chain`, {
    body: input,
  });
}
