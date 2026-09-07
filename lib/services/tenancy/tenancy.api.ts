import type { HttpClient } from "@/lib/http";
import type { Me, Member, OpenedWorkspace, OrgWorkspace } from "./tenancy.types";

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

/** Owner or admin. */
export function renameOrg(http: HttpClient, orgId: string, name: string): Promise<{ org_id: string; name: string }> {
  return http.patch(`/orgs/${encodeURIComponent(orgId)}`, { body: { name } });
}

/** Every engagement the caller can reach, closed ones included. The archive
 *  view's source, and never the switcher's. */
export function listWorkspaces(
  http: HttpClient,
  orgId: string,
  options?: { signal?: AbortSignal },
): Promise<OrgWorkspace[]> {
  return http.get<OrgWorkspace[]>(`/orgs/${encodeURIComponent(orgId)}/workspaces`, {
    signal: options?.signal,
  });
}

/** `admin` on that engagement. 409 `that engagement is closed — reopen it
 *  first` when it is closed, which is a reason and not a disabled control. */
export function renameWorkspace(
  http: HttpClient,
  workspaceId: string,
  name: string,
): Promise<OrgWorkspace> {
  return http.patch<OrgWorkspace>(`/workspaces/${encodeURIComponent(workspaceId)}`, {
    body: { name },
  });
}

export function closeWorkspace(http: HttpClient, workspaceId: string): Promise<void> {
  return http.post<void>(`/workspaces/${encodeURIComponent(workspaceId)}/close`);
}

/** Can fail on the NAME. Closing frees it — the uniqueness index only covers
 *  live engagements — so another may have taken it since, and the 409 is about
 *  that other engagement rather than this one. Say which. */
export function reopenWorkspace(http: HttpClient, workspaceId: string): Promise<OrgWorkspace> {
  return http.post<OrgWorkspace>(`/workspaces/${encodeURIComponent(workspaceId)}/reopen`);
}
