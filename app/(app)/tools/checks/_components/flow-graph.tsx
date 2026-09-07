"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Chain } from "@/lib/services/checks";
import type { Tool } from "@/lib/services/tooling";
import type { Invocation, InvocationState } from "@/lib/services/runs";
import { NODE_H, NODE_W, place } from "../_layout/flow";
import s from "./flow-graph.module.css";

/** What each state MEANS, in one place, so a node, a legend and a screen reader
 *  cannot drift apart. Three of the six ended with no artifact and none of them
 *  is the same event. */
export const STATE_MEANING: Record<InvocationState, string> = {
  ok: "ran and wrote bytes",
  failed: "ran and broke — there is an exit code",
  refused: "a rule said this tool may not touch this target. No process existed",
  skipped: "nobody ran it — upstream produced nothing to feed it",
  running: "in flight",
  pending: "waiting on something upstream",
};

type StepData = {
  tool: Tool;
  invocation?: Invocation;
};

/** DOM and SVG rather than `<canvas>`, which React Flow gives us for free and
 *  which is the reason to use it rather than a drawing library.
 *
 *  The content here is structured — named tools, real argv, an exit code — and a
 *  canvas throws all of that away the moment it paints: nothing is focusable,
 *  nothing is readable by a screen reader, browser find stops working, and text
 *  becomes a picture of text. A node here is a real `<div>` you can tab to and
 *  search for. Canvas earns its place at thousands of items or freehand ink; a
 *  recon chain has five steps. */
function StepNode({ data, selected }: NodeProps) {
  const d = data as unknown as StepData;
  const { tool, invocation } = d;

  return (
    <div
      className={s.node}
      data-state={invocation?.state}
      data-selected={selected || undefined}
    >
      {/* A source step has no input and a terminal one has no output. A handle
          you cannot legally connect is an invitation to try. */}
      {tool.consumes ? <Handle type="target" position={Position.Left} className={s.handle} /> : null}

      <span className={s.stripe} aria-hidden="true" />
      <span className={s.head}>
        <span className={s.name}>{tool.name}</span>
        {/* Three positions, not two. `light` is real — httpx at recon volume is
            what a crawler does, and calling it loud would put ordinary HTTP
            behind the same gate as template-driven probing. */}
        {tool.intensity !== "passive" ? (
          <span className={s.loud} data-intensity={tool.intensity}>{tool.intensity}</span>
        ) : null}
      </span>
      <span className={s.argv}>{invocation ? invocation.argv.join(" ") : tool.argv}</span>
      <span className={s.foot}>
        {invocation ? (
          <span className={s.state}>{invocation.state}</span>
        ) : (
          <span className={s.feed}>
            {tool.consumes ? `${tool.consumes} → ` : "scope → "}
            {/* A tool that produces nothing is legal — it ran, and nothing
                downstream is fed by it. Blank here would read as a bug. */}
            {tool.produces ?? "nothing"}
          </span>
        )}
      </span>

      <Handle type="source" position={Position.Right} className={s.handle} />
    </div>
  );
}

export type FlowGraphProps = {
  chain: Chain;
  tools: Tool[];
  /** Absent in the editor — there is no run, so no node has a state. */
  invocations?: Invocation[];
  selected?: string | null;
  onSelect?: (stepId: string | null) => void;
  /** Where a settled drag goes. Absent makes the graph read-only, which is what
   *  the Executions tab wants: a run happened at particular positions and moving
   *  them afterwards would be editing the record of it. */
  onPin?: (stepId: string, at: { x: number; y: number }) => void;
};

export function FlowGraph({
  chain,
  tools,
  invocations,
  selected,
  onSelect,
  onPin,
}: FlowGraphProps) {
  const toolOf = useMemo(() => new Map(tools.map((t) => [t.tool_id, t])), [tools]);
  const stateOf = useMemo(
    () => new Map((invocations ?? []).map((i) => [i.step_id, i])),
    [invocations],
  );

  const initial = useMemo<Node[]>(() => {
    const placement = place(chain);
    return chain.steps.flatMap((step) => {
      const tool = toolOf.get(step.tool_id);
      const at = placement.get(step.step_id);
      if (!tool || !at) return [];
      return [{
        id: step.step_id,
        type: "step",
        position: at,
        draggable: Boolean(onPin),
        data: { tool, invocation: stateOf.get(step.step_id) },
      } satisfies Node];
    });
  }, [chain, toolOf, stateOf, onPin]);

  const initialEdges = useMemo<Edge[]>(
    () =>
      chain.flows.map((f) => {
        const to = stateOf.get(f.to);
        return {
          id: `${f.from}->${f.to}`,
          source: f.from,
          target: f.to,
          // Orthogonal, which is the clearest difference from the entity canvas
          // at a glance — a fan-out of straight lines reads as a starburst and
          // stepped ones read as a bus, which is what this is.
          type: "smoothstep",
          animated: to?.state === "running",
          className:
            to?.state === "refused" || to?.state === "skipped" ? s.dead : undefined,
        } satisfies Edge;
      }),
    [chain.flows, stateOf],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initial);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // The graph is derived from props, and props change when a run is picked or a
  // pin is saved. Without this the Executions tab would keep the first run's
  // states after switching runs.
  useEffect(() => setNodes(initial), [initial, setNodes]);

  const nodeTypes = useMemo(() => ({ step: StepNode }), []);

  /* A settled drag is a PIN, not a render — the same rule as the entity canvas.
     Somebody who moved a node stated a constraint, and it has to survive a
     reload and a re-layout of everything around it. Fired on drag STOP rather
     than during, so one gesture is one write. */
  const onNodeDragStop = useCallback(
    (_: unknown, node: Node) => onPin?.(node.id, { x: Math.round(node.position.x), y: Math.round(node.position.y) }),
    [onPin],
  );

  return (
    <div className={s.canvas}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={(_, n) => onSelect?.(selected === n.id ? null : n.id)}
        onPaneClick={() => onSelect?.(null)}
        nodesConnectable={false}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={22} size={1} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable className={s.minimap} />
      </ReactFlow>
    </div>
  );
}

export { NODE_H, NODE_W };
