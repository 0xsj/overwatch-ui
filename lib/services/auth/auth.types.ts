export type SignInInput = { email: string; password: string };

export type SignUpInput = {
  name: string;
  email: string;
  password: string;
  workspace: string;
};

export type AcceptInviteInput = { token: string; name: string; password: string };

export type Invite = {
  token: string;
  email: string;
  workspace: string;
  invited_by: string;
  role: "Owner" | "Analyst" | "Read-only" | "Client";
  external: boolean;
  /** ABSENT when access does not expire. Never null — absent and "set to
   *  nothing" are different facts, and this is where that first has
   *  consequences for a person rather than a record. */
  expires_at?: string;
};

/** What a successful sign-in answers with. The session itself is a cookie the
 *  server sets; this is the part a screen can render. */
export type Session = { account_id: string; email: string; name: string };
