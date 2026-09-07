/** Who you are in the firm. One per member, per org — `decisions/0019`.
 *
 *  Five, and the last two are outward-facing. `client` is a role and NOT a rung
 *  on the access ladder: a client may generate a report, which is a write-shaped
 *  act, and may not see the invocation log, which is a read-shaped one. Forcing
 *  it onto the ladder would collapse `generate a report` vs `receive its
 *  artifacts`, which `CLAUDE.md` lists among the pairs that must not collapse. */
export type OrgRole = "owner" | "admin" | "member" | "guest" | "client";

/** The three that are inside the firm, in the order a dropdown should show them.
 *  `guest` and `client` are separated visually because both are outward-facing
 *  and both will carry a time box that does not exist yet. */
export const INTERNAL_ROLES = ["owner", "admin", "member"] as const;
export const EXTERNAL_ROLES = ["guest", "client"] as const;

/** What you may do on ONE engagement. Ordered, and the order is the point:
 *  effective access is `min(role ceiling, max(grants))`, so both halves are a
 *  comparison on this ladder. */
export type GrantLevel = "none" | "read" | "write" | "admin";

export const GRANT_LADDER: readonly GrantLevel[] = ["none", "read", "write", "admin"];

/** How high each role may be granted — `decisions/0023`, sealed 2026-09-07.
 *
 *  This client deliberately had NO ceiling table until the day it was sealed,
 *  because inventing one would have been a second implementation of an
 *  authorisation rule, and a screen enabling a control the server refuses is the
 *  quiet kind of wrong.
 *
 *  It is here now for ONE purpose: to offer only the levels a role permits, so
 *  the 409 is a backstop rather than the design. It is still never used to
 *  decide what somebody may do — `access` comes from the server, per workspace,
 *  already reduced. */
export const ROLE_CEILING: Record<OrgRole, GrantLevel> = {
  owner: "admin",
  admin: "admin",
  member: "write",
  guest: "write",
  // Off the ladder in what it may DO, and capped at the bottom of it in what
  // may be granted. A client receives deliverables; it does not do work.
  client: "read",
};

/** The levels a dropdown may offer for a role. `none` is never among them: a
 *  revocation is a DELETE rather than a level, so "no access" is the absence of
 *  a row and not a value in the list. */
export function levelsFor(role: OrgRole): GrantLevel[] {
  const top = GRANT_LADDER.indexOf(ROLE_CEILING[role]);
  return GRANT_LADDER.slice(1, top + 1);
}

/** What each rung adds, in the words `decisions/0019` used. Rendered beside a
 *  cell so the grid explains itself rather than needing a legend elsewhere. */
export const GRANT_MEANING: Record<GrantLevel, string> = {
  none: "invisible. Absent from the switcher, never a disabled row",
  read: "read the record, walk lineage, see the invocation log",
  write: "+ judgement, note, accept or reject an attribution, passive tools",
  admin: "+ loud tools, edit scope, manage this workspace's grants",
};

/** One workspace as `GET /v1/me` reports it, WITH the caller's own level on it.
 *
 *  `access` is read from here and never inferred from the org role — an `admin`
 *  with a `read` grant has `read` on that engagement, and a screen that enables
 *  the judgement button because the role says admin shows a control the server
 *  refuses. A workspace the caller cannot see is ABSENT from this list; it is
 *  never present with `access: "none"`. */
export type MeWorkspace = {
  workspace_id: string;
  name: string;
  access: GrantLevel;
};

export type MeOrg = {
  org_id: string;
  name: string;
  role: OrgRole;
  workspaces: MeWorkspace[];
};

/** The application's boot call. `orgs` is always present and MAY be empty.
 *
 *  Registration is a chain rather than a transaction — `decisions/0017` — so the
 *  org and the first workspace are provisioned by subscribers milliseconds after
 *  the account exists. `orgs: []` is a normal intermediate state and must render
 *  as chrome-without-a-workspace, never as an error and never as a crash on
 *  `orgs[0]`. */
export type Me = {
  account_id: string;
  email: string;
  status: "pending" | "active" | "archived";
  /** The banner hangs off THIS, never off `status === "active"`. The status set
   *  will grow; this boolean is what the server promises to keep meaning what it
   *  means. */
  verified: boolean;
  orgs: MeOrg[];
};

/** A row of `GET /v1/orgs/{org}/members`.
 *
 *  `status` here is the MEMBERSHIP's, not the account's — a member reads
 *  `active` while the person's account is still `pending`, because joining a
 *  firm and proving an address are different facts. Measured on the live server
 *  2026-09-07. */
export type Member = {
  account_id: string;
  email: string;
  name: string;
  role: OrgRole;
  status: "active" | "archived";
  joined_at: string;
};

/** What `POST /v1/orgs/{org}/workspaces` answers with, at 201.
 *
 *  It carries `access` already, and that matters: a subscriber writes the
 *  opener's grant, so the new workspace is not in `/v1/me` for a few
 *  milliseconds. Navigate on this response — re-fetching `/v1/me` and finding
 *  nothing is not a failure. */
export type OpenedWorkspace = {
  workspace_id: string;
  org_id: string;
  name: string;
  access: GrantLevel;
};

/** The chrome's own question: who is signed in, whose tenant this is, and which
 *  engagement is open. Derived from `Me` rather than fetched — there is no
 *  `/me/context` endpoint and there never needs to be one. */
export type ShellContext = {
  account: { id: string; email: string; verified: boolean };
  org: MeOrg;
  workspace: MeWorkspace;
};

/** One engagement as `GET /v1/orgs/{org}/workspaces` reports it — CLOSED ONES
 *  INCLUDED, which is the only way to reach a closed one at all.
 *
 *  `/v1/me` and this listing answer different questions and both are right.
 *  `/v1/me` is the boot call and the switcher's source, so it excludes closed
 *  engagements: a firm's history does not belong in the switcher. This is the
 *  archive view. Both filter to what the caller can reach, so `access` is on
 *  every row of both. */
export type OrgWorkspace = {
  workspace_id: string;
  org_id: string;
  name: string;
  access: GrantLevel;
  /** Closed means READABLE and not WORKABLE. Grants survive it — the people who
   *  were on an engagement keep access to its record, which is what makes the
   *  trail readable by the people who made it rather than only by the owner. */
  closed: boolean;
};
