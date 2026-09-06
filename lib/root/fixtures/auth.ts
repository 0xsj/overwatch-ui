import { AppError } from "@/lib/kernel";
import type { MemoryRoute } from "@/lib/http";
import type { Invite, Session } from "@/lib/services/auth";

const MIN_PASSWORD = 12;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A `.example` address that resolves nowhere, and a password in plaintext in
 *  the source. It is a fixture, not a secret; hiding it behind an environment
 *  variable would imply it protects something. */
const ACCOUNTS = new Map<string, { password: string; session: Session }>([
  ["sj@vertexlabs.example", {
    password: "correct-horse-battery",
    session: { account_id: "acct_01JQ8H", email: "sj@vertexlabs.example", name: "S. Jarratt" },
  }],
]);

const INVITES = new Map<string, Invite>([
  ["inv_01JQ8H", {
    token: "inv_01JQ8H",
    email: "m.okafor@halcyon.example",
    workspace: "Vertex Labs Security",
    invited_by: "sj@vertexlabs.example",
    role: "Client",
    external: true,
    expires_at: "30 September 2026",
  }],
  ["inv_01JQ8K", {
    token: "inv_01JQ8K",
    email: "r.deng@vertexlabs.example",
    workspace: "Vertex Labs Security",
    invited_by: "sj@vertexlabs.example",
    role: "Analyst",
    external: false,
  }],
]);

const invalid = (message: string, fields?: Record<string, string>) =>
  new AppError({ kind: "invalid", message, fields, status: 400 });

function checkPassword(password: string) {
  if (password.length < MIN_PASSWORD)
    throw invalid("That password is too short.", {
      password: `Use at least ${MIN_PASSWORD} characters. This one has ${password.length}.`,
    });
}

function body<T>(request: { body: unknown }): T {
  return (request.body ?? {}) as T;
}

export const authRoutes: MemoryRoute[] = [
  (req) => {
    if (!(req.method === "POST" && req.path === "/auth/sign-in")) return undefined;
    const { email, password } = body<{ email: string; password: string }>(req);
    if (!EMAIL.test(email))
      throw invalid("Check the address.", { email: "That does not look like an email address." });
    if (!password)
      throw invalid("Enter your password.", { password: "Enter your password." });

    const account = ACCOUNTS.get(email);
    // No `fields`, deliberately: naming the email input tells an attacker which
    // half was right. The one place being unhelpful is correct.
    if (!account || account.password !== password)
      throw new AppError({
        kind: "unauthenticated",
        message: "Those credentials do not match an account. Check both, then try again.",
        status: 401,
      });
    return account.session;
  },

  (req) => {
    if (!(req.method === "POST" && req.path === "/auth/sign-up")) return undefined;
    const input = body<{ name: string; email: string; password: string; workspace: string }>(req);
    if (!input.name?.trim())
      throw invalid("Name yourself.", { name: "Enter the name you want on the audit trail." });
    if (!EMAIL.test(input.email ?? ""))
      throw invalid("Check the address.", { email: "That does not look like an email address." });
    if (!input.workspace?.trim())
      throw invalid("Name the workspace.", {
        workspace: "Name the workspace. One engagement or many, it needs a name.",
      });
    checkPassword(input.password ?? "");
    if (ACCOUNTS.has(input.email))
      throw new AppError({
        kind: "conflict",
        message: "An account already uses that address.",
        fields: { email: "An account already uses that address. Sign in instead." },
        status: 409,
      });
    return { account_id: "acct_new", email: input.email, name: input.name } satisfies Session;
  },

  (req) => {
    if (!(req.method === "POST" && req.path === "/auth/reset-requests")) return undefined;
    const { email } = body<{ email: string }>(req);
    if (!EMAIL.test(email))
      throw invalid("Check the address.", { email: "That does not look like an email address." });
    // Answers the same way either way. Returning null rather than undefined:
    // undefined means "not my route" to the memory client.
    return null;
  },

  (req) => {
    const match = /^\/invites\/([^/]+)$/.exec(req.path);
    if (!(req.method === "GET" && match)) return undefined;
    const invite = INVITES.get(decodeURIComponent(match[1]));
    if (!invite)
      throw new AppError({
        kind: "not_found",
        message: "This invitation has been used, withdrawn, or never existed.",
        status: 404,
      });
    return invite;
  },

  (req) => {
    const match = /^\/invites\/([^/]+)\/acceptance$/.exec(req.path);
    if (!(req.method === "POST" && match)) return undefined;
    const token = decodeURIComponent(match[1]);
    if (!INVITES.has(token))
      throw new AppError({
        kind: "not_found",
        message: "This invitation is no longer valid.",
        status: 404,
      });
    const { name, password } = body<{ name: string; password: string }>(req);
    if (!name?.trim())
      throw invalid("Name yourself.", { name: "Enter the name you want on the audit trail." });
    checkPassword(password ?? "");
    const invite = INVITES.get(token)!;
    return { account_id: "acct_joined", email: invite.email, name } satisfies Session;
  },
];
