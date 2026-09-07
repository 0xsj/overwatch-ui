"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Attribution, ClaimState } from "@/lib/services/entities";
import type { ViewNode, ViewRoot } from "../_layout/graph";
import { KIND_GLYPH } from "./glyphs";
import { markOf, useHighlight } from "./highlight";
import s from "./entity-node.module.css";

export type EntityNodeData = {
  node: ViewNode | ViewRoot;
  /** ABSENT on the root: the root IS the entity, so nothing claims it. */
  claim?: Attribution;
  diameter: number;
  degree: number;
  isRoot: boolean;
  pinned: boolean;
  dense: boolean;
};

/** The node's root element IS the circle, and the label hangs off it absolutely.
 *
 *  That is a layout decision with a geometric reason. React Flow measures the
 *  root element, and everything downstream — where a handle sits, where an edge
 *  ends, what the minimap draws — is computed from that box. The first version
 *  wrapped the circle and its label in one 150px block, so the measured box was
 *  the whole thing and every edge anchored to ITS edge: the lines converged on a
 *  point seventy-five pixels right of the root and below it, and nothing touched
 *  the circle at all.
 *
 *  With the circle as the box, `nodeOrigin={[0.5, 0.5]}` puts the ring's point at
 *  the circle's centre and the radius is `diameter / 2` — which is what
 *  `floating-edge` needs to find the boundary.
 */
export function EntityNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as EntityNodeData;
  const state: ClaimState | undefined = d.claim?.state;
  // Read here rather than passed in `data` — see `highlight.tsx` for the flicker
  // that bought this.
  const mark = markOf(useHighlight(), id);

  return (
    <div
      className={s.dot}
      style={{ inlineSize: `${d.diameter}px`, blockSize: `${d.diameter}px` }}
      data-mark={mark}
      data-state={state}
      data-root={d.isRoot || undefined}
      data-selected={selected || undefined}
    >
      {/* Both handles at the CENTRE and both hidden. An entity graph has no
          direction a person draws in — the edges come from the record, not from
          somebody dragging one — so these exist only for React Flow to anchor
          against, and the real endpoints are computed by `floating-edge`. */}
      <Handle type="target" position={Position.Left} className={s.handle} isConnectable={false} />
      <Handle type="source" position={Position.Right} className={s.handle} isConnectable={false} />

      <span className={s.glyph} aria-hidden="true">{KIND_GLYPH[d.node.kind]}</span>
      {d.pinned ? <span className={s.pin} aria-hidden="true" /> : null}

      <span className={s.label}>
        {!d.dense ? <span className={s.kind}>{d.node.kind}</span> : null}
        <span className={s.name}>{d.node.label}</span>
        {/* Only machines carry confidence — §Scope. A float beside a person's
            decision would read as the same kind of thing. */}
        {d.claim?.confidence !== undefined && !d.dense ? (
          <span className={s.confidence}>{d.claim.confidence.toFixed(2)}</span>
        ) : null}
      </span>
    </div>
  );
}
