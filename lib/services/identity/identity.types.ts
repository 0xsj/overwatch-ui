/** The server's own bounds, transcribed from `identity/app/command.Registrar`.
 *  Duplicated here so a screen can refuse early — never so it can decide. */
export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 1024;

/** The account's own lifecycle. It is NOT the authentication gate.
 *
 *  A `pending` account CAN sign in — `decisions/0018`. Authentication answers
 *  *who are you*; having somewhere to put things is authorisation. This file
 *  said the opposite until 2026-09-07, and the opposite made a mistyped address
 *  a permanent lockout and let a stuck subscriber lock out somebody who had
 *  already verified.
 *
 *  Nothing should branch on this value. The status set will grow; `verified` is
 *  the boolean the server promises to keep meaning what it means. */
export type AccountStatus = "pending" | "active" | "archived";

/** `name` is optional at the wire. Omitted, the server uses the local part of
 *  the address. */
export type RegisterInput = { email: string; password: string; name?: string };

export type RegisteredAccount = {
  account_id: string;
  email: string;
  status: AccountStatus;
};

export type SignInInput = { email: string; password: string };

/** What `POST /v1/sessions` answers with, at 201. The token is a bearer and
 *  `expires_at` is when it stops being one. */
export type Session = {
  token: string;
  account_id: string;
  email: string;
  status: AccountStatus;
  expires_at: string;
};

/** The token out of an emailed link. It arrives as `?token=` on one of THIS
 *  application's URLs and is POSTed in a body — never put in a server URL,
 *  where it is written into every access log it passes and leaks onward in a
 *  `Referer`. */
export type TokenInput = { token: string };

export type ResetInput = { token: string; password: string };

/* ─── Acting on your own account. `decisions/0021`. ────────────────────────
   Everything here is under `/v1/me` and takes no account id, because none of it
   is a way to act on somebody else.                                        */

/** A rename needs no current password and the other two do, which is deliberate
 *  rather than an inconsistency.
 *
 *  A live session proves somebody who held the password once is here, not that
 *  the owner is. So the two controls that turn a stolen session into permanent
 *  ownership — the password and the address a reset goes to — sit behind a
 *  re-authentication. A display name is not a credential and nothing recovers
 *  through it; asking for a password to change it would train people to type
 *  their password into any form that asks. */
export type RenameInput = { name: string };

export type PasswordChangeInput = { current_password: string; password: string };

export type EmailChangeInput = { email: string; current_password: string };

/** One live session of the CALLER's.
 *
 *  `user_agent` and `address` are written by whatever made the request and are
 *  never parsed into a friendly device name — not by the server, and not here.
 *  A tidied "Chrome on macOS" is a claim neither repo can stand behind, and the
 *  entire purpose of the screen is that somebody recognises a session they do
 *  NOT recognise. Show the raw string. */
export type MeSession = {
  session_id: string;
  user_agent: string;
  address: string;
  issued_at: string;
  expires_at: string;
  /** The caller's own row. Use it rather than tracking which token you hold. */
  current: boolean;
};
