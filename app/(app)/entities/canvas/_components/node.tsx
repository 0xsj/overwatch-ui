"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import type { Attribution, GraphNode, RootEntity } from "@/lib/services/entities";
import { KIND_GLYPH } from "./glyphs";
import s from "./canvas.module.css";

export function Node({
  node,
  claim,
  x,
  y,
  selected,
  pinned,
  onSelect,
  onDragStart,
}: {
  node: GraphNode | RootEntity;
  /** ABSENT on the root: the root is the entity, so nothing claims it. */
  claim?: Attribution;
  x: number;
  y: number;
  selected: boolean;
  pinned: boolean;
  onSelect: () => void;
  onDragStart: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  const state = claim?.state;
  const name = claim
    ? `${node.kind} ${node.label}, ${state}${claim.confidence !== undefined ? `, confidence ${claim.confidence}` : ""}`
    : `${node.kind} ${node.label}, the root of this canvas`;

  return (
    <button
      type="button"
      className={s.node}
      style={{ left: `${x}px`, top: `${y}px` }}
      data-root={claim ? undefined : true}
      data-state={state}
      data-selected={selected || undefined}
      data-pinned={pinned || undefined}
      aria-pressed={selected}
      aria-label={name}
      onPointerDown={onDragStart}
      onClick={onSelect}
    >
      <span className={s.glyph} aria-hidden="true">{KIND_GLYPH[node.kind]}</span>
      <span className={s.kind} aria-hidden="true">{node.kind}</span>
      <span className={s.label}>{node.label}</span>
      {claim?.confidence !== undefined && state === "proposed" ? (
        <span className={s.confidence} aria-hidden="true">{claim.confidence.toFixed(2)}</span>
      ) : null}
      {state === "rejected" ? (
        <span className={s.rejected} aria-hidden="true">rejected</span>
      ) : null}
    </button>
  );
}
