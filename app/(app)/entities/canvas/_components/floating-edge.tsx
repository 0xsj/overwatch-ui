"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  useInternalNode,
  type EdgeProps,
  type InternalNode,
} from "@xyflow/react";
import { useHighlight } from "./highlight";
import s from "./floating-edge.module.css";

/** The centre and radius of a node whose box is its circle.
 *
 *  `internals.positionAbsolute` is the box's top-left even under
 *  `nodeOrigin={[0.5, 0.5]}` — the origin moves where the box is PLACED, not
 *  what the property reports — so the centre is half a measured box away from
 *  it. Getting that wrong is silent: everything still draws, just consistently
 *  off by half a node. */
function circleOf(node: InternalNode) {
  const w = node.measured?.width ?? 44;
  const h = node.measured?.height ?? 44;
  return {
    x: node.internals.positionAbsolute.x + w / 2,
    y: node.internals.positionAbsolute.y + h / 2,
    r: Math.min(w, h) / 2,
  };
}

/** An edge between two circles, ending ON their boundaries.
 *
 *  React Flow anchors an edge to a HANDLE, and a handle is a fixed point on one
 *  side of a node — which is right for a flowchart where everything flows one
 *  way, and wrong for a radial graph where a neighbour can be in any direction.
 *  With fixed left/right handles, an edge to a node on the left leaves the
 *  right-hand side and loops all the way back around; thirteen of those is the
 *  spaghetti this replaced.
 *
 *  So the endpoints are computed instead: walk from one centre toward the other
 *  and stop at the radius. Straight, because a spoke in a radial layout IS
 *  straight — a bezier bows every line away from the centre it is supposed to be
 *  pointing at, which is the one thing the ring layout exists to show.
 *
 *  It reads LIVE positions through `useInternalNode` rather than the placement
 *  the layout produced, so an edge follows a node while it is being dragged. */
export function FloatingEdge({ id, source, target, style, markerEnd, data }: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const { lit, near } = useHighlight();
  if (!sourceNode || !targetNode) return null;

  /* Dimming is read here for the same reason the node's mark is: putting it in
     the edge's `style` made it a dependency of the edge array, and rebuilding
     that array on hover is half of what made the map flicker. */
  const faded = near !== null && source !== lit && target !== lit;

  const a = circleOf(sourceNode);
  const b = circleOf(targetNode);

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  // Two nodes at the same point have no direction to leave in. Drawing nothing
  // beats drawing NaN, which React renders as a broken path attribute.
  if (distance === 0) return null;

  const ux = dx / distance;
  const uy = dy / distance;
  // A hair off the boundary, so a 1.5px stroke does not sit half under the
  // circle's own border and read as a gap.
  const gap = 2;

  const path = `M ${a.x + ux * (a.r + gap)} ${a.y + uy * (a.r + gap)} L ${b.x - ux * (b.r + gap)} ${b.y - uy * (b.r + gap)}`;

  const label = (data as { label?: string } | undefined)?.label;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{ ...style, ...(faded ? { opacity: 0.12 } : null) }}
        markerEnd={markerEnd}
      />
      {/* A derivation says what was read out of what, and the verb is the whole
          content — "SAN entry", "registrant of". `BaseEdge` draws no label, so
          it goes through `EdgeLabelRenderer`, which puts it in a DOM layer above
          the SVG. Text again, rather than an SVG `<text>` that browser find
          cannot reach.

          It inherits the edge's own opacity so a dimmed edge dims its label
          with it — otherwise a faded graph keeps a full-strength wall of
          words. */}
      {label ? (
        <EdgeLabelRenderer>
          <span
            className={s.label}
            style={{
              transform: `translate(-50%, -50%) translate(${(a.x + b.x) / 2}px, ${(a.y + b.y) / 2}px)`,
              opacity: faded ? 0.12 : undefined,
            }}
          >
            {label}
          </span>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
