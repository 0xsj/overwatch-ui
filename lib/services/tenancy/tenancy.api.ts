import type { HttpClient } from "@/lib/http";
import type { Me, Member, OpenedWorkspace } from "./tenancy.types";

/** All REAL, walked against the server on 7002 on 2026-09-07. */

/** The boot call. Requires a bearer; answers 401 `not signed in` without one. */
export function getMe(http: HttpClient, options?: { signal?: AbortSignal }): Promise<Me> {
  return http.get<Me>("/me", { signal: options?.signal });
}

/** 404 for an org you are not a member of, for one that does not exist, and for
 *  a malformed id — the same three answers, deliberately, so the id space cannot
 *  be probed. Do NOT write an error screen that distinguishes them. */
export function listMembers(
  http: HttpClient,
  orgId: string,
  options?: { signal?: AbortSignal },
): Promise<Member[]> {
  return http.get<Member[]>(`/orgs/${encodeURIComponent(orgId)}/members`, {
    signal: options?.signal,
  });
}

/** 201. Owner and admin only; a member gets 403 WITH a reason, because they
 *  already know the org exists and what they need is the cause. It also
 *  requires a verified address — an unproven address must not end up on a
 *  client's record. */
export function openWorkspace(
  http: HttpClient,
  orgId: string,
  name: string,
): Promise<OpenedWorkspace> {
  return http.post<OpenedWorkspace>(`/orgs/${encodeURIComponent(orgId)}/workspaces`, {
    body: { name },
  });
}
