export const FRAGMENT_KINDS = [
  "account", "asn", "cert", "cidr", "document", "email",
  "host", "ip", "key", "org", "person", "repo", "whois",
] as const;

export type FragmentKind = (typeof FRAGMENT_KINDS)[number];

export type Claimant = "rule" | "model" | "human";

export type ClaimState = "proposed" | "accepted" | "rejected";

/** The entity the canvas is drawn around. It is not a fragment, which is why it
 *  is not in `nodes` — every attribution runs from here to one of them. */
export type RootEntity = {
  id: string;
  kind: FragmentKind;
  label: string;
  framing: string;
  blurb: string;
  /** ABSENT unless this root needs the reader warned about something. */
  caution?: string;
  observations: number;
  last_seen: string;
  source: string;
};

export type GraphNode = {
  id: string;
  kind: FragmentKind;
  label: string;
  observations: number;
  last_seen: string;
  source: string;
  /** Set when this fragment is ALSO assembled as an entity somewhere, and so
   *  has a canvas of its own. */
  entity_id?: string;
};

/** A CLAIM. Runs entity → fragment and is the only edge anybody accepts. */
export type Attribution = {
  kind: "attribution";
  from: string;
  to: string;
  claimant: Claimant;
  /** ABSENT when the claimant is a rule. A rule's assignment is a category, not
   *  a probability, and storing 1.0 destroys the distinction permanently. */
  confidence?: number;
  /** The person who ruled on it — not the claimant who proposed it. */
  actor?: string;
  basis: string;
  state: ClaimState;
};

/** NOT a claim. Runs fragment → fragment: one source said so, and the bytes are
 *  on disk. No claimant, no confidence, no state — there is nothing to agree
 *  with. */
export type Derivation = {
  kind: "derivation";
  from: string;
  to: string;
  label: string;
  invocation_id: string;
  artifact_id: string;
};

export type GraphEdge = Attribution | Derivation;

export type EntityGraph = {
  root: RootEntity;
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** How many fragments the root has. `nodes.length` is how many came back. */
  total: number;
  truncated: boolean;
};

/** A person's arrangement of one canvas. Coordinates are relative to the root
 *  in layout units, never viewport pixels, so a pin survives a different window.
 *  Everything unpinned is laid out around these. */
export type Pin = {
  node_id: string;
  x: number;
  y: number;
  by: string;
  at: string;
};

/** Just enough to offer a root in a switcher, without pulling a graph for each.
 *  `total` is the fragment count, which is the only number that tells you what
 *  opening it will cost. */
export type EntityRef = {
  id: string;
  kind: FragmentKind;
  label: string;
  total: number;
};
