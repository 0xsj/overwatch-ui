import type { HttpClient } from "@/lib/http";
import type {
  EmailChangeInput,
  MeSession,
  PasswordChangeInput,
  RegisterInput,
  RenameInput,
  RegisteredAccount,
  ResetInput,
  Session,
  SignInInput,
  TokenInput,
} from "./identity.types";

/** All REAL. The `/v1` is in the base URL, not here.
 *
 *  This whole file was proposals but one until 2026-09-07. The one that was
 *  real was `POST /v1/register`, and it had been renamed to `/v1/accounts`
 *  without the client hearing — so the only wired endpoint in the product was
 *  answering 404. `ALIGNMENT.md` exists because the two repositories cannot see
 *  each other, and that is the failure it is for. */

/** 201 with the account and its status, which is `pending`. Not a session. */
export function register(http: HttpClient, input: RegisterInput): Promise<RegisteredAccount> {
  return http.post<RegisteredAccount>("/accounts", { body: input });
}

/** 201, not 200 — a session is CREATED the way an account is. A `pending`
 *  account signs in successfully; the caller hangs the confirm-your-address
 *  banner off `verified` from `/v1/me`, never off this status. */
export function signIn(http: HttpClient, input: SignInInput): Promise<Session> {
  return http.post<Session>("/sessions", { body: input });
}

export function signOut(http: HttpClient): Promise<void> {
  return http.delete<void>("/sessions/current");
}

/** 202 for an address that exists, one that does not, and one that is not an
 *  address. Three inputs, one answer, so the copy cannot say "sent"
 *  conditionally — it says "if that address has an account". */
export function requestVerification(http: HttpClient, email: string): Promise<void> {
  return http.post<void>("/verifications", { body: { email } });
}

/** 200, the same shape as register, with `status` now `active`. */
export function confirmVerification(http: HttpClient, input: TokenInput): Promise<RegisteredAccount> {
  return http.post<RegisteredAccount>("/verifications/confirm", { body: input });
}

/** 202, on the same three inputs, for the same reason. */
export function requestReset(http: HttpClient, email: string): Promise<void> {
  return http.post<void>("/password-resets", { body: { email } });
}

/** 204. Every other session for the account ends here. */
export function confirmReset(http: HttpClient, input: ResetInput): Promise<void> {
  return http.post<void>("/password-resets/confirm", { body: input });
}

/* ─── Your own account. All REAL, walked on 2026-09-07. ───────────────────── */

/** 200 — and it answers with `{account_id, email, status}`, which does NOT echo
 *  the new name. There is nothing to read the result out of, so a caller that
 *  wants to show the change re-reads `/v1/me` rather than trusting this. */
export function rename(http: HttpClient, input: RenameInput): Promise<RegisteredAccount> {
  return http.patch<RegisteredAccount>("/me", { body: input });
}

/** 204. Ends every OTHER session and keeps the caller's, so the client stays
 *  signed in with the same bearer — do not sign the user out afterwards. It
 *  also silently cancels any pending email change.
 *
 *  A wrong current password answers 401 `that is not your current password`.
 *  Being specific is safe here and is not safe on sign-in: the caller is already
 *  authenticated, so there is no account to enumerate. */
export function changePassword(http: HttpClient, input: PasswordChangeInput): Promise<void> {
  return http.post<void>("/me/password", { body: input });
}

/** 202, AND IT CHANGES NOTHING. The old address is still the login, still where
 *  a reset goes, and still what `/v1/me` reports, until the new one is
 *  confirmed. A screen that renders the new address as current is wrong about
 *  the one thing this flow exists to be careful about. */
export function requestEmailChange(http: HttpClient, input: EmailChangeInput): Promise<void> {
  return http.post<void>("/me/email", { body: input });
}

/** 200. Confirming also flips a `pending` account to `active`, because a
 *  confirmed address is a proved address. */
export function confirmEmailChange(
  http: HttpClient,
  input: TokenInput,
): Promise<RegisteredAccount> {
  return http.post<RegisteredAccount>("/email-changes/confirm", { body: input });
}

export function listSessions(http: HttpClient): Promise<MeSession[]> {
  return http.get<MeSession[]>("/me/sessions");
}

/** 204. Ending a session that is not yours answers 404, the same as one that
 *  does not exist — so do not build an error state that distinguishes them. */
export function revokeSession(http: HttpClient, id: string): Promise<void> {
  return http.delete<void>(`/me/sessions/${encodeURIComponent(id)}`);
}
