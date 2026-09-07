import { AppError } from "@/lib/kernel";
import type { MemoryRoute } from "@/lib/http";
import { isTargetable } from "@/lib/kernel";
import type {
  Asset, Attribution, Canvas, ClaimState, Claimant, Entity, Fragment,
  FragmentKind,
} from "@/lib/services/entities";
import { CHECKS } from "./work";

/* ─── `entities` is SERVED as of 2026-09-07 — `decisions/0036`. ────────────
   These routes exist for a fixture persona, which has no account on the real
   server, and they reproduce the live contract rather than proposing one.

   The SEED below is not the wire. It is a compact literal a person can read and
   edit, and the routes project it into the response shapes — which is what lets
   three demonstration graphs be written by hand without hand-writing a uuid and
   a judgement block per node.

   Two things the seed used to carry are gone, and their absence is the point.
   The root's `framing`, `blurb` and `caution` were an author's prose rendered as
   though a system had measured it, and the server says none of them. And there
   are NO DERIVATION EDGES: `0003` forbids emitting one that cannot be sourced,
   so the first arrives with an invocation and an artifact in hand — a fixture
   that draws them today would be demonstrating a capability nothing has.      */

type SeedNode = {
  id: string;
  kind: FragmentKind;
  label: string;
  observations: number;
  last_seen: string;
  /** Set when this fragment is ALSO assembled as an entity, and so has a canvas
   *  of its own. The wire does not carry it; the switcher does. */
  entity_id?: string;
};

type SeedEdge = {
  from: string;
  to: string;
  claimant: Claimant;
  confidence?: number;
  actor?: string;
  state: ClaimState;
  basis: string;
};

type Seed = {
  root: { id: string; kind: FragmentKind; label: string; target_id?: string };
  /** Much larger than what is drawn by hand. The only way to know whether a
   *  canvas survives sixty-three nodes is to have sixty-three. */
  total: number;
  nodes: SeedNode[];
  edges: SeedEdge[];
};

const GRAPHS: Record<string, Seed> = {
  org: {
    // A target's ROOT — an org somebody opened an engagement against. The
    // other two are entities assembled from fragments and are nobody's target,
    // which is what `target_id` being absent means.
    root: {
      id: "n0", kind: "org", label: "Northbeam Ltd",
      target_id: "01a07bd0-700a-7000-9000-000000000001",
    },
    total: 63,
    nodes: [
      { id: "n1", kind: "asn", label: "AS64511", observations: 6, last_seen: "3 d ago" },
      { id: "n2", kind: "cert", label: "*.northbeam.example", observations: 4, last_seen: "8 min ago" },
      { id: "n3", kind: "cidr", label: "198.51.100.0/24", observations: 5, last_seen: "2 Apr" },
      { id: "n4", kind: "host", label: "assets.northbeam.example", observations: 9, last_seen: "22 h ago" },
      { id: "n5", kind: "whois", label: "Northbeam Ltd, Bristol", observations: 3, last_seen: "3 d ago" },
      { id: "n6", kind: "ip", label: "198.51.100.12", observations: 4, last_seen: "22 h ago" },
      { id: "n7", kind: "host", label: "northbeam-cdn.example", observations: 2, last_seen: "8 min ago" },
      { id: "n8", kind: "person", label: "J. Okonkwo", observations: 4, last_seen: "3 Sep", entity_id: "p0" },
      { id: "n9", kind: "repo", label: "github.com/northbeam/edge", observations: 3, last_seen: "3 Sep" },
      { id: "n10", kind: "account", label: "@northbeam_ops", observations: 1, last_seen: "3 Sep" },
      { id: "n11", kind: "host", label: "legacy.northbeam.example", observations: 5, last_seen: "8 min ago" },
      { id: "n12", kind: "email", label: "ops@northbeam.example", observations: 2, last_seen: "3 d ago" },
      { id: "n13", kind: "key", label: "ssh-ed25519 AAAAC3…", observations: 2, last_seen: "3 Sep" },
    ],
    edges: [
      {
        from: "n0", to: "n1", claimant: "human", actor: "sj@31m.example", state: "accepted",
        basis:
          "acquisition announcement 2024-11-03, confirmed in the engagement brief",
      },
      {
        from: "n0", to: "n2", claimant: "rule", state: "accepted",
        basis:
          "scope rule r4 · *.northbeam.example",
      },
      {
        from: "n0", to: "n3", claimant: "rule", state: "accepted",
        basis:
          "scope rule r2 · declared range",
      },
      {
        from: "n0", to: "n4", claimant: "rule", state: "accepted",
        basis:
          "scope rule r4 · *.northbeam.example",
      },
      {
        from: "n0", to: "n5", claimant: "rule", state: "accepted",
        basis:
          "registrant string matched the org name exactly",
      },
      {
        from: "n0", to: "n6", claimant: "rule", state: "accepted",
        basis:
          "inside the declared range r2",
      },
      {
        from: "n0", to: "n7", claimant: "model", confidence: 0.71, state: "proposed",
        basis:
          "TLS SAN shares *.northbeam.example with an asset in AS64511, acquired 2024-11-03",
      },
      {
        from: "n0", to: "n8", claimant: "model", confidence: 0.58, state: "proposed",
        basis:
          "commit author address on the repository below carries the org domain",
      },
      {
        from: "n0", to: "n9", claimant: "model", confidence: 0.66, state: "proposed",
        basis:
          "deploy-key fingerprint matches the host key on assets.northbeam.example",
      },
      {
        from: "n0", to: "n10", claimant: "model", confidence: 0.41, state: "proposed",
        basis:
          "handle contains the org token; nothing else corroborates it",
      },
      {
        from: "n0", to: "n11", claimant: "rule", state: "accepted",
        basis:
          "scope rule r4 · *.northbeam.example",
      },
      {
        from: "n0", to: "n12", claimant: "rule", state: "accepted",
        basis:
          "appears in the whois technical contact",
      },
      {
        from: "n0", to: "n13", claimant: "model", confidence: 0.52, state: "proposed",
        basis:
          "host key on assets.northbeam.example, also a deploy key on the repository",
      },
    ],
  },
  person: {
    root: {
      id: "p0", kind: "person", label: "J. Okonkwo",
    },
    total: 29,
    nodes: [
      { id: "p1", kind: "email", label: "j.okonkwo@northbeam.example", observations: 3, last_seen: "3 Sep" },
      { id: "p2", kind: "account", label: "github.com/jokonkwo", observations: 4, last_seen: "3 Sep" },
      { id: "p3", kind: "org", label: "Northbeam Ltd", observations: 13, last_seen: "2 Apr", entity_id: "n0" },
      { id: "p4", kind: "key", label: "ssh-ed25519 AAAAC3…", observations: 2, last_seen: "3 Sep" },
      { id: "p5", kind: "account", label: "@jideok", observations: 1, last_seen: "3 Sep" },
      { id: "p6", kind: "document", label: "BSides Bristol '25 bio", observations: 2, last_seen: "1 Sep" },
      { id: "p7", kind: "email", label: "jide@personal.example", observations: 1, last_seen: "1 Sep" },
      { id: "p8", kind: "host", label: "jideok.example", observations: 2, last_seen: "1 Sep" },
      { id: "p9", kind: "account", label: "linkedin.com/in/jokonkwo", observations: 0, last_seen: "28 Aug" },
      { id: "p10", kind: "repo", label: "github.com/northbeam/edge", observations: 3, last_seen: "3 Sep" },
    ],
    edges: [
      {
        from: "p0", to: "p1", claimant: "rule", state: "accepted",
        basis:
          "author field on 41 public commits, unchanged across three years",
      },
      {
        from: "p0", to: "p2", claimant: "rule", state: "accepted",
        basis:
          "the account that authored the commits carrying the address",
      },
      {
        from: "p0", to: "p3", claimant: "human", actor: "sj@31m.example", state: "accepted",
        basis:
          "named as employer in the engagement brief",
      },
      {
        from: "p0", to: "p4", claimant: "model", confidence: 0.83, state: "proposed",
        basis:
          "deploy key on a repository this account administers",
      },
      {
        from: "p0", to: "p5", claimant: "model", confidence: 0.52, state: "proposed",
        basis:
          "display name and avatar hash match; no shared identifier",
      },
      {
        from: "p0", to: "p6", claimant: "model", confidence: 0.61, state: "proposed",
        basis:
          "speaker biography names both the person and the employer",
      },
      {
        from: "p0", to: "p7", claimant: "model", confidence: 0.38, state: "proposed",
        basis:
          "same local-part shape on an unrelated domain — weak, and shown as weak",
      },
      {
        from: "p0", to: "p8", claimant: "model", confidence: 0.44, state: "proposed",
        basis:
          "personal site linking to the account with rel=me",
      },
      {
        from: "p0", to: "p9", claimant: "model", confidence: 0.29, actor: "sj@31m.example", state: "rejected",
        basis:
          "a different J. Okonkwo, in a different country. Rejected, and kept so it is not proposed again",
      },
      {
        from: "p0", to: "p10", claimant: "rule", state: "accepted",
        basis:
          "administered by the account above",
      },
    ],
  },
  cert: {
    root: {
      id: "c0", kind: "cert", label: "*.northbeam.example",
    },
    total: 19,
    nodes: [
      { id: "c1", kind: "host", label: "assets.northbeam.example", observations: 9, last_seen: "22 h ago" },
      { id: "c2", kind: "host", label: "legacy.northbeam.example", observations: 5, last_seen: "8 min ago" },
      { id: "c3", kind: "host", label: "northbeam-cdn.example", observations: 2, last_seen: "8 min ago" },
      { id: "c4", kind: "host", label: "shop.northbeam.example", observations: 2, last_seen: "8 min ago" },
      { id: "c5", kind: "ip", label: "198.51.100.12", observations: 4, last_seen: "22 h ago" },
      { id: "c6", kind: "ip", label: "203.0.113.200", observations: 2, last_seen: "8 min ago" },
      { id: "c7", kind: "cidr", label: "203.0.113.0/24 · Hostwell", observations: 1, last_seen: "8 min ago" },
      { id: "c8", kind: "cidr", label: "198.51.100.0/24", observations: 5, last_seen: "2 Apr" },
      { id: "c9", kind: "key", label: "RSA-2048 e5:9c:…", observations: 1, last_seen: "8 min ago" },
      { id: "c10", kind: "org", label: "Northbeam Ltd", observations: 13, last_seen: "8 min ago", entity_id: "n0" },
    ],
    edges: [
      {
        from: "c0", to: "c1", claimant: "rule", state: "accepted",
        basis:
          "SAN entry, and inside the declared range",
      },
      {
        from: "c0", to: "c2", claimant: "rule", state: "accepted",
        basis:
          "SAN entry, and inside the declared range",
      },
      {
        from: "c0", to: "c3", claimant: "model", confidence: 0.71, state: "proposed",
        basis:
          "SAN entry. The certificate is theirs; whether the host is, is a separate question",
      },
      {
        from: "c0", to: "c4", claimant: "model", confidence: 0.34, state: "proposed",
        basis:
          "SAN entry, but it resolves into a hosting provider's range — shared certificate, not shared owner",
      },
      {
        from: "c0", to: "c5", claimant: "rule", state: "accepted",
        basis:
          "PTR of an accepted host, inside the declared range",
      },
      {
        from: "c0", to: "c6", claimant: "model", confidence: 0.21, state: "proposed",
        basis:
          "PTR of shop.northbeam.example — the address belongs to the provider",
      },
      {
        from: "c0", to: "c7", claimant: "model", confidence: 0.18, actor: "sj@31m.example", state: "rejected",
        basis:
          "a hosting provider's range. Rejected — a shared provider is not a shared owner, and this is the mistake the certificate invites",
      },
      {
        from: "c0", to: "c8", claimant: "rule", state: "accepted",
        basis:
          "the declared range r2",
      },
      {
        from: "c0", to: "c9", claimant: "rule", state: "accepted",
        basis:
          "the certificate's public key",
      },
      {
        from: "c0", to: "c10", claimant: "rule", state: "accepted",
        basis:
          "certificate subject organisation",
      },
    ],
  },
};

/** The rest of the fragments, generated rather than written out. */
const FILLERS: Record<string, { kinds: FragmentKind[]; make: (i: number) => string }> = {
  org: {
    kinds: ["host", "host", "ip", "email", "cert", "account", "host"],
    make: (i) => `${["edge", "api", "cdn", "mail", "dev", "git", "ops", "www", "node", "db"][i % 10]}-${String(i).padStart(3, "0")}.northbeam.example`,
  },
  person: {
    kinds: ["account", "email", "document", "host", "key"],
    make: (i) => `j.okonkwo+${i}@northbeam.example`,
  },
  cert: {
    kinds: ["host", "ip"],
    make: (i) => `${["shop", "cdn", "img", "static", "edge"][i % 5]}-${i}.northbeam.example`,
  },
};

/** Deterministic, so "load all" twice draws the same canvas twice. */
function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fill(key: string, seed: Seed, upTo: number): Seed & { truncated: boolean } {
  const filler = FILLERS[key];
  const nodes = [...seed.nodes];
  const edges = [...seed.edges];
  const random = mulberry(key.length * 7919 + seed.total);

  for (let i = 0; nodes.length < Math.min(upTo, seed.total); i++) {
    const kind = filler.kinds[i % filler.kinds.length];
    const proposed = random() < 0.34;
    const id = `f${i}`;
    nodes.push({ id, kind, label: filler.make(i), observations: 1, last_seen: "8 min ago" });
    edges.push({
      from: seed.root.id,
      to: id,
      claimant: proposed ? "model" : "rule",
      ...(proposed ? { confidence: Math.round((0.3 + random() * 0.6) * 100) / 100 } : {}),
      state: proposed ? "proposed" : "accepted",
      basis: proposed
        ? "one source, and nothing corroborates it"
        : "matches a declared scope rule",
    });
  }

  return { ...seed, nodes, edges, truncated: nodes.length < seed.total };
}

const notFound = (what: string) =>
  new AppError({ kind: "not_found", message: `No ${what} with that identifier.`, status: 404 });

/** A seed id becomes a uuid-shaped one, deterministically.
 *
 *  The seed's `n4` is readable and the wire's is not, and both matter: a person
 *  editing this file wants `n4`, and a screen must not learn to accept ids the
 *  real server would never mint. One function, so an edge and a node agree. */
const wireId = (seed: string): string =>
  `01a07be0-${seed.length.toString(16).padStart(4, "0")}-7000-9000-${seed
    .split("")
    .reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 2166136261)
    .toString(16)
    .padStart(12, "0")
    .slice(-12)}`;

/** Nobody has ruled. `by`, `at` and `reason` are ABSENT rather than empty —
 *  there is nobody and no time to name. */
const UNOPENED = { state: "unopened" } as const;

const asEntity = (seed: Seed): Entity => ({
  entity_id: wireId(seed.root.id),
  kind: seed.root.kind,
  label: seed.root.label,
  target_id: seed.root.target_id,
  judgement: UNOPENED,
});

function asAttribution(rootId: string, edge: SeedEdge): Attribution {
  const decided = edge.state !== "proposed";
  return {
    attribution_id: wireId(`${edge.from}->${edge.to}`),
    entity_id: wireId(rootId),
    fragment_id: wireId(edge.to),
    // NEVER rewritten by a decision — who proposed it stays who proposed it.
    claimant: edge.claimant,
    // ABSENT unless the claimant is a MODEL. A rule's assignment is a category,
    // not a probability, and a 1.0 here would destroy the distinction.
    confidence: edge.claimant === "model" ? edge.confidence : undefined,
    basis: edge.basis,
    state: edge.state,
    decided_at: decided ? "2026-09-06T19:41:02Z" : undefined,
    /* ABSENT when a RULE decided. `0036` amends `0008` to *a PERSON deciding
       writes decided_by* — so an accepted claim with no decider is not a
       missing field, it is "no person ruled on this". */
    decided_by: decided && edge.actor ? edge.actor : undefined,
  };
}

export const entityRoutes: MemoryRoute[] = [
  (req) => {
    const m = /^\/workspaces\/([^/]+)\/entities$/.exec(req.path);
    if (!(req.method === "GET" && m)) return undefined;
    return Object.values(GRAPHS).map(asEntity);
  },

  (req) => {
    const m = /^\/workspaces\/([^/]+)\/entities\/([^/]+)$/.exec(req.path);
    if (!(req.method === "GET" && m)) return undefined;
    const wanted = decodeURIComponent(m[2]);
    const key = Object.keys(GRAPHS).find((k) => wireId(GRAPHS[k].root.id) === wanted);
    if (!key) throw notFound("entity");
    const seed = GRAPHS[key];

    // The default neighbourhood is what was written by hand; the fillers exist
    // to answer a bigger `limit`, never to pad the first view.
    const asked = Number(req.params.limit ?? seed.nodes.length) || seed.nodes.length;
    const filled = fill(key, seed, asked);
    const state = req.params.state as ClaimState | undefined;

    const claims = new Map(filled.edges.map((e) => [e.to, e]));
    const nodes = filled.nodes.flatMap((n) => {
      const edge = claims.get(n.id);
      if (!edge) return [];
      if (state && edge.state !== state) return [];
      return [{
        fragment_id: wireId(n.id),
        kind: n.kind,
        value: n.label,
        // Everything here was read out of an artifact except the one written
        // into a scope rule by hand — `manual`, and its dates are ABSENT
        // because nothing has seen it.
        origin: n.kind === "cidr" ? ("manual" as const) : ("observed" as const),
        first_seen: n.kind === "cidr" ? undefined : "2026-08-19T10:11:00Z",
        last_seen: n.kind === "cidr" ? undefined : "2026-09-06T22:04:23Z",
        observations: n.observations,
        judgement: UNOPENED,
        // Absent on all but one: nobody has LOOKED, which is a different fact
        // from nobody having ruled — `decisions/0037`.
        read_at: n.id === "n4" ? "2026-09-06T09:12:00Z" : undefined,
        read_by: n.id === "n4" ? "sj@31m.example" : undefined,
        edge: asAttribution(seed.root.id, edge),
      }];
    });

    const canvas: Canvas = { root: asEntity(seed), nodes, truncated: filled.truncated };
    return canvas;
  },
];

/** Every fragment of every graph, flattened. `GET /fragments` is EVERYTHING a
 *  source produced, asset or not — the difference between this and the asset
 *  list is the whole of `decisions/0009`. */
function allFragments(): (Fragment & { seedId: string; rootId: string; edge: SeedEdge })[] {
  return Object.values(GRAPHS).flatMap((seed) => {
    const claims = new Map(seed.edges.map((e) => [e.to, e]));
    return seed.nodes.flatMap((n) => {
      const edge = claims.get(n.id);
      if (!edge) return [];
      return [{
        fragment_id: wireId(n.id),
        seedId: n.id,
        rootId: seed.root.id,
        kind: n.kind,
        value: n.label,
        origin: n.kind === "cidr" ? ("manual" as const) : ("observed" as const),
        first_seen: n.kind === "cidr" ? undefined : "2026-08-19T10:11:00Z",
        last_seen: n.kind === "cidr" ? undefined : "2026-09-06T22:04:23Z",
        observations: n.observations,
        judgement: JUDGED.get(n.id) ?? UNOPENED,
        read_at: READ.has(n.id) ? "2026-09-06T09:12:00Z" : undefined,
        read_by: READ.has(n.id) ? "sj@31m.example" : undefined,
        edge,
      }];
    });
  });
}

/* Mutable, because the drawer writes to them. A judgement and a READ are two
   separate stores for the same reason they are two endpoints: a person can read
   a thing and decline to rule on it. */
const JUDGED = new Map<string, Fragment["judgement"]>();
const READ = new Set<string>(["n4"]);

const seedOf = (fragmentId: string): string | undefined =>
  allFragments().find((f) => f.fragment_id === fragmentId)?.seedId;

export const graphRoutes: MemoryRoute[] = [
  /** The VIEW. An ACCEPTED attribution to the target's root AND a targetable
   *  kind — both conditions, because either alone is a different list. */
  (req) => {
    const m = /^\/workspaces\/([^/]+)\/assets$/.exec(req.path);
    if (!(req.method === "GET" && m)) return undefined;
    const rooted = GRAPHS.org;
    return allFragments().flatMap((f): Asset[] => {
      if (f.rootId !== rooted.root.id) return [];
      if (f.edge.state !== "accepted") return [];
      if (!isTargetable(f.kind)) return [];
      const { seedId: _s, rootId: _r, edge, ...fragment } = f;
      return [{
        ...fragment,
        attribution_id: wireId(`${edge.from}->${edge.to}`),
        claimant: edge.claimant,
        basis: edge.basis,
        root_entity_id: wireId(rooted.root.id),
        target_id: rooted.root.target_id!,
      }];
    });
  },

  (req) => {
    const m = /^\/workspaces\/([^/]+)\/fragments$/.exec(req.path);
    if (!(req.method === "GET" && m)) return undefined;
    const kind = req.params.kind as string | undefined;
    return allFragments()
      .filter((f) => !kind || f.kind === kind)
      .map(({ seedId: _s, rootId: _r, edge: _e, ...fragment }) => fragment);
  },

  (req) => {
    const m = /^\/workspaces\/([^/]+)\/fragments\/([^/]+)\/read$/.exec(req.path);
    if (!(req.method === "PUT" && m)) return undefined;
    const seed = seedOf(decodeURIComponent(m[2]));
    if (!seed) throw notFound("fragment");
    READ.add(seed);
    return allFragments().find((f) => f.seedId === seed);
  },

  (req) => {
    const m = /^\/workspaces\/([^/]+)\/fragments\/([^/]+)\/judgement$/.exec(req.path);
    if (!(req.method === "PUT" && m)) return undefined;
    const seed = seedOf(decodeURIComponent(m[2]));
    if (!seed) throw notFound("fragment");
    const body = (req.body ?? {}) as { state?: string; reason?: string };
    /* The server's own refusal, verbatim. A dismissal with no reason is the
       thing this sentence exists to prevent, and replacing it with a generic
       required-field message would throw away the argument. */
    if (body.state === "dismissed" && !body.reason?.trim())
      throw new AppError({
        kind: "invalid",
        status: 400,
        message:
          "dismissing needs a reason — a dismissal with no reason reads as `never looked at` in six months",
      });
    JUDGED.set(seed, {
      state: (body.state ?? "unopened") as Fragment["judgement"]["state"],
      by: "sj@31m.example",
      at: "2026-09-07T10:00:00Z",
      reason: body.reason || undefined,
    });
    return allFragments().find((f) => f.seedId === seed);
  },

  (req) => {
    const m = /^\/workspaces\/([^/]+)\/attributions\/([^/]+)$/.exec(req.path);
    if (!(req.method === "PUT" && m)) return undefined;
    const wanted = decodeURIComponent(m[2]);
    for (const seed of Object.values(GRAPHS))
      for (const edge of seed.edges)
        if (wireId(`${edge.from}->${edge.to}`) === wanted) {
          const body = (req.body ?? {}) as { state?: ClaimState; note?: string };
          // NEVER rewrites the claimant — `decisions/0008`'s title. The decision
          // is a separate set of fields beside it.
          edge.state = body.state ?? edge.state;
          edge.actor = "sj@31m.example";
          return asAttribution(seed.root.id, edge);
        }
    throw notFound("attribution");
  },

  /** COVERAGE — `0011` and `0037`. The two deficits are TWO NUMBERS and are
   *  never summed: never and stale are different failures. There is no
   *  percentage on the wire, because a `0/0` rounded to `0%` is exactly the
   *  zero nothing computed that §Scope refuses. */
  (req) => {
    const m = /^\/workspaces\/([^/]+)\/coverage$/.exec(req.path);
    if (!(req.method === "GET" && m)) return undefined;
    const rooted = GRAPHS.org;
    const assets = allFragments().filter(
      (f) => f.rootId === rooted.root.id && f.edge.state === "accepted" && isTargetable(f.kind),
    );
    let fresh = 0, stale = 0, never = 0;
    const rows = assets.map((a, i) => {
      /* RAGGED. A check produces a cell only where its `applies_to` covers this
         kind — an ASN has no TLS, so there is NO SQUARE rather than a dashed
         one, and right-padding the row would re-introduce the bug `0011` exists
         to remove. */
      const cells = CHECKS.filter((c) => (c.applies_to as readonly string[]).includes(a.kind)).map(
        (c, j) => {
          const state = (i + j) % 5 === 0 ? "never" : (i + j) % 3 === 0 ? "stale" : "fresh";
          if (state === "fresh") fresh += 1;
          else if (state === "stale") stale += 1;
          else never += 1;
          return {
            check_id: c.check_id,
            check_name: c.name,
            state,
            // Absent when never. For the human check it is when somebody READ
            // it, which is not when they ruled on it.
            at: state === "never" ? undefined : "2026-09-06T22:04:23Z",
          };
        },
      );
      return { fragment_id: a.fragment_id, kind: a.kind, value: a.value, cells };
    });
    return {
      assets: assets.length,
      pairs: fresh + stale + never,
      fresh,
      stale,
      never,
      rows,
    };
  },
];
