import type { HttpClient } from "@/lib/http";
import type { AcceptInviteInput, Invite, Session, SignInInput, SignUpInput } from "./auth.types";

/** Answers with the session rather than 204, so the caller can render who it
 *  just became without a second round trip. */
export function signIn(http: HttpClient, input: SignInInput): Promise<Session> {
  return http.post<Session>("/auth/sign-in", { body: input });
}

export function signUp(http: HttpClient, input: SignUpInput): Promise<Session> {
  return http.post<Session>("/auth/sign-up", { body: input });
}

/** Answers the same way whether or not the address has an account, so this
 *  endpoint cannot be used to find out who has one. */
export function requestReset(http: HttpClient, email: string): Promise<void> {
  return http.post<void>("/auth/reset-requests", { body: { email } });
}

/** Read before accepting: the screen states the terms — workspace, inviter,
 *  role, expiry — before it asks for a password. */
export function readInvite(http: HttpClient, token: string): Promise<Invite> {
  return http.get<Invite>(`/invites/${encodeURIComponent(token)}`);
}

export function acceptInvite(http: HttpClient, input: AcceptInviteInput): Promise<Session> {
  const { token, ...rest } = input;
  return http.post<Session>(`/invites/${encodeURIComponent(token)}/acceptance`, { body: rest });
}
