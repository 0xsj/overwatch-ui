"use client";

import Link from "next/link";
import { Badge } from "@/components/display";
import { Text } from "@/components/typography";
import { absent, present, unattempted } from "@/lib/kernel";
import { Presence } from "@/components/display";
import type { Attribution, EntityGraph } from "@/lib/services/entities";
import {
  RecordDrawer,
  RecordField,
  RecordFields,
  RecordSection,
} from "../../../_components/record-drawer";
import { KIND_GLYPH } from "./glyphs";
import s from "./record.module.css";

const STATE_TONE = { accepted: "accent", proposed: "warn", rejected: "neutral" } as const;
const STATE_GLYPH = { accepted: "✓", proposed: "?", rejected: "✕" } as const;

export function Record({
  graph,
  selectedId,
  onClose,
}: {
  graph: EntityGraph;
  selectedId: string | null;
  onClose: () => void;
}) {
  const isRoot = selectedId === graph.root.id;
  const node = isRoot ? graph.root : graph.nodes.find((n) => n.id === selectedId);
  const claim = graph.edges.find(
    (e): e is Attribution => e.kind === "attribution" && e.to === selectedId,
  );

  const derivations = graph.edges.filter((e) => e.kind === "derivation");
  const inbound = derivations.filter((e) => e.to === selectedId);
  const outbound = derivations.filter((e) => e.from === selectedId);
  const labelOf = (id: string) =>
    id === graph.root.id ? graph.root.label : (graph.nodes.find((n) => n.id === id)?.label ?? id);

  // `source` is "tool · artifact" on the wire — a display string the lineage
  // screen will eventually replace with two real fields.
  const [tool, artifact] = (node?.source ?? " · ").split(" · ");

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
      aside={node?.last_seen}
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
            {claim.actor ? <span className={s.actor}>{claim.actor}</span> : null}
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
            label="source"
            action={<Link href="/surface/lineage" className={s.link}>lineage →</Link>}
          >
            <span className={s.mono}>{tool}</span>
          </RecordField>
          <RecordField label="artifact">
            {artifact && artifact !== "none" ? (
              <span className={s.mono}>{artifact}</span>
            ) : (
              <Presence of={unattempted()} />
            )}
          </RecordField>
          <RecordField label="observations">
            <Presence
              of={node && node.observations > 0 ? present(node.observations) : absent()}
            />
          </RecordField>
          <RecordField label="first seen">
            <span className={s.mono}>{node?.last_seen}</span>
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
