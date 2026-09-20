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

type ReviewCounts = { open: number; conflicted: number; uncited: number };
type RecordNodeData = { record: ResearchRecord; degree: number; reviewCounts: ReviewCounts; select?: () => void };

function reviewFlags(connection: ResearchConnection) {
  return connection.review_flags ?? {
    open: connection.state === "proposed" || connection.state === "deferred",
    conflicted: connection.supporting_observation_ids.length > 0 && connection.opposing_observation_ids.length > 0,
    uncited: connection.supporting_observation_ids.length === 0 && connection.opposing_observation_ids.length === 0,
  };
}

function RecordNode({ data, selected }: NodeProps) {
  const { record, degree, reviewCounts, select } = data as unknown as RecordNodeData;
  const queueLabels = [reviewCounts.open ? `${reviewCounts.open} open` : "", reviewCounts.conflicted ? `${reviewCounts.conflicted} conflicting` : "", reviewCounts.uncited ? `${reviewCounts.uncited} uncited` : ""].filter(Boolean);
  return <div className={s.node} data-selected={selected || undefined} role={select ? "button" : "group"} tabIndex={select ? 0 : -1} aria-label={`${select ? "Open " : ""}${record.kind} ${record.name}; ${degree} connection${degree === 1 ? "" : "s"}${queueLabels.length ? `; ${queueLabels.join(", ")}` : ""}`} onClick={(event) => { event.stopPropagation(); select?.(); }} onKeyDown={(event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      select?.();
    }
  }}>
    <Handle type="target" position={Position.Left} className={s.handle} />
    <Badge tone="neutral">{record.kind}</Badge>
    <strong>{record.name}</strong>
    <Text as="span" size="xs" tone="tertiary">{degree} connection{degree === 1 ? "" : "s"} · {record.observation_ids.length} citation{record.observation_ids.length === 1 ? "" : "s"}</Text>
    <Text as="span" size="xs" tone={reviewCounts.open || reviewCounts.conflicted || reviewCounts.uncited ? "tertiary" : "accent"}>{queueLabels.length ? queueLabels.join(" · ") : "Reviewed relationship context"}</Text>
    <Handle type="source" position={Position.Right} className={s.handle} />
  </div>;
}

export function ResearchGraph({ records, connections, complete = true, onSelectRecord, onSelectConnection }: { records: ResearchRecord[]; connections: ResearchConnection[]; complete?: boolean; onSelectRecord?: (record: string) => void; onSelectConnection?: (connection: string) => void }) {
  const recordByID = useMemo(() => new Map(records.map((record) => [record.record_id, record])), [records]);
  const degree = useMemo(() => {
    const values = new Map<string, number>();
    for (const connection of connections) {
      values.set(connection.from_record_id, (values.get(connection.from_record_id) ?? 0) + 1);
      values.set(connection.to_record_id, (values.get(connection.to_record_id) ?? 0) + 1);
    }
    return values;
  }, [connections]);
  const reviewCounts = useMemo(() => {
    const values = new Map<string, ReviewCounts>();
    for (const connection of connections) {
      const flags = reviewFlags(connection);
      for (const recordID of [connection.from_record_id, connection.to_record_id]) {
        const current = values.get(recordID) ?? { open: 0, conflicted: 0, uncited: 0 };
        if (flags.open) current.open += 1;
        if (flags.conflicted) current.conflicted += 1;
        if (flags.uncited) current.uncited += 1;
        values.set(recordID, current);
      }
    }
    return values;
  }, [connections]);
  const nodes = useMemo<Node[]>(() => records.map((record, index) => ({
    id: record.record_id,
    type: "research-record",
    position: { x: (index % 3) * 290, y: Math.floor(index / 3) * 150 },
    data: { record, degree: degree.get(record.record_id) ?? 0, reviewCounts: reviewCounts.get(record.record_id) ?? { open: 0, conflicted: 0, uncited: 0 }, select: onSelectRecord ? () => onSelectRecord(record.record_id) : undefined },
    draggable: false,
  })), [degree, onSelectRecord, records, reviewCounts]);
  const edges = useMemo<Edge[]>(() => connections.flatMap((connection) => {
    if (!recordByID.has(connection.from_record_id) || !recordByID.has(connection.to_record_id)) return [];
    const flags = reviewFlags(connection);
    const reviewLabel = flags.conflicted ? "conflicting evidence" : flags.uncited ? "uncited" : flags.open ? "open hypothesis" : "reviewed evidence";
    const stateClass = connection.state === "rejected" ? s.edgeRejected : connection.state === "accepted" ? s.edgeAccepted : s.edgeProposed;
    const queueClass = flags.conflicted ? s.edgeConflicted : flags.uncited ? s.edgeUncited : "";
    return [{
      id: connection.connection_id,
      source: connection.from_record_id,
      target: connection.to_record_id,
      type: "smoothstep",
      label: `${relationshipLabels[connection.kind]} · ${stateLabels[connection.state]} · ${reviewLabel}`,
      className: `${stateClass} ${queueClass}`.trim(),
      animated: connection.state === "proposed",
      ariaLabel: `${relationshipLabels[connection.kind]}, ${stateLabels[connection.state]}, ${reviewLabel}`,
    } satisfies Edge];
  }), [connections, recordByID]);
  const nodeTypes = useMemo(() => ({ "research-record": RecordNode }), []);

  if (!records.length) return <Text size="sm" tone="tertiary">Create research records to start the investigation map.</Text>;
  return <div className={s.map} aria-label="Research record map">
    <div className={s.canvas}>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} nodesConnectable={false} nodesDraggable={false} onEdgeClick={(_, edge) => onSelectConnection?.(edge.id)} fitView fitViewOptions={{ padding: 0.25 }} proOptions={{ hideAttribution: true }}>
      <Background gap={22} size={1} />
      <Controls showInteractive={false} />
      <MiniMap pannable zoomable className={s.minimap} />
      </ReactFlow>
    </div>
    <div className={s.legend} aria-label="Research map legend"><Text size="xs" tone="tertiary">Map cues</Text><span className={s.legendItem}><i className={s.legendAccepted} />Accepted</span><span className={s.legendItem}><i className={s.legendProposed} />Proposed or deferred</span><span className={s.legendItem}><i className={s.legendConflicted} />Conflicting evidence</span><span className={s.legendItem}><i className={s.legendUncited} />Uncited</span><span className={s.muted}>{complete ? "All loaded map pages are shown." : "More records or relationships are available below."}</span></div>
  </div>;
}
