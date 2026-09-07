import { AppError } from "@/lib/kernel";
import type { MemoryRequest, MemoryRoute } from "@/lib/http";
import type { RegisteredAccount, Session } from "@/lib/services/identity";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/services/identity";
import { PERSONAS, personaOf, type PersonaName } from "./personas";

/* ─── Transcribed from the running server, not invented ────────────────────
   `internal/identity/domain.NewEmail`, `app/command.Registrar.Register`, and
   the messages the live endpoint on 7002 actually returns — every string below
   was read off a response on 2026-09-07. The ORDER of the checks matters: the
   server validates the email before the password, so a request wrong in both
   ways is refused for the email. A fixture that checked them the other way
   round would be indistinguishable until somebody submitted both.

   The whole surface is real now. It was one endpoint until 2026-09-07, and the
   one it was had been renamed under us — see `ALIGNMENT.md`.               */

const MAX_EMAIL_LENGTH = 254;

/** The server's decoder uses `DisallowUnknownFields`, so an extra key fails the
 *  whole request. Reproduced because the alternative is a fixture that accepts
 *  a shape the server refuses — which is how a screen gets built around a field
 *  the endpoint has never heard of. */
const REGISTER_FIELDS = new Set(["email", "password", "name"]);

/** No `fields` anywhere in this file. The server attaches none —
 *  `errors.FieldsOf` exists in `pkg/errors` and nothing in `internal/` calls it
 *  — so every refusal here is form-level too. A fixture more helpful than the
 *  server is the wrong kind of wrong: the screens come out built against a
 *  contract nobody serves. */
const invalid = (message: string) => new AppError({ kind: "invalid", message, status: 400 });

const unauthenticated = (message: string) =>
  new AppError({ kind: "unauthenticated", message, status: 401 });

function parseEmail(raw: unknown): string {
  const e = String(raw ?? "").trim().toLowerCase();
  if (e === "") throw invalid("an email address is required");
  if (e.length > MAX_EMAIL_LENGTH) throw invalid("the email address is too long");
  const at = e.indexOf("@");
  const local = at === -1 ? "" : e.slice(0, at);
  const host = at === -1 ? "" : e.slice(at + 1);
  if (at === -1 || local === "" || host === "" || host.includes("@"))
    throw invalid("the email address is not addressable");
  if (!host.includes(".") || host.startsWith(".") || host.endsWith("."))
    throw invalid("the email address has no domain");
  return e;
}

function body(request: MemoryRequest): Record<string, unknown> {
  return (request.body ?? {}) as Record<string, unknown>;
}

let seq = 0;
const nextId = () => `01a07ab4-${(++seq).toString(16).padStart(4, "0")}-7000-8000-000000000000`;

/** Accounts registered during this process, beside the two personas. A fixture
 *  account is `pending` and stays `pending` until a link is confirmed, exactly
 *  as the server does — the point of keeping it is that the confirm screen has
 *  something to advance. */
const REGISTERED = new Map<string, { account: RegisteredAccount; password: string }>();

/** The link the server would have mailed. Held in memory so `/verify` and
 *  `/reset` are walkable with no mail server, and printed by the fixture route
 *  because a link nobody can see is a screen nobody can reach. */
const LINKS = new Map<string, { kind: "verify" | "reset"; email: string }>();

const issueLink = (kind: "verify" | "reset", email: string): string => {
  const token = `${kind}_${nextId().slice(9, 17)}`;
  LINKS.set(token, { kind, email });
  return token;
};

/** Both personas sign in with this. Deliberately plaintext at a `.example`
 *  domain that resolves nowhere — hiding it behind an environment variable
 *  would imply it protects something. */
export const FIXTURE_PASSWORD = "correct-horse-battery";

const sessionFor = (name: PersonaName): Session => {
  const p = PERSONAS[name];
  return {
    token: `fixture_${name}`,
    account_id: p.me.account_id,
    email: p.me.email,
    status: p.me.status,
    expires_at: "2026-09-21T08:36:24Z",
  };
};

export const identityRoutes: MemoryRoute[] = [
  (req) => {
    if (!(req.method === "POST" && req.path === "/accounts")) return undefined;

    const input = body(req);
    for (const key of Object.keys(input))
      if (!REGISTER_FIELDS.has(key)) throw invalid("the request body could not be read");

    const email = parseEmail(input.email);
    const password = String(input.password ?? "");
    if (password.length < MIN_PASSWORD_LENGTH)
      throw invalid(`a password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    if (password.length > MAX_PASSWORD_LENGTH)
      throw invalid(`a password must be at most ${MAX_PASSWORD_LENGTH} characters`);

    const taken =
      REGISTERED.has(email) || Object.values(PERSONAS).some((p) => p.me.email === email);
    if (taken)
      throw new AppError({
        kind: "conflict",
        message: "an account with that email already exists",
        status: 409,
      });

    const account: RegisteredAccount = { account_id: nextId(), email, status: "pending" };
    REGISTERED.set(email, { account, password });
    issueLink("verify", email);
    return account;
  },

  (req) => {
    if (!(req.method === "POST" && req.path === "/sessions")) return undefined;
    const { email, password } = body(req) as { email?: string; password?: string };
    const at = String(email ?? "").trim().toLowerCase();

    // One answer for a wrong password and for an address that has no account.
    // Naming which half was right is a directory, and the server does not.
    const persona = (Object.keys(PERSONAS) as PersonaName[]).find(
      (n) => PERSONAS[n].me.email === at,
    );
    if (persona && password === FIXTURE_PASSWORD) return sessionFor(persona);

    const registered = REGISTERED.get(at);
    if (registered && registered.password === password)
      return {
        token: `fixture_new_${registered.account.account_id}`,
        account_id: registered.account.account_id,
        email: registered.account.email,
        status: registered.account.status,
        expires_at: "2026-09-21T08:36:24Z",
      } satisfies Session;

    throw unauthenticated("that email and password do not match an account");
  },

  (req) => {
    // 204 with or without a token, exactly as the server does. Signing out of a
    // session you do not have is not an error.
    if (!(req.method === "DELETE" && req.path === "/sessions/current")) return undefined;
    return null;
  },

  (req) => {
    if (!(req.method === "POST" && req.path === "/verifications")) return undefined;
    const email = String((body(req) as { email?: string }).email ?? "").trim().toLowerCase();
    if (email) issueLink("verify", email);
    // 202 for an address that exists, one that does not, and one that is not an
    // address. Three inputs, one answer.
    return null;
  },

  (req) => {
    if (!(req.method === "POST" && req.path === "/verifications/confirm")) return undefined;
    const token = String((body(req) as { token?: string }).token ?? "");
    const link = LINKS.get(token);
    if (!link || link.kind !== "verify") throw unauthenticated("that link is not valid");
    LINKS.delete(token);

    const registered = REGISTERED.get(link.email);
    if (registered) {
      registered.account = { ...registered.account, status: "active" };
      return registered.account;
    }
    const persona = personaOf(link.email);
    if (persona) return { ...PERSONAS[persona].me, status: "active" } as RegisteredAccount;
    throw unauthenticated("that link is not valid");
  },

  (req) => {
    if (!(req.method === "POST" && req.path === "/password-resets")) return undefined;
    const email = String((body(req) as { email?: string }).email ?? "").trim().toLowerCase();
    if (email) issueLink("reset", email);
    return null;
  },

  (req) => {
    if (!(req.method === "POST" && req.path === "/password-resets/confirm")) return undefined;
    const { token, password } = body(req) as { token?: string; password?: string };
    const link = LINKS.get(String(token ?? ""));
    if (!link || link.kind !== "reset") throw unauthenticated("that link is not valid");
    if (String(password ?? "").length < MIN_PASSWORD_LENGTH)
      throw invalid(`a password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    LINKS.delete(String(token));
    const registered = REGISTERED.get(link.email);
    if (registered) registered.password = String(password);
    return null;
  },
];

/** Every unspent link, newest last. Read by the dev panel so a fixture run can
 *  follow a verification or a reset without a mail server — the server mails
 *  these and a fixture has nowhere to mail them to. */
export function pendingLinks(): { token: string; kind: "verify" | "reset"; email: string }[] {
  return [...LINKS.entries()].map(([token, v]) => ({ token, ...v }));
}
