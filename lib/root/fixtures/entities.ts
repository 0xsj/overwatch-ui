import { AppError } from "@/lib/kernel";
import type { MemoryRoute } from "@/lib/http";
import type { EntityGraph, GraphNode, Pin } from "@/lib/services/entities";

type Seed = Omit<EntityGraph, "truncated">;

const GRAPHS: Record<string, Seed> = {
  org: {
    root: {
      id: "n0", kind: "org", label: "Northbeam Ltd",
      framing: "ASM attribution",
      blurb:
        "An acquisition, and the question of which assets came with it. The proposed host is held up by an accepted certificate — that is a derivation edge, and it is the reasoning made visible rather than written in prose.",
      observations: 13, last_seen: "2 Apr", source: "whois · registry",
    },
    total: 63,
    nodes: [
      { id: "n1", kind: "asn", label: "AS64511", observations: 6, last_seen: "3 d ago", source: "whois · art_01JQ70" },
      { id: "n2", kind: "cert", label: "*.northbeam.example", observations: 4, last_seen: "8 min ago", source: "crtsh · art_01JQ8A" },
      { id: "n3", kind: "cidr", label: "198.51.100.0/24", observations: 5, last_seen: "2 Apr", source: "whois · art_01JQ70" },
      { id: "n4", kind: "host", label: "assets.northbeam.example", observations: 9, last_seen: "22 h ago", source: "httpx · art_01JQ71" },
      { id: "n5", kind: "whois", label: "Northbeam Ltd, Bristol", observations: 3, last_seen: "3 d ago", source: "whois · art_01JQ70" },
      { id: "n6", kind: "ip", label: "198.51.100.12", observations: 4, last_seen: "22 h ago", source: "dnsx · art_01JQ8D" },
      { id: "n7", kind: "host", label: "northbeam-cdn.example", observations: 2, last_seen: "8 min ago", source: "crtsh · art_01JQ8A" },
      { id: "n8", kind: "person", label: "J. Okonkwo", observations: 4, last_seen: "3 Sep", source: "github · art_01JQ6C", entity_id: "p0" },
      { id: "n9", kind: "repo", label: "github.com/northbeam/edge", observations: 3, last_seen: "3 Sep", source: "github · art_01JQ6C" },
      { id: "n10", kind: "account", label: "@northbeam_ops", observations: 1, last_seen: "3 Sep", source: "manual · none" },
      { id: "n11", kind: "host", label: "legacy.northbeam.example", observations: 5, last_seen: "8 min ago", source: "crtsh · art_01JQ8A" },
      { id: "n12", kind: "email", label: "ops@northbeam.example", observations: 2, last_seen: "3 d ago", source: "whois · art_01JQ70" },
      { id: "n13", kind: "key", label: "ssh-ed25519 AAAAC3…", observations: 2, last_seen: "3 Sep", source: "ssh-banner · art_01JQ6D" },
    ],
    edges: [
      {
        kind: "attribution", from: "n0", to: "n1", claimant: "human", actor: "sj@31m.example", state: "accepted",
        basis:
          "acquisition announcement 2024-11-03, confirmed in the engagement brief",
      },
      {
        kind: "attribution", from: "n0", to: "n2", claimant: "rule", state: "accepted",
        basis:
          "scope rule r4 · *.northbeam.example",
      },
      {
        kind: "attribution", from: "n0", to: "n3", claimant: "rule", state: "accepted",
        basis:
          "scope rule r2 · declared range",
      },
      {
        kind: "attribution", from: "n0", to: "n4", claimant: "rule", state: "accepted",
        basis:
          "scope rule r4 · *.northbeam.example",
      },
      {
        kind: "attribution", from: "n0", to: "n5", claimant: "rule", state: "accepted",
        basis:
          "registrant string matched the org name exactly",
      },
      {
        kind: "attribution", from: "n0", to: "n6", claimant: "rule", state: "accepted",
        basis:
          "inside the declared range r2",
      },
      {
        kind: "attribution", from: "n0", to: "n7", claimant: "model", confidence: 0.71, state: "proposed",
        basis:
          "TLS SAN shares *.northbeam.example with an asset in AS64511, acquired 2024-11-03",
      },
      {
        kind: "attribution", from: "n0", to: "n8", claimant: "model", confidence: 0.58, state: "proposed",
        basis:
          "commit author address on the repository below carries the org domain",
      },
      {
        kind: "attribution", from: "n0", to: "n9", claimant: "model", confidence: 0.66, state: "proposed",
        basis:
          "deploy-key fingerprint matches the host key on assets.northbeam.example",
      },
      {
        kind: "attribution", from: "n0", to: "n10", claimant: "model", confidence: 0.41, state: "proposed",
        basis:
          "handle contains the org token; nothing else corroborates it",
      },
      {
        kind: "attribution", from: "n0", to: "n11", claimant: "rule", state: "accepted",
        basis:
          "scope rule r4 · *.northbeam.example",
      },
      {
        kind: "attribution", from: "n0", to: "n12", claimant: "rule", state: "accepted",
        basis:
          "appears in the whois technical contact",
      },
      {
        kind: "attribution", from: "n0", to: "n13", claimant: "model", confidence: 0.52, state: "proposed",
        basis:
          "host key on assets.northbeam.example, also a deploy key on the repository",
      },
      { kind: "derivation", from: "n5", to: "n1", label: "registrant of", invocation_id: "inv_01JQ70", artifact_id: "art_01JQ70" },
      { kind: "derivation", from: "n1", to: "n3", label: "announces", invocation_id: "inv_01JQ70", artifact_id: "art_01JQ70" },
      { kind: "derivation", from: "n3", to: "n6", label: "contains", invocation_id: "inv_01JQ8D", artifact_id: "art_01JQ8D" },
      { kind: "derivation", from: "n6", to: "n4", label: "PTR", invocation_id: "inv_01JQ8D", artifact_id: "art_01JQ8D" },
      { kind: "derivation", from: "n2", to: "n7", label: "SAN entry", invocation_id: "inv_01JQ8A", artifact_id: "art_01JQ8A" },
      { kind: "derivation", from: "n2", to: "n11", label: "SAN entry", invocation_id: "inv_01JQ8A", artifact_id: "art_01JQ8A" },
      { kind: "derivation", from: "n9", to: "n12", label: "commit author", invocation_id: "inv_01JQ6C", artifact_id: "art_01JQ6C" },
      { kind: "derivation", from: "n9", to: "n13", label: "deploy key", invocation_id: "inv_01JQ6C", artifact_id: "art_01JQ6C" },
      { kind: "derivation", from: "n4", to: "n13", label: "host key", invocation_id: "inv_01JQ6D", artifact_id: "art_01JQ6D" },
      { kind: "derivation", from: "n12", to: "n8", label: "author identity", invocation_id: "inv_01JQ6C", artifact_id: "art_01JQ6C" },
    ],
  },
  person: {
    root: {
      id: "p0", kind: "person", label: "J. Okonkwo",
      framing: "entity mapper · the investigator's use",
      blurb:
        "A different shape entirely: mostly proposed, mostly low confidence, and that is honest. Identity across sources is the hardest problem here and the one PRODUCT.md calls unsolved — a canvas that showed these as settled would be lying about the state of the art.",
      caution:
        "This is the investigator framing — PRODUCT.md's second go-to-market, not the first thing shipped. It is drawn here because the machinery is the same, not because it is next.",
      observations: 4, last_seen: "14 Aug", source: "assembled · 4 sources",
    },
    total: 29,
    nodes: [
      { id: "p1", kind: "email", label: "j.okonkwo@northbeam.example", observations: 3, last_seen: "3 Sep", source: "github · art_01JQ6C" },
      { id: "p2", kind: "account", label: "github.com/jokonkwo", observations: 4, last_seen: "3 Sep", source: "github · art_01JQ6C" },
      { id: "p3", kind: "org", label: "Northbeam Ltd", observations: 13, last_seen: "2 Apr", source: "brief · none", entity_id: "n0" },
      { id: "p4", kind: "key", label: "ssh-ed25519 AAAAC3…", observations: 2, last_seen: "3 Sep", source: "github · art_01JQ6C" },
      { id: "p5", kind: "account", label: "@jideok", observations: 1, last_seen: "3 Sep", source: "manual · none" },
      { id: "p6", kind: "document", label: "BSides Bristol '25 bio", observations: 2, last_seen: "1 Sep", source: "fetch · art_01JQ5A" },
      { id: "p7", kind: "email", label: "jide@personal.example", observations: 1, last_seen: "1 Sep", source: "manual · none" },
      { id: "p8", kind: "host", label: "jideok.example", observations: 2, last_seen: "1 Sep", source: "httpx · art_01JQ5B" },
      { id: "p9", kind: "account", label: "linkedin.com/in/jokonkwo", observations: 0, last_seen: "28 Aug", source: "manual · none" },
      { id: "p10", kind: "repo", label: "github.com/northbeam/edge", observations: 3, last_seen: "3 Sep", source: "github · art_01JQ6C" },
    ],
    edges: [
      {
        kind: "attribution", from: "p0", to: "p1", claimant: "rule", state: "accepted",
        basis:
          "author field on 41 public commits, unchanged across three years",
      },
      {
        kind: "attribution", from: "p0", to: "p2", claimant: "rule", state: "accepted",
        basis:
          "the account that authored the commits carrying the address",
      },
      {
        kind: "attribution", from: "p0", to: "p3", claimant: "human", actor: "sj@31m.example", state: "accepted",
        basis:
          "named as employer in the engagement brief",
      },
      {
        kind: "attribution", from: "p0", to: "p4", claimant: "model", confidence: 0.83, state: "proposed",
        basis:
          "deploy key on a repository this account administers",
      },
      {
        kind: "attribution", from: "p0", to: "p5", claimant: "model", confidence: 0.52, state: "proposed",
        basis:
          "display name and avatar hash match; no shared identifier",
      },
      {
        kind: "attribution", from: "p0", to: "p6", claimant: "model", confidence: 0.61, state: "proposed",
        basis:
          "speaker biography names both the person and the employer",
      },
      {
        kind: "attribution", from: "p0", to: "p7", claimant: "model", confidence: 0.38, state: "proposed",
        basis:
          "same local-part shape on an unrelated domain — weak, and shown as weak",
      },
      {
        kind: "attribution", from: "p0", to: "p8", claimant: "model", confidence: 0.44, state: "proposed",
        basis:
          "personal site linking to the account with rel=me",
      },
      {
        kind: "attribution", from: "p0", to: "p9", claimant: "model", confidence: 0.29, actor: "sj@31m.example", state: "rejected",
        basis:
          "a different J. Okonkwo, in a different country. Rejected, and kept so it is not proposed again",
      },
      {
        kind: "attribution", from: "p0", to: "p10", claimant: "rule", state: "accepted",
        basis:
          "administered by the account above",
      },
      { kind: "derivation", from: "p2", to: "p1", label: "commit author", invocation_id: "inv_01JQ6C", artifact_id: "art_01JQ6C" },
      { kind: "derivation", from: "p2", to: "p10", label: "administers", invocation_id: "inv_01JQ6C", artifact_id: "art_01JQ6C" },
      { kind: "derivation", from: "p10", to: "p4", label: "deploy key", invocation_id: "inv_01JQ6C", artifact_id: "art_01JQ6C" },
      { kind: "derivation", from: "p8", to: "p2", label: "rel=me link", invocation_id: "inv_01JQ5B", artifact_id: "art_01JQ5B" },
      { kind: "derivation", from: "p6", to: "p3", label: "names employer", invocation_id: "inv_01JQ5A", artifact_id: "art_01JQ5A" },
      { kind: "derivation", from: "p1", to: "p3", label: "domain of", invocation_id: "inv_01JQ6C", artifact_id: "art_01JQ6C" },
    ],
  },
  cert: {
    root: {
      id: "c0", kind: "cert", label: "*.northbeam.example",
      framing: "infrastructure pivot",
      blurb:
        "A certificate is the highest-yield pivot in ASM and the easiest to over-read. Every host here was read out of one SAN list — a derivation, not a claim. What the SAN list does NOT establish is ownership, and two of these resolve into a hosting provider's range.",
      observations: 4, last_seen: "8 min ago", source: "crtsh · art_01JQ8A",
    },
    total: 19,
    nodes: [
      { id: "c1", kind: "host", label: "assets.northbeam.example", observations: 9, last_seen: "22 h ago", source: "crtsh · art_01JQ8A" },
      { id: "c2", kind: "host", label: "legacy.northbeam.example", observations: 5, last_seen: "8 min ago", source: "crtsh · art_01JQ8A" },
      { id: "c3", kind: "host", label: "northbeam-cdn.example", observations: 2, last_seen: "8 min ago", source: "crtsh · art_01JQ8A" },
      { id: "c4", kind: "host", label: "shop.northbeam.example", observations: 2, last_seen: "8 min ago", source: "crtsh · art_01JQ8A" },
      { id: "c5", kind: "ip", label: "198.51.100.12", observations: 4, last_seen: "22 h ago", source: "dnsx · art_01JQ8D" },
      { id: "c6", kind: "ip", label: "203.0.113.200", observations: 2, last_seen: "8 min ago", source: "dnsx · art_01JQ8D" },
      { id: "c7", kind: "cidr", label: "203.0.113.0/24 · Hostwell", observations: 1, last_seen: "8 min ago", source: "whois · art_01JQ6E" },
      { id: "c8", kind: "cidr", label: "198.51.100.0/24", observations: 5, last_seen: "2 Apr", source: "whois · art_01JQ70" },
      { id: "c9", kind: "key", label: "RSA-2048 e5:9c:…", observations: 1, last_seen: "8 min ago", source: "crtsh · art_01JQ8A" },
      { id: "c10", kind: "org", label: "Northbeam Ltd", observations: 13, last_seen: "8 min ago", source: "crtsh · art_01JQ8A", entity_id: "n0" },
    ],
    edges: [
      {
        kind: "attribution", from: "c0", to: "c1", claimant: "rule", state: "accepted",
        basis:
          "SAN entry, and inside the declared range",
      },
      {
        kind: "attribution", from: "c0", to: "c2", claimant: "rule", state: "accepted",
        basis:
          "SAN entry, and inside the declared range",
      },
      {
        kind: "attribution", from: "c0", to: "c3", claimant: "model", confidence: 0.71, state: "proposed",
        basis:
          "SAN entry. The certificate is theirs; whether the host is, is a separate question",
      },
      {
        kind: "attribution", from: "c0", to: "c4", claimant: "model", confidence: 0.34, state: "proposed",
        basis:
          "SAN entry, but it resolves into a hosting provider's range — shared certificate, not shared owner",
      },
      {
        kind: "attribution", from: "c0", to: "c5", claimant: "rule", state: "accepted",
        basis:
          "PTR of an accepted host, inside the declared range",
      },
      {
        kind: "attribution", from: "c0", to: "c6", claimant: "model", confidence: 0.21, state: "proposed",
        basis:
          "PTR of shop.northbeam.example — the address belongs to the provider",
      },
      {
        kind: "attribution", from: "c0", to: "c7", claimant: "model", confidence: 0.18, actor: "sj@31m.example", state: "rejected",
        basis:
          "a hosting provider's range. Rejected — a shared provider is not a shared owner, and this is the mistake the certificate invites",
      },
      {
        kind: "attribution", from: "c0", to: "c8", claimant: "rule", state: "accepted",
        basis:
          "the declared range r2",
      },
      {
        kind: "attribution", from: "c0", to: "c9", claimant: "rule", state: "accepted",
        basis:
          "the certificate's public key",
      },
      {
        kind: "attribution", from: "c0", to: "c10", claimant: "rule", state: "accepted",
        basis:
          "certificate subject organisation",
      },
      { kind: "derivation", from: "c0", to: "c1", label: "SAN entry", invocation_id: "inv_01JQ8A", artifact_id: "art_01JQ8A" },
      { kind: "derivation", from: "c0", to: "c2", label: "SAN entry", invocation_id: "inv_01JQ8A", artifact_id: "art_01JQ8A" },
      { kind: "derivation", from: "c0", to: "c3", label: "SAN entry", invocation_id: "inv_01JQ8A", artifact_id: "art_01JQ8A" },
      { kind: "derivation", from: "c0", to: "c4", label: "SAN entry", invocation_id: "inv_01JQ8A", artifact_id: "art_01JQ8A" },
      { kind: "derivation", from: "c0", to: "c9", label: "public key", invocation_id: "inv_01JQ8A", artifact_id: "art_01JQ8A" },
      { kind: "derivation", from: "c0", to: "c10", label: "subject O", invocation_id: "inv_01JQ8A", artifact_id: "art_01JQ8A" },
      { kind: "derivation", from: "c1", to: "c5", label: "resolves to", invocation_id: "inv_01JQ8D", artifact_id: "art_01JQ8D" },
      { kind: "derivation", from: "c4", to: "c6", label: "resolves to", invocation_id: "inv_01JQ8D", artifact_id: "art_01JQ8D" },
      { kind: "derivation", from: "c5", to: "c8", label: "inside", invocation_id: "inv_01JQ70", artifact_id: "art_01JQ70" },
      { kind: "derivation", from: "c6", to: "c7", label: "inside", invocation_id: "inv_01JQ6E", artifact_id: "art_01JQ6E" },
    ],
  },
};

const BY_ROOT: Record<string, string> = Object.fromEntries(
  Object.entries(GRAPHS).map(([key, g]) => [g.root.id, key]),
);

/** The rest of the fragments, generated rather than written out. The point of
 *  `total` is that it is much larger than what is drawn, and the only way to
 *  know whether a canvas survives sixty-three nodes is to have sixty-three. */
const FILLERS: Record<string, { kinds: GraphNode["kind"][]; make: (i: number) => string }> = {
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

function fill(key: string, seed: Seed, upTo: number): EntityGraph {
  const filler = FILLERS[key];
  const nodes = [...seed.nodes];
  const edges = [...seed.edges];
  const random = mulberry(key.length * 7919 + seed.total);

  for (let i = 0; nodes.length < Math.min(upTo, seed.total); i++) {
    const kind = filler.kinds[i % filler.kinds.length];
    const proposed = random() < 0.34;
    const id = `f${i}`;
    nodes.push({
      id,
      kind,
      label: filler.make(i),
      observations: 1,
      last_seen: "8 min ago",
      source: "crtsh · art_01JQ8A",
    });
    edges.push({
      kind: "attribution",
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

/** In memory, and per process. Pins survive dragging and "Re-layout" within a
 *  session and are gone on reload — that is the fixture, not the design. */
const PINS = new Map<string, Map<string, Pin>>();

const pinsFor = (rootId: string) =>
  PINS.get(rootId) ?? PINS.set(rootId, new Map()).get(rootId)!;

const notFound = (what: string) =>
  new AppError({ kind: "not_found", message: `No ${what} with that identifier.`, status: 404 });

export const entityRoutes: MemoryRoute[] = [
  (req) => {
    if (!(req.method === "GET" && req.path === "/entities")) return undefined;
    return Object.values(GRAPHS).map((g) => ({
      id: g.root.id,
      kind: g.root.kind,
      label: g.root.label,
      total: g.total,
    }));
  },

  (req) => {
    const match = /^\/entities\/([^/]+)\/graph$/.exec(req.path);
    if (!(req.method === "GET" && match)) return undefined;
    const key = BY_ROOT[decodeURIComponent(match[1])];
    if (!key) throw notFound("entity");
    // The default neighbourhood is what was written by hand; fillers exist to
    // answer a bigger `limit`, never to pad the first view.
    const limit = Number(req.params.limit ?? GRAPHS[key].nodes.length) || GRAPHS[key].nodes.length;
    return fill(key, GRAPHS[key], limit);
  },

  (req) => {
    const match = /^\/entities\/([^/]+)\/pins$/.exec(req.path);
    if (!match) return undefined;
    const rootId = decodeURIComponent(match[1]);
    if (!BY_ROOT[rootId]) throw notFound("entity");
    if (req.method === "GET") return [...pinsFor(rootId).values()];
    if (req.method === "DELETE") {
      pinsFor(rootId).clear();
      return null;
    }
    return undefined;
  },

  (req) => {
    const match = /^\/entities\/([^/]+)\/pins\/([^/]+)$/.exec(req.path);
    if (!match) return undefined;
    const rootId = decodeURIComponent(match[1]);
    const nodeId = decodeURIComponent(match[2]);
    if (!BY_ROOT[rootId]) throw notFound("entity");

    if (req.method === "PUT") {
      const { x, y } = (req.body ?? {}) as { x?: number; y?: number };
      if (typeof x !== "number" || typeof y !== "number")
        throw new AppError({
          kind: "invalid",
          message: "A pin needs an x and a y.",
          status: 400,
        });
      const pin: Pin = { node_id: nodeId, x, y, by: "sj@31m.example", at: "just now" };
      pinsFor(rootId).set(nodeId, pin);
      return pin;
    }
    if (req.method === "DELETE") {
      pinsFor(rootId).delete(nodeId);
      return null;
    }
    return undefined;
  },
];
