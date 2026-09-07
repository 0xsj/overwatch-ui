"use client";

import { GraphFrame, type GraphEdge, type GraphFrameProps, type GraphNode } from "./graph-frame";

/** Eleven names over one frame.
 *
 *  This file is the catalogue's whole argument. The atlas separates eleven
 *  node-link figures, and stripped of styling they differ on three questions:
 *  does position mean anything, does shape carry a class, and is there an
 *  annotation layer drawn behind the graph. So there is one component and these
 *  are presets — each a choice of layout and encodings, not an implementation.
 *
 *  A preset that needs its own component is a signal that a fourth question
 *  exists, and that is worth noticing rather than absorbing. */

type Base = Omit<GraphFrameProps, "layout" | "rootId">;

/** Position means nothing precise. What it buys is that densely connected
 *  things end up near each other — a hint, not a claim.
 *
 *  CoSE rather than the hand-rolled Fruchterman–Reingold beside it, and the
 *  difference is visible rather than theoretical: FR flung nodes to the
 *  boundary and clamped them there, leaving an empty middle and a row of nodes
 *  stuck along the bottom edge. `layout="force"` still selects ours, which is
 *  dependency-free and bit-reproducible without a seeding trick — worth keeping
 *  for the case where that matters more than the picture. */
export const ForceNetwork = (p: Base) => <GraphFrame {...p} layout="cose" />;

/** Position is an ANSWER: the ring is hops from the centre. The only layout
 *  here whose geometry can be read off. */
export const RadialNetwork = (p: Base & { rootId: string }) => (
  <GraphFrame {...p} layout="concentric" />
);

/** Position means nothing and that is the POINT — every node on the rim, so
 *  none is ever hidden behind another. Curved, because straight chords overlap
 *  into a solid disc. */
export const CircularNetwork = (p: Base) => <GraphFrame {...p} layout="circular" curved />;

/** Two classes, edges only between them. Shape carries which side, because a
 *  bipartite graph drawn in one shape is just a graph. */
export const BipartiteNetwork = (p: Base) => <GraphFrame {...p} layout="tiered" />;

/** The same function with more groups. Bipartite's generalisation, and the
 *  atlas's point that those two are one family rather than two. */
export const MultipartiteNetwork = (p: Base & { groupOrder?: readonly (string | number)[] }) => (
  <GraphFrame {...p} layout="tiered" />
);

/** Columns by longest path. The only layout with no trigonometry in it, so the
 *  only one that cannot have the hydration bug the others are quantised
 *  against. */
export const FlowNetwork = (p: Base) => <GraphFrame {...p} layout="columns" />;

/** A near-complete subgraph drawn alone. Density is the RESULT; the layout is
 *  only there to show it, which is why circular is right — it makes every edge
 *  visible instead of hiding them inside a blob. */
export const CliqueNetwork = (p: Base) => <GraphFrame {...p} layout="circular" labels />;

/** Everything connected to everything. Labels off by default: at this density
 *  they are a grey wash, and the honest reading is a texture. Pair it with a
 *  ranked bar chart — that pairing is an admission that the picture cannot be
 *  read as a structure. */
export const HairballNetwork = (p: Base) => <GraphFrame {...p} layout="cose" labels={false} />;

/** A network of terms with translucent hulls behind the communities. The
 *  shading IS the annotation — it is drawn, not computed, and naming a hull is
 *  a judgement somebody made. */
export const EnrichmentMap = (p: Base & { hulls: GraphFrameProps["hulls"] }) => (
  <GraphFrame {...p} layout="cose" />
);

/** Edges carry a signed value, so hue is the sign and opacity the magnitude.
 *  A missing edge is BELOW THE THRESHOLD and not a zero — which is the one
 *  thing this chart can say that its heatmap cannot. */
export const CorrelationNetwork = (p: Base) => <GraphFrame {...p} layout="cose" curved />;

/** A whole graph with rings drawn around the parts worth naming. The ring is an
 *  annotation layer, not a layout — the nodes were already where they are. */
export const ModuleNetwork = (p: Base & { hulls: GraphFrameProps["hulls"] }) => (
  <GraphFrame {...p} layout="cose" />
);

export type { GraphNode, GraphEdge };
