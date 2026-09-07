"use client";

import Link from "next/link";
import { useCallback, useState, useSyncExternalStore } from "react";
import { Badge, Panel, Stat } from "@/components/display";
import { Button, Toggle } from "@/components/forms";
import { NavLink } from "@/components/navigation";
import { Text } from "@/components/typography";
import type { ClaimState, Pin } from "@/lib/services/entities";
import type { ViewGraph, ViewRef } from "../_layout/graph";
import { pinSnapshot, serverPins, setPins, subscribePins } from "../_layout/pins";
import { Canvas } from "./canvas";
import { Record } from "./record";
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
}: {
  graph: ViewGraph;
  roots: readonly ViewRef[];
}) {
  /* Empty on the server and filled on the client, through the store rather
     than through an effect. `localStorage` is not readable while the HTML is
     being produced, so the server snapshot is unconditionally empty and React
     swaps it in after hydration — which is exactly what
     `useSyncExternalStore` is for, and it is why this is not `useState` plus
     an effect that sets it. */
  const rootId = graph.root.id;
  const pins = useSyncExternalStore<readonly Pin[]>(
    useCallback((onChange: () => void) => subscribePins(rootId)(onChange), [rootId]),
    useCallback(() => pinSnapshot(rootId), [rootId]),
    serverPins,
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [hidden, setHidden] = useState<ReadonlySet<ClaimState>>(new Set());
  const [focus, setFocus] = useState(false);

  const counts = STATES.reduce(
    (acc, state) => {
      acc[state] = graph.edges.filter(
        (e) => e.kind === "attribution" && e.state === state,
      ).length;
      return acc;
    },
    {} as Record<ClaimState, number>,
  );
  const derivations = graph.edges.filter((e) => e.kind === "derivation").length;

  function onPin(nodeId: string, at: Point) {
    setPins(rootId, [
      ...pins.filter((p) => p.fragment_id !== nodeId),
      { fragment_id: nodeId, x: at.x, y: at.y },
    ]);
  }

  function onRelayout() {
    setPins(rootId, []);
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
              {/* A target's ROOT, versus an entity assembled from fragments that
                  is nobody's target. The count that used to sit here was the
                  fixture's invention — the listing does not carry one, and a
                  made-up denominator on a switcher is worse than none. */}
              {root.target_id ? <span className={s.rootCount}>target</span> : null}
            </Link>
          </NavLink>
        ))}
        <Text size="xs" tone="quiet" as="span" className={s.aside}>
          {roots.length === 0
            ? "nothing assembled yet"
            : "an asset attributed to an organisation and a fragment attributed to a person are the same machinery at different roots"}
        </Text>
      </div>

      <Text size="sm" tone="secondary" measure className={s.blurb}>
        An entity is not a thing a source reported — it is an argument across many.
        Every node here is a fragment attached to the root by a claim that names
        who made it, and the root itself is not among them.
      </Text>

      <div className={s.stats}>
        <Stat
          label="Root"
          value={graph.root.label}
          note={graph.root.target_id ? `${graph.root.kind} · a target's root` : graph.root.kind}
        />
        <Stat label="Accepted" value={counts.accepted} note={STATE_NOTE.accepted} tone="accent" />
        <Stat label="Proposed" value={counts.proposed} note={STATE_NOTE.proposed} tone="warn" />
        <Stat label="Rejected" value={counts.rejected} note={counts.rejected ? STATE_NOTE.rejected : "none yet"} />
        {/* Zero, and it stays a row. `0003` forbids emitting a derivation that
            cannot be sourced, so the first one arrives with an invocation and an
            artifact in hand — and a canvas with no row for them would make their
            absence unreadable rather than stated. */}
        <Stat
          label="Derivations"
          value={derivations}
          note={derivations ? "read out of something, not claimed" : "none emitted yet — one needs an invocation and an artifact behind it"}
          tone="info"
        />
      </div>

      <div className={s.controls}>
        <span className={s.controlLabel}>Show</span>
        {STATES.map((state) => (
          <Toggle
            key={state}
            size="sm"
            shape="pill"
            className={s.filter}
            pressed={!hidden.has(state)}
            onPressedChange={() => toggle(state)}
          >
            {state}
            <span className={s.filterCount}>{counts[state]}</span>
          </Toggle>
        ))}
        <Button size="sm" intent="ghost" className={s.relayout} onClick={onRelayout}>
          Re-layout
        </Button>
        {pins.length ? (
          <Badge tone="accent" mono title="Kept in this browser. There is no pin endpoint — an arrangement of one viewport is not evidence, and it does not follow you to another machine.">
            {pins.length} pinned · this browser
          </Badge>
        ) : null}
      </div>

      <div className={s.truncation}>
        <span aria-hidden="true">▲</span>
        {/* There is no total on the wire, so this says what is DRAWN and whether
            the limit was reached — never "n of N". An invented N beside a real n
            is the one way this screen could lie about the size of an estate. */}
        {graph.truncated ? (
          <span>
            <strong>{graph.nodes.length} fragments drawn, and the limit was reached.</strong> The
            rest are not hidden because they are unimportant — the server was asked for a
            neighbourhood, and it says only that there was more.{" "}
            <Link href={`/entities/canvas?root=${encodeURIComponent(graph.root.id)}&limit=${graph.nodes.length * 4}`}>
              Ask for more
            </Link>
          </span>
        ) : (
          <span>
            <strong>All {graph.nodes.length} fragments drawn.</strong> The limit was not reached, so
            this is the whole neighbourhood rather than the part that fitted.
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
        focus={focus}
        onFocusChange={setFocus}
      />

      <Panel title="What the lines mean" className={s.key}>
        <Legend />
      </Panel>

            {/* The selection is one thing; whether the record is shown is another.
          Turning Focus off brings the drawer back for whatever you are on,
          rather than losing your place. */}
      <Record
        graph={graph}
        selectedId={focus ? null : selected}
        onClose={() => setSelected(null)}
      />

      <NoSimilarity />
    </>
  );
}
