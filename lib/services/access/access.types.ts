import type { GrantLevel, OrgRole } from "@/lib/services/tenancy";

/** An invitation, carrying an OPTIONAL first grant.
 *
 *  The optional grant is the whole reason invite and grant are one flow rather
 *  than two. `decisions/0019` made an empty grant set mean `none`, so an
 *  invitation that carries no grant lands somebody in an org where they can see
 *  nothing — a technically correct and terrible first screen, and the same
 *  failure `0012` §7 named about an empty workspace at signup.
 *
 *  So: *"invite kit@ as a member, with read on Acme Q3."* One flow, one email,
 *  one accepted state. */
export type Invite = {
  id: string;
  token: string;
  email: string;
  role: OrgRole;
  org_id: string;
  org_name: string;
  invited_by: string;
  /** ABSENT when the invitation carries no first grant. Never null, and an
   *  invitation with none is a real thing to send — it is how you add an admin
   *  who manages people and is granted engagements separately. */
  first_grant?: { workspace_id: string; workspace_name: string; level: GrantLevel };
  /** A week, not a day. An invitation waits on a person reading their mail. */
  expires_at: string;
  state: "pending" | "accepted" | "revoked" | "expired";
};

export type InviteInput = {
  email: string;
  role: OrgRole;
  first_grant?: { workspace_id: string; level: GrantLevel };
};

/** Two paths that must both work: the invitee has no account and registers
 *  through the invitation, or has one and signs in. `name` and `password` are
 *  ABSENT on the second — they are what registering needs, not what accepting
 *  needs. */
export type AcceptInviteInput = {
  token: string;
  name?: string;
  password?: string;
};

/** One row of the members x workspaces grid. `level` is what was WRITTEN, which
 *  is not the same as what the member ends up with — the org role caps it, and
 *  an org owner has `admin` everywhere with no row here at all. */
export type Grant = {
  account_id: string;
  workspace_id: string;
  level: GrantLevel;
};
