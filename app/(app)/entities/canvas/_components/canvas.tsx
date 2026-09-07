"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Toggle } from "@/components/forms";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/overlays";
import type { ClaimState, Pin } from "@/lib/services/entities";
import type { ViewEdge, ViewGraph } from "../_layout/graph";
import { degrees, diameterOf, hops, place, type Point } from "../_layout/rings";
import { EntityNode, type EntityNodeData } from "./entity-node";
import { HighlightProvider } from "./highlight";
import { FloatingEdge } from "./floating-edge";
import s from "./canvas.module.css";

/** Past this many nodes the kind and the confidence come off. The mock reaches
 *  the same threshold from the other direction and calls it `dense`: a canvas
 *  that keeps full-size labels at sixty is not more informative, it is
 *  unreadable in a way that hides the fact that it is unreadable. */
const DENSE_ABOVE = 24;

const nodeTypes = { entity: EntityNode };
const edgeTypes = { floating: FloatingEdge };

export function Canvas({
  graph,
  pins,
  hidden,
  selected,
  onSelect,
  onPin,
  focus,
  onFocusChange,
}: {
  graph: ViewGraph;
  pins: readonly Pin[];
  hidden: ReadonlySet<ClaimState>;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onPin: (nodeId: string, at: Point) => void;
  /** Keeps the record out of the way. The highlight is the whole answer while
   *  it is on, and the drawer would cover a third of the thing being read. */
  focus: boolean;
  onFocusChange: (focus: boolean) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  /* Hover wins over selection: the drawer holds the selected record while you
     point at something else, and the canvas should answer the question you are
     asking NOW rather than the one you asked a moment ago. */
  const lit = hovered ?? selected;

  const claims = useMemo(() => {
    const out = new Map<string, Extract<ViewEdge, { kind: "attribution" }>>();
    for (const edge of graph.edges) if (edge.kind === "attribution") out.set(edge.to, edge);
    return out;
  }, [graph.edges]);

  const visible = useMemo(() => {
    const ids = new Set<string>([graph.root.id]);
    for (const node of graph.nodes) {
      const state = claims.get(node.id)?.state;
      if (!state || !hidden.has(state)) ids.add(node.id);
    }
    return ids;
  }, [graph.nodes, graph.root.id, claims, hidden]);

  const edges = useMemo(
    () => graph.edges.filter((e) => visible.has(e.from) && visible.has(e.to)),
    [graph.edges, visible],
  );

  /** Everything one hop from the lit node — the far end of every edge that
   *  touches it. Attributions and derivations both count: the question is what
   *  is connected, not what kind of connection it is. */
  const near = useMemo(() => {
    if (lit === null) return null;
    const ids = new Set<string>([lit]);
    for (const e of edges) {
      if (e.from === lit) ids.add(e.to);
      if (e.to === lit) ids.add(e.from);
    }
    return ids;
  }, [edges, lit]);


  const dense = graph.nodes.length > DENSE_ABOVE;

  const placement = useMemo(() => place(graph, pins), [graph, pins]);
  const degree = useMemo(() => degrees(graph), [graph]);
  const depth = useMemo(() => hops(graph), [graph]);
  const pinned = useMemo(() => new Set(pins.map((p) => p.fragment_id)), [pins]);
  const ringSummary = useMemo(() => {
    const counts = new Map<number, number>();
    for (const node of graph.nodes)
      if (visible.has(node.id)) {
        const d = depth.get(node.id) ?? 1;
        counts.set(d, (counts.get(d) ?? 0) + 1);
      }
    const rings = [...counts].sort((a, b) => a[0] - b[0]);
    if (rings.length === 0) return "just the root";
    if (rings.length === 1)
      return `${rings[0][1]} fragments, all one hop from the root`;
    return rings.map(([hop, n]) => `${n} at ${hop}`).join(" · ") + " hops";
  }, [graph.nodes, visible, depth]);


  const rfNodes = useMemo<Node[]>(
    () =>
      [graph.root, ...graph.nodes]
        .filter((n) => visible.has(n.id))
        .flatMap((node) => {
          const at = placement.get(node.id);
          if (!at) return [];
          const isRoot = node.id === graph.root.id;
          return [{
            id: node.id,
            type: "entity",
            position: at,
            data: {
              node,
              claim: claims.get(node.id),
              degree: degree.get(node.id) ?? 0,
              diameter: diameterOf(degree.get(node.id) ?? 0, isRoot),
              isRoot,
              pinned: pinned.has(node.id),
              dense,
            } satisfies EntityNodeData,
          } satisfies Node];
        }),
    // No highlight in here, deliberately. It used to be, and rebuilding this
    // array on hover is what made the map flicker — `highlight.tsx` has the
    // mechanism.
    [graph, visible, placement, claims, degree, pinned, dense],
  );

  const rfEdges = useMemo<Edge[]>(
    () =>
      edges.map((e) => ({
          id: `${e.kind}:${e.from}:${e.to}:${"label" in e ? e.label : ""}`,
          source: e.from,
          target: e.to,
          /* Computed endpoints on each circle's boundary — see `floating-edge`.
             A handle is a fixed point on one side of a node, which is right for
             a flowchart and wrong for a layout where a neighbour can be in any
             direction. */
          type: "floating",
          /* The two edge kinds stay apart, and `decisions/0003` is why: only one
             of them is a claim. An attribution is somebody saying this fragment
             belongs to that entity; a derivation is what a tool read out of
             what. Drawing them the same would collapse the distinction the
             graph exists to keep. */
          className: e.kind === "derivation" ? s.derivation : s.attribution,
          animated: false,
          data: { label: e.kind === "derivation" && !dense ? e.label : undefined },
      }) satisfies Edge),
    [edges, dense],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(rfEdges);

  // These replace React Flow's whole state, so they must run RARELY — on a
  // filter change or a new graph, never on a pointer move.
  useEffect(() => setNodes(rfNodes), [rfNodes, setNodes]);
  useEffect(() => setFlowEdges(rfEdges), [rfEdges, setFlowEdges]);

  const highlight = useMemo(() => ({ lit, near }), [lit, near]);

  return (
    <HighlightProvider value={highlight}>
      <div className={s.canvas}>
      <ReactFlow
        nodes={nodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, n) => onSelect(selected === n.id ? null : n.id)}
        onNodeMouseEnter={(_, n) => setHovered(n.id)}
        onNodeMouseLeave={() => setHovered(null)}
        onPaneClick={() => onSelect(null)}
        /* A settled drag is a PIN — a constraint somebody stated, not a render.
           Fired on stop rather than during, so one gesture is one write, and the
           layout honours it while ringing everything else around it. */
        onNodeDragStop={(_, n) =>
          onPin(n.id, { x: Math.round(n.position.x), y: Math.round(n.position.y) })
        }
        nodesConnectable={false}
        /* `position` is the node's CENTRE rather than its top-left, which is
           what a ring layout means by a point — and it removes the margin hack
           that was half-centring a fixed-width wrapper over a variable-diameter
           circle. */
        nodeOrigin={[0.5, 0.5]}
        minZoom={0.25}
        maxZoom={1.8}
        fitView
        /* Generous, and it has a reason: a node's measured box is its CIRCLE,
           so the label underneath is invisible to `fitView` and the bottom row
           gets clipped at a tighter padding. */
        fitViewOptions={{ padding: 0.34 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={26} size={1} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable nodeStrokeWidth={0} nodeBorderRadius={20} maskColor="transparent" />
      </ReactFlow>

      <div className={s.bar}>
        {/* Says what the rings ARE, not how many there are. A star-shaped
            neighbourhood is one ring and that is a true picture of it — the
            count alone reads as a defect when the answer is "everything here is
            one hop from the root". */}
        <span className={s.rings}>{ringSummary}</span>

        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle size="sm" className={s.focus} pressed={focus} onPressedChange={onFocusChange}>
              Focus
            </Toggle>
          </TooltipTrigger>
          <TooltipContent side="top" className={s.focusTip}>
            <span className={s.focusName}>Focus</span>
            <span className={s.focusSub}>
              Clicking a node lights its edges and leaves the record closed. The drawer
              covers a third of the canvas, which is the wrong trade while you are
              following linkages.
            </span>
          </TooltipContent>
        </Tooltip>

        <span className={s.hint}>
          distance from the centre is hops from the root · size is how many edges touch it
        </span>
        </div>
      </div>
    </HighlightProvider>
  );
}
