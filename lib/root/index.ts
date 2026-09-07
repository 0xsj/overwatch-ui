import { createFetchClient, createMemoryClient, type HttpClient } from "@/lib/http";
import { routes } from "./fixtures";
import { currentToken, isFixtureToken } from "./session";

const baseUrl = process.env.NEXT_PUBLIC_API_URL;

/** Every domain the client has a service for. */
export type Domain = "identity" | "tenancy" | "ledger" | "access" | "entities";

/** The domains the SERVER actually serves.
 *
 *  One adapter for everything was right while nothing was real. It stopped being
 *  right the day one endpoint was: pointing at a half-built backend then breaks
 *  every screen it does not serve, because there is no fallback — by design.
 *
 *  `access` is deliberately absent and is the interesting entry. Its model is
 *  sealed in `decisions/0019` and NONE of its commands exist over HTTP — no
 *  invite endpoint, no role change, no grant write. Putting it here the day the
 *  model landed would 404 every collaboration screen. */
const SERVED: readonly Domain[] = ["identity", "tenancy", "ledger"];

const fixtures = (token: string | null) =>
  createMemoryClient({ routes, getAccessToken: () => token });

const server = (token: string | null) =>
  baseUrl ? createFetchClient({ baseUrl, getAccessToken: () => token }) : null;

/** The client for one domain, for the caller who is actually signed in.
 *
 *  Two questions, not one. *Is this domain served* is about the backend's
 *  progress. *Is this session real* is about who is asking: a `fixture_` bearer
 *  names one of the two fixture tenants, and a session that is fake in identity
 *  cannot be real in tenancy — reading a persona's org from the live server
 *  would 404 and reading a real org while signed in as a persona would be a
 *  disclosure. So a fixture session is fixtures the whole way down.
 *
 *  It is async because the bearer is in a cookie and `cookies()` is async. That
 *  is why callers take the client rather than importing one. */
export async function clientFor(domain: Domain): Promise<HttpClient> {
  const token = await currentToken();
  if (isFixtureToken(token)) return fixtures(token);
  const real = server(token);
  return real && SERVED.includes(domain) ? real : fixtures(token);
}

/** For the unauthenticated calls — register, sign in, the two link screens.
 *  There is no session yet, so there is nothing to read a cookie for. */
export function anonymousClient(domain: Domain): HttpClient {
  const real = server(null);
  return real && SERVED.includes(domain) ? real : fixtures(null);
}

export const hasServer = Boolean(baseUrl);

/** Whether what a screen is about to render came from a fixture. The yellow
 *  badge hangs off this and nothing else. */
export async function usingFixtures(domain: Domain): Promise<boolean> {
  if (isFixtureToken(await currentToken())) return true;
  return !(hasServer && SERVED.includes(domain));
}

/** Whether a domain is on fixtures for EVERYBODY, before anyone is signed in.
 *  The unauthenticated screens use this — they have no session to consult, so
 *  the only question left is whether a server serves the domain at all. */
export function servedByFixtures(domain: Domain): boolean {
  return !(hasServer && SERVED.includes(domain));
}

export function adapterFor(domain: Domain): "fetch" | "memory" {
  return hasServer && SERVED.includes(domain) ? "fetch" : "memory";
}

export const DOMAINS: Domain[] = ["identity", "tenancy", "ledger", "access", "entities"];

export const transport = !baseUrl
  ? "No backend. Nothing is stored, no email is sent, and no session is created."
  : `Talking to ${baseUrl} for ${SERVED.join(", ")}. Everything else is still fixtures.`;

export { currentToken, endSession, startSession } from "./session";
