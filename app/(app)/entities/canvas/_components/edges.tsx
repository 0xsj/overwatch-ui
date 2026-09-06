import type { Attribution, GraphEdge } from "@/lib/services/entities";
import { clip, placeLabel, type Box } from "../_layout/labels";
import s from "./canvas.module.css";

const STROKE: Record<Attribution["state"], string> = {
  accepted: s.accepted,
  proposed: s.proposed,
  rejected: s.rejectedEdge,
};

/** Clear of the border, and clear of the arrowhead at the far end. */
const GAP = { attribution: 3, derivation: 5, arrow: 9 };

export function Edges({
  edges,
  boxOf,
  boxes,
  width,
  height,
}: {
  edges: readonly GraphEdge[];
  boxOf: (id: string) => Box | undefined;
  boxes: readonly Box[];
  width: number;
  height: number;
}) {
  const placedLabels: Box[] = [];

  return (
    <svg className={s.edges} width={width} height={height} aria-hidden="true">
      <defs>
        <marker
          id="derivation-arrow"
          viewBox="0 0 6 6"
          refX="5"
          refY="3"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0 0.5 L6 3 L0 5.5 z" fill="var(--info)" />
        </marker>
      </defs>

      {edges.map((edge) => {
        const a = boxOf(edge.from);
        const b = boxOf(edge.to);
        if (!a || !b) return null;

        const dx = b.x - a.x;
        const dy = b.y - a.y;

        // The union branches exactly once, here. Everything downstream of this
        // switch knows which kind it has.
        switch (edge.kind) {
          case "attribution": {
            const from = clip(a, dx, dy, GAP.attribution);
            const to = clip(b, -dx, -dy, GAP.attribution);
            return (
              <line
                key={`a:${edge.from}:${edge.to}`}
                className={STROKE[edge.state]}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
              >
                <title>{`${edge.state} · claimed by ${edge.claimant}`}</title>
              </line>
            );
          }

          case "derivation": {
            const from = clip(a, dx, dy, GAP.derivation);
            const to = clip(b, -dx, -dy, GAP.arrow);
            const label = placeLabel(edge.label, from, to, boxes, placedLabels);

            return (
              <g key={`d:${edge.from}:${edge.to}:${edge.label}`}>
                <line
                  className={s.derivation}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  markerEnd="url(#derivation-arrow)"
                >
                  <title>{`${edge.label} · ${edge.artifact_id}`}</title>
                </line>
                {label ? (
                  <text className={s.edgeLabel} x={label.x} y={label.y}>
                    {edge.label}
                  </text>
                ) : null}
              </g>
            );
          }

          default: {
            const never: never = edge;
            return never;
          }
        }
      })}
    </svg>
  );
}
