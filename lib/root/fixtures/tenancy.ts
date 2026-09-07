import { AppError } from "@/lib/kernel";
import { bearerOf, type MemoryRoute } from "@/lib/http";
import type { GrantLevel, Me, Member, OpenedWorkspace } from "@/lib/services/tenancy";
import { PERSONAS, personaFromToken, type PersonaName } from "./personas";
import { removedFrom, roleIn } from "./access";

/** The same three answers for an org you are not in, one that does not exist,
 *  and a malformed id — deliberately, so the id space cannot be probed. */
const notFound = () =>
  new AppError({ kind: "not_found", message: "not found", status: 404 });

const forbidden = (message: string) =>
  new AppError({ kind: "forbidden", message, status: 403 });

const unauthenticated = () =>
  new AppError({ kind: "unauthenticated", message: "not signed in", status: 401 });

/** Workspaces opened during this process, per persona. Kept so #24 is walkable
 *  end to end rather than optimistic: open one, and it is in `/v1/me` next
 *  read. */
const OPENED = new Map<string, { org_id: string; workspace_id: string; name: string }[]>();

/** Renames and closures, per persona, keyed by workspace id. Held apart from the
 *  persona itself so a reset is one map rather than a deep clone. */
const RENAMED = new Map<string, string>();
const CLOSED = new Set<string>();
const ORG_NAME = new Map<string, string>();

let seq = 0;
const nextWorkspaceId = () =>
  `01a07b46-fa56-7001-9bd7-1${(++seq).toString(16).padStart(11, "0")}`;

const nameOf = (id: string, fallback: string) => RENAMED.get(id) ?? fallback;

/** `/v1/me` EXCLUDES closed engagements. It is the boot call and the switcher's
 *  source, and a firm's history does not belong in a switcher. */
function meFor(name: PersonaName): Me {
  const base = PERSONAS[name].me;
  const extra = OPENED.get(name) ?? [];
  return {
    ...base,
    orgs: base.orgs.map((org) => ({
      ...org,
      name: ORG_NAME.get(org.org_id) ?? org.name,
      workspaces: [
        ...org.workspaces,
        ...extra
          .filter((w) => w.org_id === org.org_id)
          .map((w) => ({
            workspace_id: w.workspace_id,
            name: w.name,
            access: "admin" as GrantLevel,
          })),
      ]
        .filter((w) => !CLOSED.has(w.workspace_id))
        .map((w) => ({ ...w, name: nameOf(w.workspace_id, w.name) })),
    })),
  };
}

/** The LISTING, which includes closed ones — the only way to reach one. */
function workspacesFor(name: PersonaName, orgId: string) {
  const persona = PERSONAS[name];
  const org = persona.me.orgs.find((o) => o.org_id === orgId);
  if (!org) return null;
  const extra = (OPENED.get(name) ?? []).filter((w) => w.org_id === orgId);
  return [
    ...org.workspaces.map((w) => ({ workspace_id: w.workspace_id, name: w.name, access: w.access })),
    ...extra.map((w) => ({ workspace_id: w.workspace_id, name: w.name, access: "admin" as GrantLevel })),
  ].map((w) => ({
    workspace_id: w.workspace_id,
    org_id: orgId,
    name: nameOf(w.workspace_id, w.name),
    access: w.access,
    closed: CLOSED.has(w.workspace_id),
  }));
}

const closedConflict = () =>
  new AppError({
    kind: "conflict",
    status: 409,
    message: "that engagement is closed — reopen it first",
  });

export const tenancyRoutes: MemoryRoute[] = [
  (req) => {
    const match = /^\/orgs\/([^/]+)\/workspaces$/.exec(req.path);
    if (!(req.method === "GET" && match)) return undefined;
    const name = personaFromToken(bearerOf(req));
    if (!name) throw unauthenticated();
    const list = workspacesFor(name, decodeURIComponent(match[1]));
    if (!list) throw notFound();
    return list;
  },

  (req) => {
    const match = /^\/orgs\/([^/]+)$/.exec(req.path);
    if (!(req.method === "PATCH" && match)) return undefined;
    const name = personaFromToken(bearerOf(req));
    if (!name) throw unauthenticated();
    const orgId = decodeURIComponent(match[1]);
    const org = PERSONAS[name].me.orgs.find((o) => o.org_id === orgId);
    if (!org) throw notFound();
    if (org.role !== "owner" && org.role !== "admin")
      throw forbidden("only an owner or an admin can rename this organisation");
    const next = String((req.body as { name?: string })?.name ?? "").trim();
    if (!next) throw new AppError({ kind: "invalid", message: "a name is required", status: 400 });
    ORG_NAME.set(orgId, next);
    return { org_id: orgId, name: next };
  },

  (req) => {
    const match = /^\/workspaces\/([^/]+)$/.exec(req.path);
    if (!(req.method === "PATCH" && match)) return undefined;
    const name = personaFromToken(bearerOf(req));
    if (!name) throw unauthenticated();
    const id = decodeURIComponent(match[1]);
    if (CLOSED.has(id)) throw closedConflict();
    const next = String((req.body as { name?: string })?.name ?? "").trim();
    if (!next) throw new AppError({ kind: "invalid", message: "a name is required", status: 400 });
    RENAMED.set(id, next);
    const org = PERSONAS[name].me.orgs[0];
    return { workspace_id: id, org_id: org.org_id, name: next, access: "admin", closed: false };
  },

  (req) => {
    const match = /^\/workspaces\/([^/]+)\/close$/.exec(req.path);
    if (!(req.method === "POST" && match)) return undefined;
    if (!personaFromToken(bearerOf(req))) throw unauthenticated();
    const id = decodeURIComponent(match[1]);
    if (CLOSED.has(id)) throw closedConflict();
    CLOSED.add(id);
    return null;
  },

  (req) => {
    const match = /^\/workspaces\/([^/]+)\/reopen$/.exec(req.path);
    if (!(req.method === "POST" && match)) return undefined;
    const name = personaFromToken(bearerOf(req));
    if (!name) throw unauthenticated();
    const id = decodeURIComponent(match[1]);
    // Closing FREES the name, so another engagement may hold it now — and the
    // refusal is about that other one rather than this. Say which.
    const wanted = nameOf(id, "");
    const taken = (workspacesFor(name, PERSONAS[name].me.orgs[0].org_id) ?? []).find(
      (w) => w.workspace_id !== id && !w.closed && w.name === wanted,
    );
    if (taken)
      throw new AppError({
        kind: "conflict",
        status: 409,
        message: `another engagement is called "${wanted}" now — rename one of them first`,
      });
    CLOSED.delete(id);
    const org = PERSONAS[name].me.orgs[0];
    return { workspace_id: id, org_id: org.org_id, name: nameOf(id, ""), access: "admin", closed: false };
  },

  (req) => {
    if (!(req.method === "GET" && req.path === "/me")) return undefined;
    // The real server answers 401 `not signed in` with no bearer, and a bearer
    // that names no persona is the same answer — a fixture must not invent a
    // caller it does not recognise.
    const name = personaFromToken(bearerOf(req));
    if (!name) throw unauthenticated();
    return meFor(name);
  },

  (req) => {
    const match = /^\/orgs\/([^/]+)\/members$/.exec(req.path);
    if (!(req.method === "GET" && match)) return undefined;
    const name = personaFromToken(bearerOf(req));
    if (!name) throw unauthenticated();
    const persona = PERSONAS[name];
    if (persona.me.orgs[0]?.org_id !== decodeURIComponent(match[1])) throw notFound();
    // LIVE members only. The real endpoint returned removed people from the day
    // it shipped, despite its own documentation saying otherwise — fixed
    // server-side 2026-09-07. There is no "former members" view, and when one is
    // wanted it will be a separate endpoint rather than a flag.
    return persona.members
      .filter((m) => !removedFrom(name).has(m.account_id))
      .map((m) => ({ ...m, role: roleIn(name, m.account_id) ?? m.role })) satisfies Member[];
  },

  (req) => {
    const match = /^\/orgs\/([^/]+)\/workspaces$/.exec(req.path);
    if (!(req.method === "POST" && match)) return undefined;

    const name = personaFromToken(bearerOf(req));
    if (!name) throw unauthenticated();
    const persona = PERSONAS[name];
    const orgId = decodeURIComponent(match[1]);
    const org = persona.me.orgs.find((o) => o.org_id === orgId);
    if (!org) throw notFound();

    // The two refusals the live server makes, in its own words. A member is
    // told WHY — they already know the org exists, so there is nothing left to
    // disclose and what they need is the cause.
    if (!persona.me.verified)
      throw forbidden("confirm your email address before starting an engagement");
    if (org.role !== "owner" && org.role !== "admin")
      throw forbidden("only an owner or an admin can start an engagement");

    const label = String((req.body as { name?: string })?.name ?? "").trim();
    if (!label) throw new AppError({ kind: "invalid", message: "a name is required", status: 400 });

    const opened = { org_id: orgId, workspace_id: nextWorkspaceId(), name: label };
    OPENED.set(name, [...(OPENED.get(name) ?? []), opened]);

    // Carries `access` already, because a subscriber writes the opener's grant
    // and the workspace is not in `/v1/me` for a beat. Navigate on this.
    return {
      workspace_id: opened.workspace_id,
      org_id: orgId,
      name: label,
      access: "admin",
    } satisfies OpenedWorkspace;
  },
];
