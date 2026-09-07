"use client";

import type { ReactNode } from "react";
import { Badge, Presence } from "@/components/display";
import { Text } from "@/components/typography";
import { absent, present, unattempted } from "@/lib/kernel";
import type { Asset, Fragment } from "@/lib/services/entities";
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
  target,
  onClose,
  pending,
  footer,
}: {
  workspaceId: string;
  row: Fragment | Asset | null;
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
