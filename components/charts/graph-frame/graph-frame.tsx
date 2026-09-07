"use client";

import { useMemo, useState, type ReactNode } from "react";
import { px } from "../_kernel/scale";
import {
  circular, columns, concentric, force, grid, tiered,
  type GraphInput, type LayoutName, type Placement, type Point,
} from "../_kernel/layout";
import { cose } from "../_kernel/layout-cose";
import { shapePath, type MarkShape } from "../_kernel/encode";
import s from "./graph-frame.module.css";

export type GraphNode = {
  id: string;
  label?: string;
  /** Which tier or class. Drives `tiered` layout and the shape channel. */
  group?: string | number;
  /** Area, not radius — see `encode.radiusFor`. Absent means the default. */
  size?: number;
  fill?: string | null;
  shape?: MarkShape;
};

export type GraphEdge = {
  from: string;
  to: string;
  label?: string;
  /** A second edge KIND, drawn differently. Not a weight. */
  kind?: string;
  /** `-1 .. 1`, for a signed network. Drives hue where present. */
  signed?: number;
  width?: number;
};

export type GraphFrameProps = {
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
  width: number;
  height: number;
  layout?: LayoutName;
  /** Required by `concentric`; ignored by every other layout. */
  rootId?: string;
  /** Tier order for `tiered`. Absent means insertion order. */
  groupOrder?: readonly (string | number)[];
  /** Positions a person dragged. A pin wins outright. */
  pins?: ReadonlyMap<string, Point>;
  /** Curve the edges. Straight is right for a radial layout; an arc separates
   *  parallel edges and reads better on a circular one. */
  curved?: boolean;
  labels?: boolean;
  /** Translucent hulls behind groups of nodes — the enrichment-map annotation
   *  layer. Drawn under everything. */
  hulls?: { ids: readonly string[]; label?: string; fill?: string }[];
  onSelect?: (id: string | null) => void;
  selected?: string | null;
  title?: string;
  className?: string;
  children?: ReactNode;
};

const DEFAULT_R = 6;

/** The frame the eleven node-link charts share.
 *
 *  # Why this is not React Flow
 *
 *  The two canvases in this application use it and should: they are
 *  applications — drag, minimap, pan, zoom, a node that is a React component.
 *  A chart is not that. It is a picture that has to print, sit in a report, and
 *  render server-side, and it should not carry a node-editor's runtime to do it.
 *
 *  # Layout is a pure function, memoised on its inputs
 *
 *  Which is the whole performance story. Positions are the expensive part —
 *  `force` is O(iterations x n²) — and they must never be recomputed because
 *  somebody moved a pointer. Everything interactive below is a `data-*`
 *  attribute and a CSS selector, so hovering costs zero React renders and zero
 *  layout passes.
 *
 *  That is not a micro-optimisation. Putting interaction state into the node
 *  array is what made this codebase's entity canvas flicker on every hover, and
 *  the fix there was the same shape as the rule here.
 */
export function GraphFrame({
  nodes,
  edges,
  width,
  height,
  layout = "force",
  rootId,
  groupOrder,
  pins,
  curved = false,
  labels = true,
  hulls,
  onSelect,
  selected,
  title,
  className,
  children,
}: GraphFrameProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const placement = useMemo<Placement>(() => {
    const input: GraphInput = { nodes, edges, width, height, pins };
    switch (layout) {
      case "concentric":
        return concentric(input, rootId ?? nodes[0]?.id ?? "");
      case "circular":
        return circular(input);
      case "tiered":
        return tiered(input, groupOrder);
      case "columns":
        return columns(input);
      case "grid":
        return grid(input);
      case "force":
        return force(input);
      case "cose":
      default:
        return cose(input);
    }
  }, [nodes, edges, width, height, pins, layout, rootId, groupOrder]);

  const lit = hovered ?? selected ?? null;

  /** One hop from the lit node. Computed here rather than per-mark so the cost
   *  is one pass over the edges instead of one per node. */
  const near = useMemo(() => {
    if (lit === null) return null;
    const ids = new Set<string>([lit]);
    for (const e of edges) {
      if (e.from === lit) ids.add(e.to);
      if (e.to === lit) ids.add(e.from);
    }
    return ids;
  }, [edges, lit]);

  const markOf = (id: string) =>
    near === null ? undefined : id === lit ? "lit" : near.has(id) ? "near" : "dim";

  return (
    <svg
      viewBox={`0 0 ${px(width)} ${px(height)}`}
      width={px(width)}
      height={px(height)}
      className={[s.frame, className].filter(Boolean).join(" ")}
      role="img"
      aria-label={title}
      data-lit={lit ? "" : undefined}
    >
      {title ? <title>{title}</title> : null}

      {/* Hulls first — an annotation layer behind the graph, never on top of a
          label. This is the enrichment map's shading and it is the one thing in
          the catalogue that is drawn rather than computed. */}
      {hulls?.map((hull, i) => {
        const pts = hull.ids.map((id) => placement.get(id)).filter(Boolean) as Point[];
        if (pts.length === 0) return null;
        const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
        const cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
        const r = Math.max(28, ...pts.map((p) => Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2))) + 22;
        return (
          <g key={`hull${i}`}>
            <ellipse className={s.hull} cx={px(cx)} cy={px(cy)} rx={px(r * 1.15)} ry={px(r)}
                     style={hull.fill ? { fill: hull.fill } : undefined} />
            {hull.label ? (
              <text className={s.hullLabel} x={px(cx)} y={px(cy - r - 5)} textAnchor="middle">
                {hull.label}
              </text>
            ) : null}
          </g>
        );
      })}

      <g className={s.edges}>
        {edges.map((e, i) => {
          const a = placement.get(e.from);
          const b = placement.get(e.to);
          if (!a || !b) return null;
          const faded = near !== null && e.from !== lit && e.to !== lit;
          return (
            <path
              key={`${e.from}-${e.to}-${i}`}
              className={s.edge}
              d={edgePath(a, b, curved)}
              data-kind={e.kind}
              data-faded={faded || undefined}
              style={{
                strokeWidth: e.width,
                stroke: e.signed === undefined
                  ? undefined
                  : e.signed >= 0 ? "var(--chart-pos)" : "var(--chart-neg)",
                strokeOpacity: e.signed === undefined ? undefined : 0.25 + Math.abs(e.signed) * 0.6,
              }}
            />
          );
        })}
      </g>

      <g className={s.nodes}>
        {nodes.map((n) => {
          const at = placement.get(n.id);
          if (!at) return null;
          const r = n.size ?? DEFAULT_R;
          return (
            <g
              key={n.id}
              className={s.node}
              transform={`translate(${px(at.x)} ${px(at.y)})`}
              data-mark={markOf(n.id)}
              data-selected={selected === n.id || undefined}
              onMouseEnter={() => setHovered(n.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelect?.(selected === n.id ? null : n.id)}
              tabIndex={onSelect ? 0 : undefined}
              onFocus={() => setHovered(n.id)}
              onBlur={() => setHovered(null)}
            >
              <path
                className={s.mark}
                d={shapePath(n.shape ?? "circle", r)}
                style={n.fill ? { fill: n.fill } : undefined}
              />
              {labels && n.label ? (
                <text className={s.label} y={r + 11} textAnchor="middle">{n.label}</text>
              ) : null}
            </g>
          );
        })}
      </g>

      {children}
    </svg>
  );
}

/** Straight, or a shallow arc.
 *
 *  Straight is right for a radial layout — a curve bows every spoke away from
 *  the centre it is pointing at, which is the one thing the layout exists to
 *  show. An arc earns its place on a circular layout, where every edge is a
 *  chord and straight ones overlap into a solid disc. */
function edgePath(a: Point, b: Point, curved: boolean): string {
  if (!curved) return `M ${px(a.x)} ${px(a.y)} L ${px(b.x)} ${px(b.y)}`;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  // `sqrt`, not `hypot` — see `_kernel/layout`. This one is single-shot so the
  // divergence would be sub-pixel, and using the exact function everywhere is
  // cheaper than remembering which calls are safe.
  const distance = Math.sqrt(dx * dx + dy * dy) || 1;
  // Perpendicular offset proportional to length, so short edges stay nearly
  // straight and long ones bow enough to be told apart.
  const bow = Math.min(distance * 0.18, 46);
  const mx = (a.x + b.x) / 2 - (dy / distance) * bow;
  const my = (a.y + b.y) / 2 + (dx / distance) * bow;
  return `M ${px(a.x)} ${px(a.y)} Q ${px(mx)} ${px(my)} ${px(b.x)} ${px(b.y)}`;
}
