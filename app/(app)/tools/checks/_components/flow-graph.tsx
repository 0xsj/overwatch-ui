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
import type { Check, Invocation, InvocationState, ToolDef } from "@/lib/services/pipeline";
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
  tool: ToolDef;
  invocation?: Invocation;
  refusal?: string;
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
  const { tool, invocation, refusal } = d;

  return (
    <div
      className={s.node}
      data-state={invocation?.state}
      data-refused={refusal ? true : undefined}
      data-selected={selected || undefined}
    >
      {/* A source step has no input and a terminal one has no output. A handle
          you cannot legally connect is an invitation to try. */}
      {tool.consumes ? <Handle type="target" position={Position.Left} className={s.handle} /> : null}

      <span className={s.stripe} aria-hidden="true" />
      <span className={s.head}>
        <span className={s.name}>{tool.name}</span>
        {tool.loud ? <span className={s.loud}>loud</span> : null}
      </span>
      <span className={s.argv}>{invocation?.argv ?? tool.argv}</span>
      <span className={s.foot}>
        {invocation ? (
          <span className={s.state}>{invocation.state}</span>
        ) : refusal ? (
          <span className={s.state}>would be refused</span>
        ) : (
          <span className={s.feed}>
            {tool.consumes ? `${tool.consumes} → ` : "scope → "}
            {tool.produces}
          </span>
        )}
      </span>

      <Handle type="source" position={Position.Right} className={s.handle} />
    </div>
  );
}

export type FlowGraphProps = {
  check: Check;
  tools: ToolDef[];
  /** Absent in the editor — there is no run, so no node has a state. */
  invocations?: Invocation[];
  selected?: string | null;
  onSelect?: (stepId: string | null) => void;
  /** Steps the spawn gate would refuse, before anything runs. Editor only. */
  refusals?: Map<string, string>;
  /** Where a settled drag goes. Absent makes the graph read-only, which is what
   *  the Executions tab wants: a run happened at particular positions and moving
   *  them afterwards would be editing the record of it. */
  onPin?: (stepId: string, at: { x: number; y: number }) => void;
};

export function FlowGraph({
  check,
  tools,
  invocations,
  selected,
  onSelect,
  refusals,
  onPin,
}: FlowGraphProps) {
  const toolOf = useMemo(() => new Map(tools.map((t) => [t.tool_id, t])), [tools]);
  const stateOf = useMemo(
    () => new Map((invocations ?? []).map((i) => [i.step_id, i])),
    [invocations],
  );

  const initial = useMemo<Node[]>(() => {
    const placement = place(check);
    return check.steps.flatMap((step) => {
      const tool = toolOf.get(step.tool_id);
      const at = placement.get(step.step_id);
      if (!tool || !at) return [];
      return [{
        id: step.step_id,
        type: "step",
        position: at,
        draggable: Boolean(onPin),
        data: { tool, invocation: stateOf.get(step.step_id), refusal: refusals?.get(step.step_id) },
      } satisfies Node];
    });
  }, [check, toolOf, stateOf, refusals, onPin]);

  const initialEdges = useMemo<Edge[]>(
    () =>
      check.flows.map((f) => {
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
    [check.flows, stateOf],
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
