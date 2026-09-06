export type Field = "email" | "password" | "workspace" | "name" | "token";

export type Failure = { ok: false; message: string; field?: Field };
export type Success<T = undefined> = { ok: true; value: T };
export type Result<T = undefined> = Success<T> | Failure;

export type Invite = {
  token: string;
  email: string;
  workspace: string;
  invitedBy: string;
  role: "Owner" | "Analyst" | "Read-only" | "Client";
  external: boolean;
  /** Absent when access does not expire. Present, and a date, when it does. */
  expiresAt?: string;
};

export type SignUpInput = {
  name: string;
  email: string;
  password: string;
  workspace: string;
};

export interface AuthPort {
  signIn(email: string, password: string): Promise<Result>;
  signUp(input: SignUpInput): Promise<Result>;
  requestReset(email: string): Promise<Result>;
  readInvite(token: string): Promise<Result<Invite>>;
  acceptInvite(token: string, name: string, password: string): Promise<Result>;

  /** What this adapter is, for anything that renders the fact. */
  readonly describe: { kind: "fake" | "http"; note: string };
}
