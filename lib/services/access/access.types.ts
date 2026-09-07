import type { GrantLevel, OrgRole } from "@/lib/services/tenancy";

/** An invitation as the server answers with it. FLAT — `workspace_id` and
 *  `level` sit beside the role rather than nested, and they arrive together or
 *  not at all (400 otherwise).
 *
 *  Note what is NOT here: no token, no state, no org name, no inviter. The
 *  server hands the token to the mail and nothing else — see `doc.ts` for what
 *  that costs the accept screen. */
export type Invite = {
  invite_id: string;
  email: string;
  role: OrgRole;
  workspace_id?: string;
  level?: GrantLevel;
  /** A week. An invitation waits on somebody reading their mail. */
  expires_at: string;
};

/** `workspace_id` and `level` are optional TOGETHER. Sending one without the
 *  other is a 400, which is the server refusing to guess — a workspace with no
 *  level and a level with no workspace are both half a decision. */
export type InviteInput = {
  email: string;
  role: OrgRole;
  workspace_id?: string;
  level?: GrantLevel;
};

/** All that accepting answers with. Enough to navigate to the org you just
 *  joined, and deliberately not a session — you already had one. */
export type Accepted = { org_id: string; role: OrgRole };

/** One row of a workspace's access grid.
 *
 *  `access` is EFFECTIVE, not stored: somebody holding a `write` grant whose org
 *  role was later lowered to `client` reads as `read`, because that is what they
 *  can do. Render it as given and never compute it from `role`. */
export type WorkspaceMember = {
  account_id: string;
  email: string;
  name: string;
  role: OrgRole;
  access: GrantLevel;
};
