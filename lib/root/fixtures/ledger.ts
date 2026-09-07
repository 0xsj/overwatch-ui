import { AppError } from "@/lib/kernel";
import { bearerOf, type MemoryRoute } from "@/lib/http";
import type { AuditEntry, AuditPage, ChainStep } from "@/lib/services/ledger";
import { PERSONAS, personaFromToken, type PersonaName } from "./personas";

/** The registration chain, which is what a fresh account's ledger actually
 *  contains — three steps across three domains joined by one correlation id,
 *  because `decisions/0017` made registration a chain rather than a
 *  transaction. Shaped from the live server's own response on 2026-09-07.
 *
 *  `actor` is `anonymous` on the first two because the request that caused them
 *  arrived unauthenticated. That is not a gap in the fixture. */
const CHAIN = "01a07b46-e6c4-7000-81d2-000000000001";

function entriesFor(name: PersonaName): AuditEntry[] {
  const p = PERSONAS[name];
  const account = p.me.account_id;
  const org = p.me.orgs[0];

  return [
    {
      id: `${CHAIN}-3`,
      scope: "account",
      action: "identity.session.started",
      subject: `account:${account}`,
      actor: `user:${account}`,
      correlation_id: `${CHAIN}-s`,
      detail: { account_id: account },
      occurred_at: "2026-09-07T09:12:04.221000Z",
    },
    {
      id: `${CHAIN}-2`,
      scope: "workspace",
      action: "workspace.created",
      subject: `workspace:${org.workspaces[0].workspace_id}`,
      actor: "anonymous",
      correlation_id: CHAIN,
      detail: { name: org.workspaces[0].name },
      occurred_at: "2026-08-18T09:20:38.882000Z",
    },
    {
      id: `${CHAIN}-1`,
      scope: "account",
      action: "org.created",
      subject: `org:${org.org_id}`,
      actor: "anonymous",
      correlation_id: CHAIN,
      detail: { name: org.name },
      occurred_at: "2026-08-18T09:20:38.611000Z",
    },
    {
      id: `${CHAIN}-0`,
      scope: "account",
      action: "identity.account.created",
      subject: `account:${account}`,
      actor: "anonymous",
      correlation_id: CHAIN,
      detail: { email: p.me.email },
      occurred_at: "2026-08-18T09:20:38.485000Z",
    },
  ];
}

const CHAIN_STEPS = (name: PersonaName): ChainStep[] => {
  const p = PERSONAS[name];
  const org = p.me.orgs[0];
  return [
    {
      action: "identity.account.created",
      subject: `account:${p.me.account_id}`,
      depth: 0,
      // A choice somebody made, as opposed to work the machinery did.
      decision: true,
      actor: "anonymous",
      occurred_at: "2026-08-18T09:20:38.485000Z",
    },
    {
      action: "org.created",
      subject: `org:${org.org_id}`,
      depth: 1,
      decision: false,
      actor: "anonymous",
      occurred_at: "2026-08-18T09:20:38.611000Z",
    },
    {
      action: "workspace.created",
      subject: `workspace:${org.workspaces[0].workspace_id}`,
      depth: 2,
      decision: false,
      actor: "anonymous",
      occurred_at: "2026-08-18T09:20:38.882000Z",
    },
  ];
};

const unauthenticated = () =>
  new AppError({ kind: "unauthenticated", message: "not signed in", status: 401 });

/** No `next`, because there is nothing beyond one page here — and `next`
 *  ABSENT is exactly how a caller learns that. A fixture that always sent a
 *  cursor would make "load more" unreachable to test and always drawn.
 *
 *  `facets` counts the WHOLE set and ignores the filter, which is the rule that
 *  is easy to get wrong and impossible to notice: counting the filtered set
 *  shows every other facet as zero, and a reader who filtered into one can no
 *  longer get out. It is also sent on the first page only — absent once `after`
 *  is supplied — so a caller keeps the ones it has. */
function page(all: AuditEntry[], facet?: string, after?: string): AuditPage {
  const counts = new Map<string, number>();
  for (const e of all) {
    const f = e.action.split(".")[0] ?? e.action;
    counts.set(f, (counts.get(f) ?? 0) + 1);
  }
  const entries = facet ? all.filter((e) => e.action.startsWith(`${facet}.`)) : all;
  return {
    entries,
    ...(after ? {} : { facets: [...counts].map(([f, total]) => ({ facet: f, total })) }),
  };
}

export const ledgerRoutes: MemoryRoute[] = [
  (req) => {
    const match = /^\/orgs\/([^/]+)\/audit$/.exec(req.path);
    if (!(req.method === "GET" && match)) return undefined;
    const name = personaFromToken(bearerOf(req));
    if (!name) throw unauthenticated();
    // Org scope ONLY. An entry here can never name a workspace — that
    // constraint is the whole reason a firm-wide log is safe to serve.
    return page(
      entriesFor(name).filter((e) => e.scope !== "workspace"),
      req.params.facet as string | undefined,
      req.params.after as string | undefined,
    );
  },

  (req) => {
    if (!(req.method === "GET" && req.path === "/me/activity")) return undefined;
    const name = personaFromToken(bearerOf(req));
    if (!name) throw unauthenticated();
    return page(entriesFor(name), req.params.facet as string | undefined, req.params.after as string | undefined);
  },

  (req) => {
    const match = /^\/workspaces\/([^/]+)\/audit$/.exec(req.path);
    if (!(req.method === "GET" && match)) return undefined;
    const name = personaFromToken(bearerOf(req));
    if (!name) throw unauthenticated();
    const id = decodeURIComponent(match[1]);
    return page(
      entriesFor(name).filter((e) => e.scope === "workspace" && e.subject.endsWith(id)),
      req.params.facet as string | undefined,
      req.params.after as string | undefined,
    );
  },

  (req) => {
    const match = /^\/chains\/([^/]+)$/.exec(req.path);
    if (!(req.method === "GET" && match)) return undefined;
    const name = personaFromToken(bearerOf(req));
    if (!name) throw unauthenticated();
    return decodeURIComponent(match[1]) === CHAIN ? CHAIN_STEPS(name) : [];
  },
];
