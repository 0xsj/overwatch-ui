import { AppError } from "@/lib/kernel";
import { bearerOf, type MemoryRoute } from "@/lib/http";
import type { Grant, Invite, InviteInput } from "@/lib/services/access";
import type { GrantLevel, OrgRole } from "@/lib/services/tenancy";
import { PERSONAS, personaFromToken, type PersonaName } from "./personas";

/* ─── Nothing here is served by anything. ──────────────────────────────────
   These routes exist so the invite and grant flows are WALKABLE before the
   backend has them — `ALIGNMENT.md` says the commands arrive with the invite
   flow and that the screens should be built read-only or behind a flag.

   A fixture is a reference for layout, copy and interaction and never for code:
   the shapes below are proposals, and the day a real endpoint lands it decides
   and this file is rewritten to match it, not the other way round.          */

/** Mutable per persona, so an invitation sent on the members screen appears in
 *  the list and can be revoked — a flow you cannot feel from a static array. */
const INVITES = new Map<PersonaName, Invite[]>();
const GRANTS = new Map<PersonaName, Grant[]>();
const ROLES = new Map<PersonaName, Map<string, OrgRole>>();

let seq = 0;
const nextId = () => `inv_${(++seq).toString(36).padStart(6, "0")}`;

function invitesOf(name: PersonaName): Invite[] {
  if (!INVITES.has(name)) INVITES.set(name, [...PERSONAS[name].invites]);
  return INVITES.get(name)!;
}

function grantsOf(name: PersonaName): Grant[] {
  if (!GRANTS.has(name)) GRANTS.set(name, [...PERSONAS[name].grants]);
  return GRANTS.get(name)!;
}

function rolesOf(name: PersonaName): Map<string, OrgRole> {
  if (!ROLES.has(name))
    ROLES.set(name, new Map(PERSONAS[name].members.map((m) => [m.account_id, m.role])));
  return ROLES.get(name)!;
}

/** The one rule this fixture enforces, because it is the one that is
 *  unreachable in the backend today: an org must never lose its last owner.
 *  `org.ErrLastOwner` is declared there, raised inside both storage adapters,
 *  and never triggered, because no app-layer code calls the method. Refusing
 *  here means the screen has an error path before the server can produce one. */
function guardLastOwner(name: PersonaName, accountId: string, next: OrgRole | null) {
  const roles = rolesOf(name);
  if (roles.get(accountId) !== "owner") return;
  const owners = [...roles.values()].filter((r) => r === "owner").length;
  if (owners <= 1 && next !== "owner")
    throw new AppError({
      kind: "conflict",
      status: 409,
      message:
        "This is the org's last owner. Make somebody else an owner first — an org without one has nobody who can transfer or close it.",
    });
}

const invalid = (message: string) => new AppError({ kind: "invalid", message, status: 400 });

const orgOf = (name: PersonaName) => PERSONAS[name].me.orgs[0];

/** The persona this request is from, or a refusal.
 *
 *  A bearer that names no persona is a REAL session, and a real session has no
 *  fixture invitations and no fixture grants. Answering with the firm's anyway
 *  is what this did until 2026-09-07, and it put one imaginary tenant's
 *  invitations on every real account's members screen. */
function whose(req: { headers: Record<string, string> }): PersonaName {
  const name = personaFromToken(bearerOf(req as never));
  if (!name)
    throw new AppError({
      kind: "not_found",
      status: 404,
      message: "No invite or grant endpoint exists yet, and this session is not a fixture persona.",
    });
  return name;
}

export const accessRoutes: MemoryRoute[] = [
  (req) => {
    const match = /^\/orgs\/([^/]+)\/invitations$/.exec(req.path);
    if (!(req.method === "GET" && match)) return undefined;
    return invitesOf(whose(req));
  },

  (req) => {
    const match = /^\/orgs\/([^/]+)\/invitations$/.exec(req.path);
    if (!(req.method === "POST" && match)) return undefined;

    const name = whose(req);
    const org = orgOf(name);
    const input = (req.body ?? {}) as InviteInput;
    const email = String(input.email ?? "").trim().toLowerCase();
    if (!email.includes("@")) throw invalid("the email address is not addressable");

    if (PERSONAS[name].members.some((m) => m.email === email))
      throw new AppError({
        kind: "conflict",
        status: 409,
        message: "That person is already in this organisation.",
      });
    if (invitesOf(name).some((i) => i.email === email && i.state === "pending"))
      throw new AppError({
        kind: "conflict",
        status: 409,
        message: "An invitation to that address is already waiting.",
      });

    const grant = input.first_grant;
    const workspace = grant
      ? org.workspaces.find((w) => w.workspace_id === grant.workspace_id)
      : undefined;

    const invite: Invite = {
      id: nextId(),
      token: nextId(),
      email,
      role: (input.role ?? "member") as OrgRole,
      org_id: org.org_id,
      org_name: org.name,
      invited_by: PERSONAS[name].me.email,
      ...(grant && workspace
        ? {
            first_grant: {
              workspace_id: workspace.workspace_id,
              workspace_name: workspace.name,
              level: grant.level,
            },
          }
        : {}),
      // A week, not a day. An invitation waits on somebody reading their mail.
      expires_at: "2026-09-14T09:00:00Z",
      state: "pending",
    };
    invitesOf(name).push(invite);
    return invite;
  },

  (req) => {
    const match = /^\/orgs\/([^/]+)\/invitations\/([^/]+)$/.exec(req.path);
    if (!(req.method === "DELETE" && match)) return undefined;
    const list = invitesOf(whose(req));
    const invite = list.find((i) => i.id === decodeURIComponent(match[2]));
    if (!invite)
      throw new AppError({ kind: "not_found", message: "not found", status: 404 });
    invite.state = "revoked";
    return null;
  },

  (req) => {
    const match = /^\/invitations\/([^/]+)$/.exec(req.path);
    if (!(req.method === "GET" && match)) return undefined;
    const token = decodeURIComponent(match[1]);
    for (const name of Object.keys(PERSONAS) as PersonaName[]) {
      const invite = invitesOf(name).find((i) => i.token === token);
      if (invite && invite.state === "pending") return invite;
    }
    throw new AppError({
      kind: "not_found",
      status: 404,
      message: "This invitation has been used, withdrawn, or never existed.",
    });
  },

  (req) => {
    const match = /^\/invitations\/([^/]+)\/acceptance$/.exec(req.path);
    if (!(req.method === "POST" && match)) return undefined;
    const token = decodeURIComponent(match[1]);
    for (const name of Object.keys(PERSONAS) as PersonaName[]) {
      const invite = invitesOf(name).find((i) => i.token === token);
      if (!invite) continue;
      if (invite.state !== "pending")
        throw new AppError({
          kind: "not_found",
          status: 404,
          message: "This invitation is no longer valid.",
        });
      invite.state = "accepted";
      return invite;
    }
    throw new AppError({
      kind: "not_found",
      status: 404,
      message: "This invitation is no longer valid.",
    });
  },

  (req) => {
    const match = /^\/orgs\/([^/]+)\/members\/([^/]+)$/.exec(req.path);
    if (!(req.method === "PATCH" && match)) return undefined;
    const name = whose(req);
    const accountId = decodeURIComponent(match[2]);
    const role = (req.body as { role?: OrgRole })?.role;
    if (!role) throw invalid("a role is required");
    guardLastOwner(name, accountId, role);
    rolesOf(name).set(accountId, role);
    return null;
  },

  (req) => {
    const match = /^\/orgs\/([^/]+)\/members\/([^/]+)$/.exec(req.path);
    if (!(req.method === "DELETE" && match)) return undefined;
    const name = whose(req);
    const accountId = decodeURIComponent(match[2]);
    guardLastOwner(name, accountId, null);
    rolesOf(name).delete(accountId);
    return null;
  },

  (req) => {
    const match = /^\/orgs\/([^/]+)\/grants$/.exec(req.path);
    if (!(req.method === "GET" && match)) return undefined;
    return grantsOf(whose(req));
  },

  (req) => {
    const match = /^\/orgs\/([^/]+)\/workspaces\/([^/]+)\/grants\/([^/]+)$/.exec(req.path);
    if (!(req.method === "PUT" && match)) return undefined;

    const name = whose(req);
    const workspaceId = decodeURIComponent(match[2]);
    const accountId = decodeURIComponent(match[3]);
    const level = (req.body as { level?: GrantLevel })?.level ?? "none";

    const list = grantsOf(name);
    const at = list.findIndex(
      (g) => g.account_id === accountId && g.workspace_id === workspaceId,
    );
    // `none` is a level and revoking is writing it. One verb, so a screen
    // cannot express "granted, at none" as a state distinct from having no row.
    if (level === "none") {
      if (at !== -1) list.splice(at, 1);
      return { account_id: accountId, workspace_id: workspaceId, level } satisfies Grant;
    }
    const grant: Grant = { account_id: accountId, workspace_id: workspaceId, level };
    if (at === -1) list.push(grant);
    else list[at] = grant;
    return grant;
  },
];

/** The roles as the fixture currently holds them, so the members screen shows a
 *  change that a PATCH actually made rather than the persona's original. */
export function rolesFor(name: PersonaName): Map<string, OrgRole> {
  return rolesOf(name);
}
