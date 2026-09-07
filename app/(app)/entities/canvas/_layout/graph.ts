import type { Attribution, Canvas, Entity, Fragment, FragmentKind } from "@/lib/services/entities";

/** The canvas's own shape, built from the wire and not equal to it.
 *
 *  The wire hangs each node's claim off the node (`nodes[].edge`) because a
 *  canvas around one root has exactly one edge per node. A drawing needs the
 *  edges as their own list — they are what is laid out, hit-tested and
 *  highlighted — and flattening them at the door is one function rather than a
 *  `.edge` reach in every component.
 *
 *  It is a VIEW MODEL and not a proposal. Nothing here invents a field: every
 *  value is something `GET /entities/{id}` said, renamed at most. The fixture's
 *  `blurb`, `framing`, `caution`, `source` and `total` are gone, because the
 *  server does not say any of them and a screen that keeps rendering them is
 *  rendering an author's opinion as though a system had measured it. */
export type ViewRoot = {
  id: string;
  kind: FragmentKind;
  label: string;
  /** Present only on a TARGET's root entity. An entity assembled from fragments
   *  that is not somebody's target has none, and the two read differently. */
  target_id?: string;
};

export type ViewNode = {
  id: string;
  kind: FragmentKind;
  label: string;
  origin: Fragment["origin"];
  observations: number;
  /** BOTH ABSENT on a manual fragment — a `/24` typed into a scope rule.
   *  Nothing has seen it, so the date is `–` rather than a placeholder. */
  first_seen?: string;
  last_seen?: string;
  judgement: Fragment["judgement"];
  /** A human READ, which is not a judgement — `decisions/0037`. */
  read_at?: string;
};

/** An edge, and the union stays even though only one arm can occur today.
 *
 *  `decisions/0003` forbids emitting a derivation nothing sourced, so the first
 *  one arrives with an `invocation_id` and an `artifact_id` in hand. Collapsing
 *  this to `Attribution` now would mean re-splitting it then — and the split is
 *  the record's whole point: only one of the two is a claim. */
export type ViewEdge =
  | ({ kind: "attribution"; from: string; to: string } & Attribution)
  | {
      kind: "derivation";
      from: string;
      to: string;
      label: string;
      invocation_id: string;
      artifact_id: string;
    };

export type ViewGraph = {
  root: ViewRoot;
  nodes: ViewNode[];
  edges: ViewEdge[];
  /** The limit was reached. There is no `total` on the wire and this file will
   *  not invent one: a canvas that silently drew half a graph would look like a
   *  smaller estate, and a made-up denominator beside it would look worse. */
  truncated: boolean;
};

export function viewOf(canvas: Canvas): ViewGraph {
  return {
    root: {
      id: canvas.root.entity_id,
      kind: canvas.root.kind,
      label: canvas.root.label,
      target_id: canvas.root.target_id,
    },
    nodes: canvas.nodes.map((n) => ({
      id: n.fragment_id,
      kind: n.kind,
      // A fragment's `value` IS its label — `1.2.3.4` is the whole of what the
      // thing is. There is no display name to fall back to and inventing one
      // would be naming somebody else's asset.
      label: n.value,
      origin: n.origin,
      observations: n.observations,
      first_seen: n.first_seen,
      last_seen: n.last_seen,
      judgement: n.judgement,
      read_at: n.read_at,
    })),
    // Every edge runs root → node. The root is NOT among the nodes: it is not a
    // fragment, which is why the drawing puts it apart rather than in a ring.
    edges: canvas.nodes.map((n) => ({
      kind: "attribution" as const,
      from: n.edge.entity_id,
      to: n.edge.fragment_id,
      ...n.edge,
    })),
    truncated: canvas.truncated,
  };
}

/** Just enough to offer a root in a switcher. */
export type ViewRef = { id: string; kind: FragmentKind; label: string; target_id?: string };

export const refOf = (e: Entity): ViewRef => ({
  id: e.entity_id,
  kind: e.kind,
  label: e.label,
  target_id: e.target_id,
});
