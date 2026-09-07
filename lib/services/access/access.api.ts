import type { HttpClient } from "@/lib/http";
import type { GrantLevel, OrgRole } from "@/lib/services/tenancy";
import type { AcceptInviteInput, Grant, Invite, InviteInput } from "./access.types";

/* ─── PROPOSALS. Nothing here is served. ───────────────────────────────────
   `ALIGNMENT.md` 2026-09-07: *"There is no invite endpoint and no way to change
   a role or a grant over HTTP. `0019` defines the model; the commands that write
   it arrive with the invite flow. Members and grants can only be created
   directly in the database today."*

   Kept in one file so the boundary between what is real and what is imagined is
   a directory rather than a thing to remember: `lib/services/tenancy` is real,
   this is not, and `lib/root` never puts a server behind this domain.       */

const org = (id: string) => `/orgs/${encodeURIComponent(id)}`;

export function listInvites(http: HttpClient, orgId: string): Promise<Invite[]> {
  return http.get<Invite[]>(`${org(orgId)}/invitations`);
}

export function sendInvite(http: HttpClient, orgId: string, input: InviteInput): Promise<Invite> {
  return http.post<Invite>(`${org(orgId)}/invitations`, { body: input });
}

export function revokeInvite(http: HttpClient, orgId: string, id: string): Promise<void> {
  return http.delete<void>(`${org(orgId)}/invitations/${encodeURIComponent(id)}`);
}

/** Unauthenticated: the person reading this has a link and no session yet. */
export function readInvite(http: HttpClient, token: string): Promise<Invite> {
  return http.get<Invite>(`/invitations/${encodeURIComponent(token)}`);
}

export function acceptInvite(http: HttpClient, input: AcceptInviteInput): Promise<Invite> {
  const { token, ...rest } = input;
  return http.post<Invite>(`/invitations/${encodeURIComponent(token)}/acceptance`, { body: rest });
}

/** The last-owner guard runs here and it is the reason this is not a PUT on a
 *  field. `org.ErrLastOwner` is declared in the backend, raised inside both
 *  storage adapters, and unreachable, because no app-layer code calls the method
 *  that would trigger it. */
export function changeRole(
  http: HttpClient,
  orgId: string,
  accountId: string,
  role: OrgRole,
): Promise<void> {
  return http.patch<void>(`${org(orgId)}/members/${encodeURIComponent(accountId)}`, {
    body: { role },
  });
}

export function removeMember(http: HttpClient, orgId: string, accountId: string): Promise<void> {
  return http.delete<void>(`${org(orgId)}/members/${encodeURIComponent(accountId)}`);
}

export function listGrants(http: HttpClient, orgId: string): Promise<Grant[]> {
  return http.get<Grant[]>(`${org(orgId)}/grants`);
}

/** One call for add and change, because `none` is a level. Writing `none` and
 *  revoking are the same act from the caller's side, and giving them two verbs
 *  invites a screen that can express "granted, at none". */
export function setGrant(
  http: HttpClient,
  orgId: string,
  workspaceId: string,
  accountId: string,
  level: GrantLevel,
): Promise<Grant> {
  return http.put<Grant>(
    `${org(orgId)}/workspaces/${encodeURIComponent(workspaceId)}/grants/${encodeURIComponent(accountId)}`,
    { body: { level } },
  );
}
