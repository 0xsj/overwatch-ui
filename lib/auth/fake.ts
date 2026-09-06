import type { AuthPort, Invite, Result, SignUpInput } from "./port";

const MIN_PASSWORD = 12;

const KNOWN = new Map<string, string>([
  ["sj@vertexlabs.example", "correct-horse-battery"],
]);

const INVITES = new Map<string, Invite>([
  ["inv_01JQ8H", {
    token: "inv_01JQ8H",
    email: "m.okafor@halcyon.example",
    workspace: "Vertex Labs Security",
    invitedBy: "sj@vertexlabs.example",
    role: "Client",
    external: true,
    expiresAt: "30 September 2026",
  }],
  ["inv_01JQ8K", {
    token: "inv_01JQ8K",
    email: "r.deng@vertexlabs.example",
    workspace: "Vertex Labs Security",
    invitedBy: "sj@vertexlabs.example",
    role: "Analyst",
    external: false,
  }],
]);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function checkPassword(password: string): Result {
  if (password.length < MIN_PASSWORD)
    return { ok: false, field: "password", message: `Use at least ${MIN_PASSWORD} characters. This one has ${password.length}.` };
  return { ok: true, value: undefined };
}

export const fakeAuth: AuthPort = {
  describe: {
    kind: "fake",
    note: "No backend. Nothing is stored, no email is sent, and no session is created.",
  },

  async signIn(email, password) {
    await wait(400);
    if (!EMAIL.test(email)) return { ok: false, field: "email", message: "That does not look like an email address." };
    if (!password) return { ok: false, field: "password", message: "Enter your password." };
    if (KNOWN.get(email) !== password)
      return { ok: false, message: "Those credentials do not match an account. Check both, then try again." };
    return { ok: true, value: undefined };
  },

  async signUp(input: SignUpInput) {
    await wait(500);
    if (!input.name.trim()) return { ok: false, field: "name", message: "Enter the name you want on the audit trail." };
    if (!EMAIL.test(input.email)) return { ok: false, field: "email", message: "That does not look like an email address." };
    if (!input.workspace.trim()) return { ok: false, field: "workspace", message: "Name the workspace. One engagement or many, it needs a name." };
    const pw = checkPassword(input.password);
    if (!pw.ok) return pw;
    if (KNOWN.has(input.email))
      return { ok: false, field: "email", message: "An account already uses that address. Sign in instead." };
    return { ok: true, value: undefined };
  },

  async requestReset(email) {
    await wait(400);
    if (!EMAIL.test(email)) return { ok: false, field: "email", message: "That does not look like an email address." };
    return { ok: true, value: undefined };
  },

  async readInvite(token) {
    await wait(200);
    const invite = INVITES.get(token);
    if (!invite) return { ok: false, field: "token", message: "This invitation has been used, withdrawn, or never existed." };
    return { ok: true, value: invite };
  },

  async acceptInvite(token, name, password) {
    await wait(500);
    if (!INVITES.has(token)) return { ok: false, field: "token", message: "This invitation is no longer valid." };
    if (!name.trim()) return { ok: false, field: "name", message: "Enter the name you want on the audit trail." };
    const pw = checkPassword(password);
    if (!pw.ok) return pw;
    return { ok: true, value: undefined };
  },
};
