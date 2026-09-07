"use client";

import Link from "next/link";
import { Badge } from "@/components/display";
import { Text } from "@/components/typography";
import { absent, present, unattempted } from "@/lib/kernel";
import { Presence } from "@/components/display";
import type { ViewEdge, ViewGraph, ViewNode } from "../_layout/graph";
import {
  RecordDrawer,
  RecordField,
  RecordFields,
  RecordSection,
} from "../../../_components/record-drawer";
import { KIND_GLYPH } from "./glyphs";
import s from "./record.module.css";

function SeenAt({
  at,
  node,
}: {
  at?: string;
  node?: ViewNode | ViewGraph["root"];
}) {
  if (at) return <span className={s.mono}>{at}</span>;
  if (node && "origin" in node && node.origin === "manual")
    return <span className={s.noConfidence}>– typed in, so nothing has seen it</span>;
  if (node && !("origin" in node))
    return <span className={s.noConfidence}>– an entity is not observed</span>;
  return <Presence of={unattempted()} />;
}

const STATE_TONE = { accepted: "accent", proposed: "warn", rejected: "neutral" } as const;
const STATE_GLYPH = { accepted: "✓", proposed: "?", rejected: "✕" } as const;

export function Record({
  graph,
  selectedId,
  onClose,
}: {
  graph: ViewGraph;
  selectedId: string | null;
  onClose: () => void;
}) {
  const isRoot = selectedId === graph.root.id;
  const node = isRoot ? graph.root : graph.nodes.find((n) => n.id === selectedId);
  const claim = graph.edges.find(
    (e): e is Extract<ViewEdge, { kind: "attribution" }> =>
      e.kind === "attribution" && e.to === selectedId,
  );

  const derivations = graph.edges.filter((e) => e.kind === "derivation");
  const inbound = derivations.filter((e) => e.to === selectedId);
  const outbound = derivations.filter((e) => e.from === selectedId);
  const labelOf = (id: string) =>
    id === graph.root.id ? graph.root.label : (graph.nodes.find((n) => n.id === id)?.label ?? id);

  return (
    <RecordDrawer
      open={selectedId !== null && node !== undefined}
      onOpenChange={(open) => { if (!open) onClose(); }}
      title={
        <>
          <span aria-hidden="true" className={s.glyph}>{node ? KIND_GLYPH[node.kind] : null}</span>
          {node?.label}
        </>
      }
      badges={
        <>
          <Badge mono>{node?.kind}</Badge>
          {isRoot ? <Badge tone="accent" glyph="◆">root</Badge> : null}
        </>
      }
      aside={node && "last_seen" in node ? node.last_seen : undefined}
    >
      {isRoot ? (
        <RecordSection heading="This is the root">
          <Text size="sm" tone="secondary" className={s.prose}>
            An entity is not a thing a source reported — it is <strong>an argument across
            many</strong>. Everything on this canvas is attached to it by a claim that names who
            made the claim.
          </Text>
        </RecordSection>
      ) : claim ? (
        <RecordSection heading={`Attribution to ${graph.root.label}`}>
          <div className={s.claim}>
            <Badge mono>{claim.claimant}</Badge>
            {/* Who RULED, which is never who proposed — `0008`'s title. Absent
                means a RULE decided, and `0036` is explicit that this is not a
                missing field: no person ruled on it. Rendering it as "unknown"
                would invite somebody to go looking for a name. */}
            {claim.state === "proposed" ? (
              <span className={s.actor}>nobody has ruled yet</span>
            ) : claim.decided_by ? (
              <span className={s.actor}>{claim.decided_by}</span>
            ) : (
              <span className={s.actor}>by a rule — no person ruled</span>
            )}
            {/* 0004: a rule's assignment is a category, not a probability. The
                absence is stated rather than left blank. */}
            {claim.confidence !== undefined ? (
              <Badge mono tone="warn">{claim.confidence.toFixed(2)}</Badge>
            ) : (
              <span className={s.noConfidence}>deterministic — no confidence</span>
            )}
            <Badge tone={STATE_TONE[claim.state]} glyph={STATE_GLYPH[claim.state]}>
              {claim.state}
            </Badge>
          </div>
          <Text size="sm" tone="secondary" className={s.prose}>{claim.basis}</Text>
        </RecordSection>
      ) : null}

      <RecordSection heading="Where it came from">
        <RecordFields>
          <RecordField
            label="origin"
            action={
              node && "origin" in node ? (
                <Link href="/surface/lineage" className={s.link}>lineage →</Link>
              ) : undefined
            }
          >
            {/* `observed` was read out of an artifact; `manual` was typed in — a
                /24 written into a scope rule. The root is neither: it is not a
                fragment, and nothing observed it. */}
            <span className={s.mono}>
              {node && "origin" in node ? node.origin : "not a fragment"}
            </span>
          </RecordField>
          <RecordField label="observations">
            <Presence
              of={
                node && "observations" in node && node.observations > 0
                  ? present(node.observations)
                  : absent()
              }
            />
          </RecordField>
          {/* BOTH absent on a manual fragment. It was typed in — a /24 written
              into a scope rule — so nothing has SEEN it, which is neither
              "never checked" nor "checked and found nothing". A dash with the
              reason beside it, and never a placeholder date. */}
          <RecordField label="first seen">
            <SeenAt at={node && "first_seen" in node ? node.first_seen : undefined} node={node} />
          </RecordField>
          <RecordField label="last seen">
            <SeenAt at={node && "last_seen" in node ? node.last_seen : undefined} node={node} />
          </RecordField>
          {/* A human READ, and it is NOT the judgement — `0037`. Absent means
              nobody has LOOKED, which is a different fact from nobody having
              ruled, and it is the whole of why READ BY YOU is a check. */}
          <RecordField label="read by a person">
            {node && "read_at" in node && node.read_at ? (
              <span className={s.mono}>{node.read_at}</span>
            ) : (
              <Presence of={absent()} />
            )}
          </RecordField>
          <RecordField label="judgement">
            <Badge mono>
              {node && "judgement" in node ? node.judgement.state : "—"}
            </Badge>
          </RecordField>
        </RecordFields>
      </RecordSection>

      <RecordSection heading="Derivation" count={inbound.length + outbound.length}>
        {inbound.length || outbound.length ? (
          <div className={s.derivations}>
            {[...inbound, ...outbound].map((e) =>
              e.kind === "derivation" ? (
                <p key={`${e.from}:${e.to}:${e.label}`} className={s.derivation}>
                  <span className={s.arrow} aria-hidden="true">
                    {e.to === selectedId ? "←" : "→"}
                  </span>
                  <span className={s.mono}>
                    {labelOf(e.to === selectedId ? e.from : e.to)}
                  </span>
                  <span className={s.act}>{e.label}</span>
                  <Badge mono>{e.artifact_id}</Badge>
                </p>
              ) : null,
            )}
          </div>
        ) : (
          <Presence of={absent()} />
        )}
        <Text size="xs" tone="tertiary" className={s.prose}>
          A derivation is <strong>not a claim</strong> — there is nothing here to accept. One
          source said so, and the bytes are on disk.
        </Text>
      </RecordSection>

      <RecordSection heading="Seen in other engagements">
        <Presence of={unattempted()} />
        <Text size="xs" tone="tertiary" className={s.prose}>
          Cross-target identity is undecided — entities are scoped to a target in the contract as
          drafted, and nothing is joined.
        </Text>
      </RecordSection>
    </RecordDrawer>
  );
}
