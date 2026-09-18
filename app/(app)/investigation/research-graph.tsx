"use client";

import { useMemo } from "react";
import { Background, Controls, Handle, MiniMap, Position, ReactFlow, type Edge, type Node, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { ResearchConnection } from "@/lib/services/research-connections";
import type { ResearchRecord } from "@/lib/services/research-records";
import { Badge } from "@/components/display";
import { Text } from "@/components/typography";
import s from "./research-graph.module.css";

const relationshipLabels: Record<ResearchConnection["kind"], string> = {
  associated_with: "associated",
  may_belong_to: "may belong to",
  mentions: "mentions",
  concerns_same_event: "same event",
  located_at: "located at",
  possible_same_subject: "possible same subject",
};

const stateLabels: Record<ResearchConnection["state"], string> = {
  proposed: "proposed",
  accepted: "accepted",
  rejected: "rejected",
  deferred: "deferred",
};

type RecordNodeData = { record: ResearchRecord; degree: number; select?: () => void };

function RecordNode({ data, selected }: NodeProps) {
  const { record, degree, select } = data as unknown as RecordNodeData;
  return <div className={s.node} data-selected={selected || undefined} role={select ? "button" : "group"} tabIndex={select ? 0 : -1} aria-label={`${select ? "Open " : ""}${record.kind} ${record.name}; ${degree} connection${degree === 1 ? "" : "s"}`} onClick={(event) => { event.stopPropagation(); select?.(); }} onKeyDown={(event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      select?.();
    }
  }}>
    <Handle type="target" position={Position.Left} className={s.handle} />
    <Badge tone="neutral">{record.kind}</Badge>
    <strong>{record.name}</strong>
    <Text as="span" size="xs" tone="tertiary">{degree} connection{degree === 1 ? "" : "s"} · {record.observation_ids.length} citation{record.observation_ids.length === 1 ? "" : "s"}</Text>
    <Handle type="source" position={Position.Right} className={s.handle} />
  </div>;
}

export function ResearchGraph({ records, connections, onSelectRecord, onSelectConnection }: { records: ResearchRecord[]; connections: ResearchConnection[]; onSelectRecord?: (record: string) => void; onSelectConnection?: (connection: string) => void }) {
  const recordByID = useMemo(() => new Map(records.map((record) => [record.record_id, record])), [records]);
  const degree = useMemo(() => {
    const values = new Map<string, number>();
    for (const connection of connections) {
      values.set(connection.from_record_id, (values.get(connection.from_record_id) ?? 0) + 1);
      values.set(connection.to_record_id, (values.get(connection.to_record_id) ?? 0) + 1);
    }
    return values;
  }, [connections]);
  const nodes = useMemo<Node[]>(() => records.map((record, index) => ({
    id: record.record_id,
    type: "research-record",
    position: { x: (index % 3) * 290, y: Math.floor(index / 3) * 150 },
    data: { record, degree: degree.get(record.record_id) ?? 0, select: onSelectRecord ? () => onSelectRecord(record.record_id) : undefined },
    draggable: false,
  })), [degree, onSelectRecord, records]);
  const edges = useMemo<Edge[]>(() => connections.flatMap((connection) => {
    if (!recordByID.has(connection.from_record_id) || !recordByID.has(connection.to_record_id)) return [];
    return [{
      id: connection.connection_id,
      source: connection.from_record_id,
      target: connection.to_record_id,
      type: "smoothstep",
      label: `${relationshipLabels[connection.kind]} · ${stateLabels[connection.state]}`,
      className: connection.state === "rejected" ? s.edgeRejected : connection.state === "accepted" ? s.edgeAccepted : s.edgeProposed,
      animated: connection.state === "proposed",
      ariaLabel: `${relationshipLabels[connection.kind]}, ${stateLabels[connection.state]}`,
    } satisfies Edge];
  }), [connections, recordByID]);
  const nodeTypes = useMemo(() => ({ "research-record": RecordNode }), []);

  if (!records.length) return <Text size="sm" tone="tertiary">Create research records to start the investigation map.</Text>;
  return <div className={s.canvas} aria-label="Research record map">
    <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} nodesConnectable={false} nodesDraggable={false} onEdgeClick={(_, edge) => onSelectConnection?.(edge.id)} fitView fitViewOptions={{ padding: 0.25 }} proOptions={{ hideAttribution: true }}>
      <Background gap={22} size={1} />
      <Controls showInteractive={false} />
      <MiniMap pannable zoomable className={s.minimap} />
    </ReactFlow>
  </div>;
}
