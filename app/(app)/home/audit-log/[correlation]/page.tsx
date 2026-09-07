import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Panel } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { clientFor } from "@/lib/root";
import { getChain, type ChainStep } from "@/lib/services/ledger";
import { PageHead } from "../../../_components/page-head";
import s from "./chain.module.css";

export const metadata: Metadata = { title: "One act — Overwatch" };

/** A chain is read as a story, so it arrives oldest first and stays that way.
 *
 *  `depth` is the indent and nothing more. It is NOT a tree: a caller may see
 *  part of a chain and is never told how much is missing, so depths can be
 *  non-contiguous and step *n* may have no parent in the list. Building a tree
 *  would need a parent, and inventing one turns a partial view into a wrong
 *  claim about what caused what. */
export default async function Page({
  params,
}: {
  params: Promise<{ correlation: string }>;
}) {
  const { correlation } = await params;

  let steps: ChainStep[] | null = null;
  try {
    steps = await getChain(await clientFor("ledger"), correlation);
  } catch {
    steps = null;
  }

  return (
    <>
      <PageHead title="One act, end to end">
        Everything that happened because of a single request, joined by one
        correlation id. Registration is three steps across three domains — an
        account, then an org, then a workspace — because it is a chain rather than
        a transaction.
      </PageHead>

      <Link href="/home/audit-log" className={s.back}>← back to the audit log</Link>

      <Panel
        title={correlation}
        note="Oldest first. Indent is the step's own depth, not a parent — you may be seeing part of this."
      >
        {steps === null ? (
          <Text size="sm" tone="tertiary">
            Never checked — this chain could not be read.
          </Text>
        ) : steps.length === 0 ? (
          <Text size="sm" tone="tertiary">Nothing under this id.</Text>
        ) : (
          <ol className={s.chain}>
            {steps.map((step, i) => (
              <li
                key={`${step.action}:${i}`}
                className={s.step}
                style={{ marginInlineStart: `${Math.min(step.depth, 6) * 20}px` }}
                data-decision={step.decision || undefined}
              >
                <span className={s.dot} aria-hidden="true" />
                <span className={s.action}>{step.action}</span>
                {/* A choice somebody made and work the machinery did must not
                    render identically — decisions/0014. */}
                <Badge tone={step.decision ? "accent" : "neutral"} mono>
                  {step.decision ? "decision" : "machinery"}
                </Badge>
                <span className={s.subject}>{step.subject}</span>
                <span className={s.when}>
                  {step.occurred_at.slice(11, 23)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      <Alert tone="info">
        <Text size="sm">
          A gap in the indent is not a missing row on this screen. You are shown the
          steps you may see, and never told how many you may not — which is the
          same rule that keeps an engagement you have no grant on out of your
          switcher.
        </Text>
      </Alert>
    </>
  );
}
