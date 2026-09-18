"use client";

import type { ReactNode } from "react";
import { Badge, Presence } from "@/components/display";
import { Text } from "@/components/typography";
import { absent, present, unattempted } from "@/lib/kernel";
import type { Asset, Fragment, FragmentDetail } from "@/lib/services/entities";
import type { Target } from "@/lib/services/targets";
import {
  RecordDrawer,
  RecordField,
  RecordFields,
  RecordSection,
} from "../../_components/record-drawer";
import s from "../surface.module.css";

/** One asset, and the two rows the mock made load-bearing.
 *
 *      attributed: yes / rule      it is theirs
 *      permitted:  ● rule r1       a tool may touch it
 *
 *  For a host, ip, cidr, asn or url they cite the SAME rule, because a
 *  spawn-gated fragment is attributed precisely because the run that found it
 *  was permitted. It is shown twice on purpose: the two labels are two
 *  questions, and collapsing them is the pair `CLAUDE.md` refuses to let
 *  collapse. */
export function AssetDrawer({
  workspaceId: _workspaceId,
  row,
  detail,
  nameOf,
  target,
  onClose,
  pending,
  footer,
}: {
  workspaceId: string;
  row: Fragment | Asset | null;
  /** `null` until the read lands. The drawer opens on the row it already has
   *  rather than waiting, because both edge kinds are extra rather than
   *  essential to identifying what you clicked. */
  detail: FragmentDetail | null;
  /** The far end of a derivation is an id on the wire and the detail does not
   *  carry its value, so the table lends the labels it already holds. A miss
   *  falls back to the id rather than to a blank. */
  nameOf: (fragmentId: string) => string | undefined;
  target?: Target;
  onClose: () => void;
  pending: boolean;
  footer: ReactNode;
}) {
  const asset = row && "attribution_id" in row ? row : null;

  return (
    <RecordDrawer
      open={row !== null}
      onOpenChange={(open) => { if (!open) onClose(); }}
      title={row?.value ?? ""}
      badges={
        <>
          <Badge mono>{row?.kind}</Badge>
          {asset ? <Badge tone="accent">asset</Badge> : <Badge tone="neutral">not an asset</Badge>}
          {pending ? <Badge tone="neutral">saving</Badge> : null}
        </>
      }
      aside={row?.last_seen}
    >
      <RecordSection heading="What is known">
        <RecordFields>
          <RecordField label="observations">
            {/* A count of statements, not of things. Two runs a day apart are
                two statements about the same value. */}
            <Presence of={row && row.observations > 0 ? present(row.observations) : absent()} />
          </RecordField>
          <RecordField label="origin">
            <span className={s.mono}>{row?.origin}</span>
          </RecordField>
          <RecordField label="first seen">
            {row?.first_seen ? (
              <span className={s.mono}>{row.first_seen}</span>
            ) : (
              <span className={s.quiet}>– typed in, so nothing has seen it</span>
            )}
          </RecordField>
          <RecordField label="last seen">
            {row?.last_seen ? (
              <span className={s.mono}>{row.last_seen}</span>
            ) : (
              <span className={s.quiet}>–</span>
            )}
          </RecordField>
        </RecordFields>
      </RecordSection>

      <RecordSection heading="Why this is attributed">
        {asset ? (
          <>
            <div className={s.drawerRow}>
              <Badge mono>attributed</Badge>
              <Badge tone="accent">yes</Badge>
              <Badge mono>{asset.claimant}</Badge>
              {/* ABSENT when a RULE decided — never "unknown", and never a
                  blank beside a label that says who. */}
              <span className={s.quiet}>
                {asset.claimant === "rule" ? "by a rule — no person ruled" : "proposed"}
              </span>
            </div>
            <Text size="sm" tone="secondary" className={s.prose}>{asset.basis}</Text>
            <div className={s.drawerRow}>
              <Badge mono>permitted</Badge>
              {/* The SAME rule for a spawn-gated kind, and it is a different
                  question: a tool may touch it. Shown separately rather than
                  merged into the row above. */}
              <span className={s.quiet}>
                a rule permitted the run that found it — the scope screen holds
                the rule itself
              </span>
            </div>
            {target ? (
              <Text size="xs" tone="tertiary" className={s.prose}>
                Attributed to {target.name} · {target.kind}.
              </Text>
            ) : null}
          </>
        ) : (
          <>
            <Presence of={absent()} />
            <Text size="sm" tone="secondary" className={s.prose}>
              Nothing has claimed this belongs to the target. It is still a real
              record of something a source said — which is why it is on a screen
              at all, just not on the asset table.
            </Text>
          </>
        )}
      </RecordSection>

      <RecordSection heading="Read, and ruled">
        <RecordFields>
          <RecordField label="read by a person">
            {row?.read_at ? (
              <span className={s.mono}>{row.read_at} · {row.read_by}</span>
            ) : (
              <Presence of={absent()} />
            )}
          </RecordField>
          <RecordField label="judgement">
            <Badge mono>{row?.judgement.state}</Badge>
          </RecordField>
          <RecordField label="ruled by">
            {row?.judgement.by ? (
              <span className={s.mono}>{row.judgement.by}</span>
            ) : (
              <Presence of={absent()} />
            )}
          </RecordField>
          <RecordField label="reason">
            {row?.judgement.reason ? (
              <span>{row.judgement.reason}</span>
            ) : (
              <Presence of={unattempted()} />
            )}
          </RecordField>
        </RecordFields>
        {footer}
      </RecordSection>

      {/* THE SECOND EDGE KIND — `decisions/0003`, and it finally has a
          producer. Its own section rather than folded in beside the
          attributions, because the two shapes are DISJOINT: a derivation has no
          claimant, no confidence and no state, and there is nothing here to
          accept. One source said so, and the bytes are on disk. */}
      <RecordSection
        heading="Read out of"
        count={detail?.derivations.length}
      >
        {!detail ? (
          <Text size="xs" tone="tertiary">reading…</Text>
        ) : detail.derivations.length === 0 ? (
          <>
            <Presence of={absent()} />
            <Text size="xs" tone="tertiary" className={s.prose}>
              Nothing was read out of anything to produce this. A derivation is
              drawn from the field a tool echoes its input in — so a source
              tool&rsquo;s output has none, and a chain of one step draws none.
            </Text>
          </>
        ) : (
          <div className={s.rows}>
            {detail.derivations.map((d) => (
              <div key={d.derivation_id} className={s.drawerRow}>
                <span className={s.mono}>
                  {d.to === row?.fragment_id ? "←" : "→"}
                </span>
                {/* The label is the whole difference between a line and an
                    explanation. */}
                <Badge mono>{d.label}</Badge>
                <span className={s.mono}>
                  {(() => {
                    const far = d.to === row?.fragment_id ? d.from : d.to;
                    return nameOf(far) ?? far.slice(0, 8);
                  })()}
                </span>
                {/* NEVER absent. An edge without these is a similarity edge
                    wearing a costume, which §out_of_scope bans outright — so
                    they are rendered rather than treated as optional. */}
                <Text size="xs" tone="tertiary">
                  invocation {d.invocation_id.slice(0, 8)} · artifact{" "}
                  {d.artifact_id.slice(0, 8)}
                </Text>
              </div>
            ))}
          </div>
        )}
        <Text size="xs" tone="tertiary" className={s.prose}>
          A derivation is <strong>not a claim</strong> — there is nothing here to
          accept or reject. It is what a tool emitted, with an invocation and an
          artifact behind it.
        </Text>
      </RecordSection>

      <RecordSection heading="Findings">
        <Presence of={unattempted()} />
        <Text size="xs" tone="tertiary" className={s.prose}>
          A finding is <strong>not a judgement</strong> — a fragment can be
          watching and carry an open finding at once, so it is a badge beside the
          judgement rather than a fifth value inside it. Nothing serves findings
          yet.
        </Text>
      </RecordSection>
    </RecordDrawer>
  );
}
