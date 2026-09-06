"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Attribution, ClaimState, EntityGraph, Pin } from "@/lib/services/entities";
import { UNIT, bounds, place, toPixels, toUnits, type Point } from "../_layout/place";
import { nodeBox } from "../_layout/labels";
import { Edges } from "./edges";
import { Node } from "./node";
import s from "./canvas.module.css";

const MIN_SCALE = 0.35;
const MAX_SCALE = 1.6;
const CLICK_SLOP = 4;
const MARGIN = { x: 130, y: 56 };

/** Past this many nodes the kind and the glyph come off. The mock reaches the
 *  same threshold from the other direction and calls it `dense`: a canvas that
 *  keeps full-size nodes at sixty is not more informative, it is unreadable in a
 *  way that hides the fact that it is unreadable. */
const DENSE_ABOVE = 24;

type Drag =
  | { kind: "node"; id: string; pointer: number; from: Point; origin: Point; moved: boolean }
  | { kind: "pan"; pointer: number; from: Point; origin: Point };

export function Canvas({
  graph,
  pins,
  hidden,
  selected,
  onSelect,
  onPin,
}: {
  graph: EntityGraph;
  pins: readonly Pin[];
  hidden: ReadonlySet<ClaimState>;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onPin: (nodeId: string, at: Point) => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  // A ref, not state: `pointerdown` and the first `pointermove` can arrive in
  // one task, and a drag that only starts once React has re-rendered drops the
  // beginning of every fast gesture.
  const drag = useRef<Drag | null>(null);
  const [live, setLive] = useState<{ id: string; at: Point } | null>(null);
  const [panning, setPanning] = useState(false);

  const claims = useMemo(() => {
    const out = new Map<string, Attribution>();
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

  const dense = graph.nodes.length > DENSE_ABOVE;
  const placement = useMemo(() => place(graph, pins), [graph, pins]);

  // Half a wide label either side, and a node's height above and below.
  const field = useMemo(() => {
    const b = bounds(placement);
    const px = { x: (b.maxX - b.minX) * UNIT, y: (b.maxY - b.minY) * UNIT };
    return {
      w: px.x + MARGIN.x * 2,
      h: px.y + MARGIN.y * 2,
      originX: -b.minX * UNIT + MARGIN.x,
      originY: -b.minY * UNIT + MARGIN.y,
    };
  }, [placement]);

  const at = useCallback(
    (id: string): Point | undefined => {
      const point = live?.id === id ? live.at : placement.get(id);
      if (!point) return undefined;
      const px = toPixels(point);
      return { x: field.originX + px.x, y: field.originY + px.y };
    },
    [placement, live, field],
  );

  const fit = useCallback(() => {
    const el = viewport.current;
    if (!el) return;
    const scale = Math.min(1, el.clientWidth / field.w, el.clientHeight / field.h);
    setView({ x: 0, y: 0, scale: Math.max(MIN_SCALE, scale) });
  }, [field.w, field.h]);

  // Frame the whole graph on first paint and whenever the node count changes.
  // Opening at 1:1 on a sixty-three node canvas shows the middle of it and
  // nothing else, which reads as a bug rather than as a big graph.
  useLayoutEffect(fit, [fit, graph.root.id, graph.nodes.length]);

  // Keyed, because an edge has to clip against the box at each of its ends.
  const boxes = useMemo(() => {
    const out = new Map<string, ReturnType<typeof nodeBox>>();
    const root = at(graph.root.id);
    if (root)
      out.set(
        graph.root.id,
        nodeBox({ label: graph.root.label, kind: graph.root.kind, ...root, dense, root: true }),
      );
    for (const node of graph.nodes) {
      if (!visible.has(node.id)) continue;
      const p = at(node.id);
      if (p) out.set(node.id, nodeBox({ label: node.label, kind: node.kind, ...p, dense }));
    }
    return out;
  }, [graph, at, visible, dense]);

  const boxOf = useCallback((id: string) => boxes.get(id), [boxes]);
  const boxList = useMemo(() => [...boxes.values()], [boxes]);

  const edges = useMemo(
    () => graph.edges.filter((e) => visible.has(e.from) && visible.has(e.to)),
    [graph.edges, visible],
  );

  function startNodeDrag(id: string) {
    return (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (id === graph.root.id) return;
      const origin = placement.get(id);
      if (!origin) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = {
        kind: "node",
        id,
        pointer: event.pointerId,
        from: { x: event.clientX, y: event.clientY },
        origin,
        moved: false,
      };
    };
  }

  function startPan(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      kind: "pan",
      pointer: event.pointerId,
      from: { x: event.clientX, y: event.clientY },
      origin: { x: view.x, y: view.y },
    };
    setPanning(true);
  }

  function onPointerMove(event: ReactPointerEvent) {
    const current = drag.current;
    if (!current || event.pointerId !== current.pointer) return;
    const dx = event.clientX - current.from.x;
    const dy = event.clientY - current.from.y;

    if (current.kind === "pan") {
      setView((v) => ({ ...v, x: current.origin.x + dx, y: current.origin.y + dy }));
      return;
    }

    current.moved ||= Math.hypot(dx, dy) > CLICK_SLOP;
    if (!current.moved) return;

    const delta = toUnits({ x: dx / view.scale, y: dy / view.scale });
    setLive({ id: current.id, at: { x: current.origin.x + delta.x, y: current.origin.y + delta.y } });
  }

  function onPointerUp() {
    const current = drag.current;
    if (current?.kind === "node" && current.moved && live) onPin(current.id, live.at);
    drag.current = null;
    setPanning(false);
    setLive(null);
  }

  const zoomBy = (by: number) =>
    setView((v) => ({ ...v, scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale + by)) }));

  // Wheel zoom, anchored on the pointer, on a non-passive listener because
  // React's onWheel cannot preventDefault.
  //
  // The page still has to be scrollable past a 600px canvas, so the default is
  // only prevented when the zoom actually moved: at either limit the event falls
  // through and the page scrolls, which is the way out.
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;

    function onWheel(event: WheelEvent) {
      const rect = el!.getBoundingClientRect();
      const px = event.clientX - (rect.left + rect.width / 2);
      const py = event.clientY - (rect.top + rect.height / 2);

      setView((v) => {
        const factor = Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0015));
        const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
        if (scale === v.scale) return v;
        event.preventDefault();
        // Keep whatever is under the pointer under the pointer.
        const k = scale / v.scale;
        return { scale, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
      });
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const pinned = useMemo(() => new Set(pins.map((p) => p.node_id)), [pins]);

  return (
    <div
      ref={viewport}
      className={s.viewport}
      data-panning={panning || undefined}
      onPointerDown={startPan}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className={s.field}
        data-dense={dense || undefined}
        style={{
          width: `${field.w}px`,
          height: `${field.h}px`,
          transform: `translate(-50%, -50%) translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
        }}
      >
        <Edges edges={edges} boxOf={boxOf} boxes={boxList} width={field.w} height={field.h} />

        {[graph.root, ...graph.nodes]
          .filter((n) => visible.has(n.id))
          .map((node) => {
            const p = at(node.id);
            if (!p) return null;
            return (
              <Node
                key={node.id}
                node={node}
                claim={claims.get(node.id)}
                x={p.x}
                y={p.y}
                selected={selected === node.id}
                pinned={pinned.has(node.id)}
                onSelect={() => onSelect(selected === node.id ? null : node.id)}
                onDragStart={startNodeDrag(node.id)}
              />
            );
          })}
      </div>

      <div className={s.bar}>
        <span className={s.zoom}>{Math.round(view.scale * 100)}%</span>
        <button type="button" className={s.zoomButton} onClick={() => zoomBy(-0.15)} aria-label="Zoom out">−</button>
        <button type="button" className={s.zoomButton} onClick={() => zoomBy(0.15)} aria-label="Zoom in">+</button>
        <button type="button" className={s.fit} onClick={fit}>Fit</button>
        <span className={s.hint}>scroll to zoom · drag the background to pan · click a node for its record</span>
      </div>
    </div>
  );
}
