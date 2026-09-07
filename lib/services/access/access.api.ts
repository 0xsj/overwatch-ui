import type { HttpClient } from "@/lib/http";
import type { GrantLevel } from "@/lib/services/tenancy";
import type { Accepted, Invite, InviteInput, WorkspaceMember } from "./access.types";

/** REAL since 2026-09-07 — `decisions/0023` (grants) and `0025` (invitations).
 *  Walked against the server on 7002 the same day. */

const org = (id: string) => `/orgs/${encodeURIComponent(id)}`;
const ws = (id: string) => `/workspaces/${encodeURIComponent(id)}`;

/** 201. Needs a VERIFIED address — 403 *"confirm your email address before
 *  inviting anybody"*, which is the same rule as opening an engagement and is
 *  not written down anywhere but the response. */
export function sendInvite(
  http: HttpClient,
  orgId: string,
  input: InviteInput,
): Promise<Invite> {
  return http.post<Invite>(`${org(orgId)}/invites`, { body: input });
}

export function withdrawInvite(
  http: HttpClient,
  orgId: string,
  inviteId: string,
): Promise<void> {
  return http.delete<void>(`${org(orgId)}/invites/${encodeURIComponent(inviteId)}`);
}

/** AUTHENTICATED, which is what makes this different from the other three link
 *  routes. 401 without a session; 403 *"that invitation was sent to a different
 *  address"* when the session is somebody else's, so a forwarded link is
 *  useless.
 *
 *  There is deliberately no register-and-accept in one call: that would put
 *  identity's registration and org's membership in one command, which is the
 *  coupling `0017` deleted. */
export function acceptInvite(http: HttpClient, token: string): Promise<Accepted> {
  return http.post<Accepted>("/invites/accept", { body: { token } });
}

/** The access grid's rows, for ONE engagement. There is no org-wide grants
 *  read — the grid is assembled per workspace, which is also the only shape
 *  that can be right, since a workspace the caller cannot see 404s rather than
 *  appearing empty. */
export function listWorkspaceMembers(
  http: HttpClient,
  workspaceId: string,
): Promise<WorkspaceMember[]> {
  return http.get<WorkspaceMember[]>(`${ws(workspaceId)}/members`);
}

/** Idempotent, and it covers both granting and changing — do not try to work out
 *  which, because between your read and your write somebody else may have
 *  granted.
 *
 *  409 for a level above the invited role's ceiling, and 409 for somebody who is
 *  not a live member of the org. */
export function setLevel(
  http: HttpClient,
  workspaceId: string,
  accountId: string,
  level: GrantLevel,
): Promise<WorkspaceMember> {
  return http.put<WorkspaceMember>(
    `${ws(workspaceId)}/members/${encodeURIComponent(accountId)}`,
    { body: { level } },
  );
}

/** 204. There is NO way to write `none` — a revocation deletes the row, so "no
 *  access" is the absence of a row rather than a value on the ladder. */
export function revokeLevel(
  http: HttpClient,
  workspaceId: string,
  accountId: string,
): Promise<void> {
  return http.delete<void>(`${ws(workspaceId)}/members/${encodeURIComponent(accountId)}`);
}
