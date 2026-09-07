import { cookies } from "next/headers";

/** The bearer, in a cookie.
 *
 *  `httpOnly` because nothing in the browser needs to read it — every request
 *  that carries it is made on the server, by an action or a server component.
 *  The day a client component needs to call an endpoint directly, that is a
 *  route handler forwarding the cookie, not this becoming readable. */
const COOKIE = "ow_session";

const OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: process.env.NODE_ENV === "production",
} as const;

export async function currentToken(): Promise<string | null> {
  return (await cookies()).get(COOKIE)?.value ?? null;
}

/** Server actions and route handlers only — a server component may read a
 *  cookie and may not write one, and the error for getting that wrong arrives
 *  at request time rather than at build. */
export async function startSession(token: string): Promise<void> {
  (await cookies()).set(COOKIE, token, OPTIONS);
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/** A fixture bearer names a persona; a real one is opaque. This prefix is the
 *  whole distinction, and it is what lets one build hold both a signed-in
 *  fixture tenant and a signed-in real account without a second flag. */
export const FIXTURE_PREFIX = "fixture_";

export const isFixtureToken = (token: string | null | undefined): boolean =>
  Boolean(token?.startsWith(FIXTURE_PREFIX));
