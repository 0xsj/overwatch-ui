import { AppError } from "@/lib/kernel";
import { bearerOf, type MemoryRoute } from "@/lib/http";
import type { Invite, InviteInput, WorkspaceMember } from "@/lib/services/access";
import type { OrgRole } from "@/lib/services/tenancy";
import { ROLE_CEILING, GRANT_LADDER, type GrantLevel } from "@/lib/services/tenancy";
import { PERSONAS, personaFromToken, type PersonaName } from "./personas";

/* ─── `access` is SERVED as of 2026-09-07. ─────────────────────────────────
   These routes exist only for a fixture persona, which has no account on the
   real server — so they reproduce the live contract rather than proposing one.
   Every path, status and message below was read off the running server.     */

const forbidden = (message: string) =>
  new AppError({ kind: "forbidden", message, status: 403 });

const conflict = (message: string) =>
  new AppError({ kind: "conflict", message, status: 409 });

const notFound = () => new AppError({ kind: "not_found", message: "not found", status: 404 });

/** Grants held per persona, keyed `workspace:account`. A missing entry is no
 *  row at all, which is the only way "no access" is representable — there is no
 *  `none` to store. */
const LEVELS = new Map<PersonaName, Map<string, GrantLevel>>();
const INVITES = new Map<PersonaName, Invite[]>();

let seq = 0;
const nextId = () => `01a07b92-${(++seq).toString(16).padStart(4, "0")}-7000-8000-000000000000`;

function levelsOf(name: PersonaName): Map<string, GrantLevel> {
  if (!LEVELS.has(name)) {
    LEVELS.set(
      name,
      new Map(PERSONAS[name].grants.map((g) => [`${g.workspace_id}:${g.account_id}`, g.level])),
    );
  }
  return LEVELS.get(name)!;
}

const invitesOf = (name: PersonaName): Invite[] => {
  if (!INVITES.has(name)) INVITES.set(name, []);
  return INVITES.get(name)!;
};

function whose(req: Parameters<MemoryRoute>[0]): PersonaName {
  const name = personaFromToken(bearerOf(req));
  if (!name) throw notFound();
  return name;
}

/** Effective, not stored: the org role caps whatever was written.
 *
 *  Which is the one calculation this fixture has to do that the client must
 *  never do — the real server sends `access` already reduced, and a client that
 *  computed it would be a second implementation of an authorisation rule. Here
 *  it stands in for the server, so it is the server's job being done. */
function effective(role: keyof typeof ROLE_CEILING, written: GrantLevel | undefined): GrantLevel {
  if (role === "owner") return "admin"; // the one exemption — no row needed
  if (!written) return "none";
  const cap = GRANT_LADDER.indexOf(ROLE_CEILING[role]);
  const has = GRANT_LADDER.indexOf(written);
  return GRANT_LADDER[Math.min(cap, has)];
}

/** Roles as the fixture currently holds them, and the last-owner guard.
 *
 *  The guard refuses rather than disabling: `decisions/0026` is explicit that the
 *  person must be told WHY, and the answer is "promote somebody first". A
 *  control that is simply absent teaches nothing and reads as a bug. */
const ROLES = new Map<PersonaName, Map<string, OrgRole>>();
const REMOVED = new Map<PersonaName, Set<string>>();

function rolesOf(name: PersonaName): Map<string, OrgRole> {
  if (!ROLES.has(name))
    ROLES.set(name, new Map(PERSONAS[name].members.map((m) => [m.account_id, m.role])));
  return ROLES.get(name)!;
}

const removedOf = (name: PersonaName): Set<string> => {
  if (!REMOVED.has(name)) REMOVED.set(name, new Set());
  return REMOVED.get(name)!;
};

function guardLastOwner(name: PersonaName, accountId: string, next: OrgRole | null) {
  const roles = rolesOf(name);
  const gone = removedOf(name);
  if (roles.get(accountId) !== "owner") return;
  const owners = [...roles].filter(([id, r]) => r === "owner" && !gone.has(id)).length;
  if (owners <= 1 && next !== "owner")
    throw conflict(
      "this is the organisation's last owner — promote somebody else to owner first",
    );
}

export const accessRoutes: MemoryRoute[] = [
  (req) => {
    const match = /^\/orgs\/([^/]+)\/members\/([^/]+)$/.exec(req.path);
    if (!(req.method === "PATCH" && match)) return undefined;
    const name = whose(req);
    const accountId = decodeURIComponent(match[2]);
    const role = (req.body as { role?: OrgRole })?.role;
    if (!role) throw new AppError({ kind: "invalid", message: "a role is required", status: 400 });

    const actor = PERSONAS[name].me.orgs[0].role;
    const target = rolesOf(name).get(accountId);
    // Only an owner may touch an owner — 403, and it is about the ACTOR, so no
    // amount of explanation lets them proceed.
    if (actor !== "owner" && (target === "owner" || role === "owner"))
      throw forbidden("only an owner can change an owner");

    guardLastOwner(name, accountId, role);
    rolesOf(name).set(accountId, role);
    return null;
  },

  (req) => {
    const match = /^\/orgs\/([^/]+)\/members\/me$/.exec(req.path);
    if (!(req.method === "DELETE" && match)) return undefined;
    const name = whose(req);
    guardLastOwner(name, PERSONAS[name].me.account_id, null);
    removedOf(name).add(PERSONAS[name].me.account_id);
    return null;
  },

  (req) => {
    const match = /^\/orgs\/([^/]+)\/members\/([^/]+)$/.exec(req.path);
    if (!(req.method === "DELETE" && match)) return undefined;
    const name = whose(req);
    const accountId = decodeURIComponent(match[2]);
    const actor = PERSONAS[name].me.orgs[0].role;
    if (actor !== "owner" && rolesOf(name).get(accountId) === "owner")
      throw forbidden("only an owner can remove an owner");
    guardLastOwner(name, accountId, null);
    removedOf(name).add(accountId);
    // Removal DELETES every grant. Demotion does not — that is the distinction
    // the confirmation copy exists to carry.
    for (const key of [...levelsOf(name).keys()])
      if (key.endsWith(`:${accountId}`)) levelsOf(name).delete(key);
    return null;
  },

  (req) => {
    const match = /^\/orgs\/([^/]+)\/invites$/.exec(req.path);
    if (!(req.method === "POST" && match)) return undefined;

    const name = whose(req);
    const persona = PERSONAS[name];
    // The same rule as opening an engagement, and it is written down nowhere
    // but the response.
    if (!persona.me.verified)
      throw forbidden("confirm your email address before inviting anybody");

    const input = (req.body ?? {}) as InviteInput;
    const email = String(input.email ?? "").trim().toLowerCase();
    if (!email.includes("@")) throw new AppError({ kind: "invalid", message: "the email address is not addressable", status: 400 });

    // Together or not at all. The server refuses to guess, because a workspace
    // with no level and a level with no workspace are both half a decision.
    const hasWorkspace = Boolean(input.workspace_id);
    const hasLevel = Boolean(input.level);
    if (hasWorkspace !== hasLevel)
      throw new AppError({
        kind: "invalid",
        status: 400,
        message: "workspace_id and level are given together or not at all",
      });

    if (persona.members.some((m) => m.email === email))
      throw conflict("that person is already in this organisation");

    if (input.level && input.role) {
      const cap = GRANT_LADDER.indexOf(ROLE_CEILING[input.role]);
      if (GRANT_LADDER.indexOf(input.level) > cap)
        throw conflict(`a ${input.role} cannot be given ${input.level} on an engagement`);
    }

    const invite: Invite = {
      invite_id: nextId(),
      email,
      role: input.role,
      ...(hasWorkspace ? { workspace_id: input.workspace_id, level: input.level } : {}),
      expires_at: "2026-09-14T09:00:00Z",
    };
    invitesOf(name).push(invite);
    return invite;
  },

  (req) => {
    const match = /^\/orgs\/([^/]+)\/invites\/([^/]+)$/.exec(req.path);
    if (!(req.method === "DELETE" && match)) return undefined;
    const list = invitesOf(whose(req));
    const at = list.findIndex((i) => i.invite_id === decodeURIComponent(match[2]));
    if (at === -1) throw notFound();
    list.splice(at, 1);
    return null;
  },

  (req) => {
    if (!(req.method === "POST" && req.path === "/invites/accept")) return undefined;
    whose(req);
    // A persona cannot accept a real invitation and a real account cannot accept
    // a fixture one. Saying so beats a fake success.
    throw forbidden("that invitation was sent to a different address");
  },

  (req) => {
    const match = /^\/workspaces\/([^/]+)\/members$/.exec(req.path);
    if (!(req.method === "GET" && match)) return undefined;

    const name = whose(req);
    const persona = PERSONAS[name];
    const workspaceId = decodeURIComponent(match[1]);
    // A workspace the caller cannot see is 404, never an empty list.
    const visible = persona.me.orgs[0]?.workspaces.some((w) => w.workspace_id === workspaceId);
    if (!visible) throw notFound();

    const written = levelsOf(name);
    return persona.members
      .map((m) => ({
        account_id: m.account_id,
        email: m.email,
        name: m.name,
        role: m.role,
        access: effective(m.role, written.get(`${workspaceId}:${m.account_id}`)),
      }))
      // Only people who can actually see it. `none` is absence, so it is absent.
      .filter((row) => row.access !== "none") satisfies WorkspaceMember[];
  },

  (req) => {
    const match = /^\/workspaces\/([^/]+)\/members\/([^/]+)$/.exec(req.path);
    if (!(req.method === "PUT" && match)) return undefined;

    const name = whose(req);
    const workspaceId = decodeURIComponent(match[1]);
    const accountId = decodeURIComponent(match[2]);
    const level = (req.body as { level?: GrantLevel })?.level;
    if (!level || level === "none")
      throw new AppError({ kind: "invalid", message: "level must be read, write or admin", status: 400 });

    const member = PERSONAS[name].members.find((m) => m.account_id === accountId);
    if (!member) throw conflict("that account is not a member of this organisation");
    if (member.role === "owner")
      throw conflict("the org owner is admin on every engagement and holds no grant");

    const cap = GRANT_LADDER.indexOf(ROLE_CEILING[member.role]);
    if (GRANT_LADDER.indexOf(level) > cap)
      throw conflict(`a ${member.role} cannot be given ${level} on an engagement`);

    levelsOf(name).set(`${workspaceId}:${accountId}`, level);
    return {
      account_id: member.account_id,
      email: member.email,
      name: member.name,
      role: member.role,
      access: effective(member.role, level),
    } satisfies WorkspaceMember;
  },

  (req) => {
    const match = /^\/workspaces\/([^/]+)\/members\/([^/]+)$/.exec(req.path);
    if (!(req.method === "DELETE" && match)) return undefined;
    const name = whose(req);
    // Deleting the row IS the revocation. There is no level to write.
    levelsOf(name).delete(
      `${decodeURIComponent(match[1])}:${decodeURIComponent(match[2])}`,
    );
    return null;
  },
];

/** Read by the tenancy fixture so `GET /orgs/{org}/members` returns LIVE members
 *  with their CURRENT roles. Two fixtures sharing state is the price of the
 *  membership commands and the members list living in different domains, which
 *  is where the real server puts them too. */
export const removedFrom = (name: PersonaName): Set<string> => removedOf(name);
export const roleIn = (name: PersonaName, accountId: string): OrgRole | undefined =>
  rolesOf(name).get(accountId);
