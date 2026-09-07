import { AppError } from "@/lib/kernel";
import { bearerOf, type MemoryRoute } from "@/lib/http";
import type { GrantLevel, Me, Member, OpenedWorkspace } from "@/lib/services/tenancy";
import { PERSONAS, personaFromToken, type PersonaName } from "./personas";

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

let seq = 0;
const nextWorkspaceId = () =>
  `01a07b46-fa56-7001-9bd7-1${(++seq).toString(16).padStart(11, "0")}`;

function meFor(name: PersonaName): Me {
  const base = PERSONAS[name].me;
  const extra = OPENED.get(name) ?? [];
  if (extra.length === 0) return base;
  return {
    ...base,
    orgs: base.orgs.map((org) => ({
      ...org,
      workspaces: [
        ...org.workspaces,
        ...extra
          .filter((w) => w.org_id === org.org_id)
          .map((w) => ({
            workspace_id: w.workspace_id,
            name: w.name,
            access: "admin" as GrantLevel,
          })),
      ],
    })),
  };
}

export const tenancyRoutes: MemoryRoute[] = [
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
    return persona.members satisfies Member[];
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
