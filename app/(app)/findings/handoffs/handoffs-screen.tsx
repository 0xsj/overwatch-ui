"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Badge, Panel } from "@/components/display";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import { briefRecipientHandoffsQuery } from "../../_queries";
import { PageHead } from "../../_components/page-head";
import { NoWorkspace, Query, useContext } from "../../_hooks";
import s from "../../surface/surface.module.css";

export function RecipientHandoffsScreen() {
  const { workspace } = useContext();
  const selectedWorkspace = useSearchParams().get("workspace") ?? workspace;
  const handoffs = useQuery({
    queryKey: keys.brief.handoffs(selectedWorkspace ?? ""),
    queryFn: () => briefRecipientHandoffsQuery(selectedWorkspace!),
    enabled: Boolean(selectedWorkspace),
  });

  if (!selectedWorkspace) return <><PageHead title="Recipient handoffs">Safe, shareable views of frozen research handoffs.</PageHead><NoWorkspace what="Recipient handoffs" /></>;

  return <>
    <PageHead title="Recipient handoffs">Safe, shareable views of frozen research handoffs. Citations, source details, internal identifiers, and reviewer conversation stay behind the research boundary.</PageHead>
    <Query of={handoffs} label="recipient handoffs">{(page) => page.items.length ? <div className={s.steps}>{page.items.map((handoff) => <Link key={handoff.snapshot_id} href={`/findings/handoffs/${encodeURIComponent(handoff.snapshot_id)}?workspace=${encodeURIComponent(selectedWorkspace)}`} className={s.step}>
      <Badge tone="accent">Recipient view</Badge>
      <div><Text size="sm">{handoff.title}</Text><Text size="xs" tone="tertiary">Frozen {dateLabel(handoff.frozen_at)} · {handoff.questions.length} question{handoff.questions.length === 1 ? "" : "s"} · {handoff.events.length} event{handoff.events.length === 1 ? "" : "s"}</Text><Text size="sm" tone="tertiary" className={s.prose}>{handoff.question}</Text></div>
    </Link>)}</div> : <Panel title="No frozen handoffs yet"><Text size="sm" tone="tertiary">When a research brief is frozen, its recipient-safe view will appear here.</Text></Panel>}</Query>
  </>;
}

function dateLabel(value: string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
