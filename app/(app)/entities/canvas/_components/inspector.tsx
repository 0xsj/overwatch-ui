import Link from "next/link";
import { Badge, Panel } from "@/components/display";
import { SectionLabel, Text } from "@/components/typography";
import type { Attribution, EntityGraph, GraphNode, RootEntity } from "@/lib/services/entities";
import { KIND_GLYPH } from "./glyphs";
import s from "./inspector.module.css";

const STATE_TONE = { accepted: "accent", proposed: "warn", rejected: "neutral" } as const;

function Claim({ claim }: { claim: Attribution }) {
  return (
    <dl className={s.fields}>
      <div className={s.field}>
        <SectionLabel as="dt">state</SectionLabel>
        <dd><Badge tone={STATE_TONE[claim.state]}>{claim.state}</Badge></dd>
      </div>
      <div className={s.field}>
        <SectionLabel as="dt">claimed by</SectionLabel>
        <dd>
          <Badge mono>{claim.claimant}</Badge>
          {/* A rule carries no confidence. Rendering 1.00 here would destroy the
              distinction between a category and a very sure model. */}
          {claim.confidence !== undefined ? (
            <Badge mono tone="warn">{claim.confidence.toFixed(2)}</Badge>
          ) : (
            <span className={s.absent}>no confidence — a rule asserts a category, not a probability</span>
          )}
        </dd>
      </div>
      {claim.actor ? (
        <div className={s.field}>
          <SectionLabel as="dt">ruled by</SectionLabel>
          <dd><span className={s.mono}>{claim.actor}</span></dd>
        </div>
      ) : null}
      <div className={s.field}>
        <SectionLabel as="dt">basis</SectionLabel>
        <dd className={s.basis}>{claim.basis}</dd>
      </div>
    </dl>
  );
}

export function Inspector({
  graph,
  selectedId,
}: {
  graph: EntityGraph;
  selectedId: string | null;
}) {
  if (!selectedId) {
    return (
      <Panel title="Record">
        <Text size="sm" tone="tertiary">
          Nothing selected. Click a node to see the claim that put it on this canvas, and what it
          was read out of.
        </Text>
      </Panel>
    );
  }

  const isRoot = selectedId === graph.root.id;
  const node: RootEntity | GraphNode | undefined = isRoot
    ? graph.root
    : graph.nodes.find((n) => n.id === selectedId);
  if (!node) return null;

  const claim = graph.edges.find(
    (e): e is Attribution => e.kind === "attribution" && e.to === selectedId,
  );

  const derivations = graph.edges.filter((e) => e.kind === "derivation");
  const inbound = derivations.filter((e) => e.kind === "derivation" && e.to === selectedId);
  const outbound = derivations.filter((e) => e.kind === "derivation" && e.from === selectedId);
  const labelOf = (id: string) =>
    id === graph.root.id ? graph.root.label : (graph.nodes.find((n) => n.id === id)?.label ?? id);

  return (
    <Panel
      title={
        <span className={s.heading}>
          <span aria-hidden="true">{KIND_GLYPH[node.kind]}</span>
          <span className={s.mono}>{node.label}</span>
        </span>
      }
      note={isRoot ? "the root of this canvas" : node.kind}
    >
      {claim ? (
        <Claim claim={claim} />
      ) : (
        <Text size="sm" tone="tertiary" className={s.rootNote}>
          The root is the entity, not a fragment of it — so nothing claims it. Every attribution on
          this canvas runs from here outward.
        </Text>
      )}

      <dl className={s.fields}>
        <div className={s.field}>
          <SectionLabel as="dt">observations</SectionLabel>
          <dd><span className={s.mono}>{node.observations}</span></dd>
        </div>
        <div className={s.field}>
          <SectionLabel as="dt">last seen</SectionLabel>
          <dd><span className={s.mono}>{node.last_seen}</span></dd>
        </div>
        <div className={s.field}>
          <SectionLabel as="dt">source</SectionLabel>
          <dd><span className={s.mono}>{node.source}</span></dd>
        </div>
      </dl>

      {inbound.length || outbound.length ? (
        <div className={s.derivations}>
          <SectionLabel as="h4" className={s.subhead}>Read out of, and read into</SectionLabel>
          {inbound.map((e) =>
            e.kind === "derivation" ? (
              <p key={`in:${e.from}:${e.label}`} className={s.derivation}>
                <span className={s.arrow} aria-hidden="true">←</span>
                <span className={s.mono}>{labelOf(e.from)}</span>
                <span className={s.act}>{e.label}</span>
                <span className={s.artifact}>{e.artifact_id}</span>
              </p>
            ) : null,
          )}
          {outbound.map((e) =>
            e.kind === "derivation" ? (
              <p key={`out:${e.to}:${e.label}`} className={s.derivation}>
                <span className={s.arrow} aria-hidden="true">→</span>
                <span className={s.mono}>{labelOf(e.to)}</span>
                <span className={s.act}>{e.label}</span>
                <span className={s.artifact}>{e.artifact_id}</span>
              </p>
            ) : null,
          )}
        </div>
      ) : null}

      {!isRoot && "entity_id" in node && node.entity_id ? (
        <Link className={s.jump} href={`/entities/canvas?root=${encodeURIComponent(node.entity_id)}`}>
          This fragment is assembled as an entity of its own — open its canvas →
        </Link>
      ) : null}
    </Panel>
  );
}
