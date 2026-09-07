"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Badge, Panel, Stat } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Button } from "@/components/forms";
import { NavLink } from "@/components/navigation";
import { Text } from "@/components/typography";
import type { Attribution, ClaimState, EntityGraph, EntityRef, Pin } from "@/lib/services/entities";
import { pinNode, relayout } from "../_actions";
import { Canvas } from "./canvas";
import { Inspector } from "./inspector";
import { Legend, NoSimilarity } from "./legend";
import { KIND_GLYPH } from "./glyphs";
import type { Point } from "../_layout/place";
import s from "./entity-canvas.module.css";

const STATES: ClaimState[] = ["accepted", "proposed", "rejected"];
const STATE_NOTE: Record<ClaimState, string> = {
  accepted: "claims somebody ruled on",
  proposed: "awaiting a decision",
  rejected: "kept, so it is not re-proposed",
};

export function EntityCanvas({
  graph,
  roots,
  pins: initialPins,
}: {
  graph: EntityGraph;
  roots: readonly EntityRef[];
  pins: readonly Pin[];
}) {
  const [pins, setPins] = useState<readonly Pin[]>(initialPins);
  const [selected, setSelected] = useState<string | null>(null);
  const [hidden, setHidden] = useState<ReadonlySet<ClaimState>>(new Set());
  const [, start] = useTransition();

  const counts = STATES.reduce(
    (acc, state) => {
      acc[state] = graph.edges.filter(
        (e): e is Attribution => e.kind === "attribution" && e.state === state,
      ).length;
      return acc;
    },
    {} as Record<ClaimState, number>,
  );
  const derivations = graph.edges.filter((e) => e.kind === "derivation").length;

  function onPin(nodeId: string, at: Point) {
    setPins((current) => [
      ...current.filter((p) => p.node_id !== nodeId),
      { node_id: nodeId, x: at.x, y: at.y, by: "you", at: "just now" },
    ]);
    start(() => {
      void pinNode(graph.root.id, nodeId, at.x, at.y);
    });
  }

  function onRelayout() {
    setPins([]);
    start(() => {
      void relayout(graph.root.id);
    });
  }

  function toggle(state: ClaimState) {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(state)) next.delete(state);
      else next.add(state);
      return next;
    });
  }

  return (
    <>
      <div className={s.switcher} role="group" aria-label="Root entity">
        {roots.map((root) => (
          <NavLink key={root.id} asChild active={root.id === graph.root.id}>
            <Link
              href={`/entities/canvas?root=${encodeURIComponent(root.id)}`}
              className={s.root}
            >
              <span className={s.rootKind} aria-hidden="true">{KIND_GLYPH[root.kind]} {root.kind}</span>
              {root.label}
              <span className={s.rootCount}>{root.total}</span>
            </Link>
          </NavLink>
        ))}
        <Text size="xs" tone="quiet" as="span" className={s.aside}>
          three roots, three shapes — the machinery is the same
        </Text>
      </div>

      {graph.root.caution ? (
        <Alert tone="info" live={false} className={s.caution}>
          <Text size="sm">{graph.root.caution}</Text>
        </Alert>
      ) : null}

      <Text size="sm" tone="secondary" measure className={s.blurb}>{graph.root.blurb}</Text>

      <div className={s.stats}>
        <Stat label="Root" value={graph.root.label} note={`${graph.root.kind} · ${graph.root.framing}`} />
        <Stat label="Accepted" value={counts.accepted} note={STATE_NOTE.accepted} tone="accent" />
        <Stat label="Proposed" value={counts.proposed} note={STATE_NOTE.proposed} tone="warn" />
        <Stat label="Rejected" value={counts.rejected} note={counts.rejected ? STATE_NOTE.rejected : "none yet"} />
        <Stat label="Derivations" value={derivations} note="read out of something, not claimed" tone="info" />
      </div>

      <div className={s.controls}>
        <span className={s.controlLabel}>Show</span>
        {STATES.map((state) => (
          <button
            key={state}
            type="button"
            className={s.filter}
            aria-pressed={!hidden.has(state)}
            onClick={() => toggle(state)}
          >
            {state}
            <span className={s.filterCount}>{counts[state]}</span>
          </button>
        ))}
        <Button size="sm" intent="ghost" className={s.relayout} onClick={onRelayout}>
          Re-layout
        </Button>
        {pins.length ? (
          <Badge tone="accent" mono>{pins.length} pinned</Badge>
        ) : null}
      </div>

      <div className={s.truncation}>
        <span aria-hidden="true">▲</span>
        {graph.truncated ? (
          <span>
            <strong>Showing {graph.nodes.length} of {graph.total} fragments.</strong> The rest are not
            hidden because they are unimportant — the server was asked for a neighbourhood.{" "}
            <Link href={`/entities/canvas?root=${encodeURIComponent(graph.root.id)}&limit=${graph.total}`}>
              Ask for all {graph.total}
            </Link>
          </span>
        ) : (
          <span>
            <strong>All {graph.total} fragments drawn.</strong> This is what the neighbourhood was
            holding back, and why it is not optional — a canvas is for a neighbourhood you can read,
            and a list is what handles this.{" "}
            <Link href={`/entities/canvas?root=${encodeURIComponent(graph.root.id)}`}>
              Back to the neighbourhood
            </Link>
          </span>
        )}
      </div>

      <Canvas
        graph={graph}
        pins={pins}
        hidden={hidden}
        selected={selected}
        onSelect={setSelected}
        onPin={onPin}
      />

      <div className={s.below}>
        <Inspector graph={graph} selectedId={selected} />
        <Panel title="What the lines mean">
          <Legend />
        </Panel>
      </div>

      <NoSimilarity />
    </>
  );
}
