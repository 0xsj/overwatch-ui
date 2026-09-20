"use client";

import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Alert } from "@/components/feedback";
import { Badge, Panel } from "@/components/display";
import { Button } from "@/components/forms";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import { downloadBriefRecipientHandoffMarkdown } from "@/lib/services/brief/export";
import { briefRecipientHandoffQuery, briefSharedHandoffQuery } from "../_queries";
import { exportRecipientHandoffAction, exportSharedHandoffAction } from "./_actions";
import { PageHead } from "../_components/page-head";
import { NoWorkspace, Query, useContext } from "../_hooks";
import s from "../surface/surface.module.css";

export function RecipientHandoffScreen({ snapshot, shareToken }: { snapshot?: string; shareToken?: string }) {
  const { workspace } = useContext();
  const selectedWorkspace = useSearchParams().get("workspace") ?? workspace;
  const handoff = useQuery({
    queryKey: shareToken ? keys.brief.sharedHandoff(selectedWorkspace ?? "", shareToken) : keys.brief.handoff(selectedWorkspace ?? "", snapshot ?? ""),
    queryFn: () => shareToken ? briefSharedHandoffQuery(selectedWorkspace!, shareToken) : briefRecipientHandoffQuery(selectedWorkspace!, snapshot!),
    enabled: Boolean(selectedWorkspace),
  });
  const exportHandoff = useMutation({
    mutationFn: async () => {
      const result = shareToken ? await exportSharedHandoffAction(selectedWorkspace!, shareToken) : await exportRecipientHandoffAction(selectedWorkspace!, snapshot!);
      if (!result.ok) throw new Error(result.message);
      return result.value;
    },
    onSuccess: (value) => downloadBriefRecipientHandoffMarkdown(value),
  });

  if (!selectedWorkspace) return <><PageHead title="Recipient handoff">A safe, shareable view of frozen research.</PageHead><NoWorkspace what="A recipient handoff" /></>;

  return <Query of={handoff} label="the recipient handoff">{(data) => <>
    <PageHead title={data.title} actions={<div className={s.rows}><Button asChild intent="ghost"><Link href={`/findings/handoffs?workspace=${encodeURIComponent(selectedWorkspace)}`}>Back to handoffs</Link></Button><Button type="button" intent="primary" loading={exportHandoff.isPending} onClick={() => exportHandoff.mutate()}>{exportHandoff.isPending ? "Preparing export…" : "Download safe Markdown"}</Button></div>}>{shareToken ? "Opened from a revocable recipient share." : "Recipient-safe view of a frozen research handoff."}</PageHead>
    {exportHandoff.error ? <Alert tone="warn"><Text size="sm">{exportHandoff.error.message}</Text></Alert> : null}
    <Alert tone="info"><Text size="sm"><strong>Safe for recipients.</strong> This view intentionally omits {data.redactions.join(", ")}.</Text></Alert>
    <Panel title="Handoff metadata">
      <div className={s.rows}><Text size="xs" tone="tertiary">Frozen {dateLabel(data.frozen_at)} · source brief updated {dateLabel(data.source_updated_at)}</Text><Badge tone="accent">{data.visibility}</Badge></div>
    </Panel>
    <Panel title="Authored handoff">
      <div className={s.steps}>
        <HandoffSection title="Investigation question" value={data.question} />
        <HandoffSection title="Current account" value={data.current_account} />
        <HandoffSection title="Alternatives" value={data.alternatives} />
        <HandoffSection title="Limitations" value={data.limitations} />
        <HandoffSection title="Next steps" value={data.next_steps} />
      </div>
    </Panel>
    <Panel title="Evidence clusters at freeze">{data.clusters.length ? <div className={s.steps}>{data.clusters.map((cluster, index) => <div key={`${cluster.title}-${index}`} className={s.step}><Badge>{cluster.kind}</Badge><div><Text size="sm">{cluster.title}</Text>{cluster.description ? <Text size="sm" tone="tertiary" className={s.prose}>{cluster.description}</Text> : null}</div></div>)}</div> : <Text size="sm" tone="tertiary">No evidence clusters were included.</Text>}</Panel>
    <Panel title="Questions at freeze">{data.questions.length ? <div className={s.steps}>{data.questions.map((question, index) => <div key={`${question.question}-${index}`} className={s.step}><Badge tone={question.state === "open" ? "warn" : "neutral"}>{question.state}</Badge><div><Text size="sm">{question.question}</Text>{question.resolution ? <Text size="sm" tone="tertiary" className={s.prose}>{question.resolution}</Text> : null}</div></div>)}</div> : <Text size="sm" tone="tertiary">No questions were included.</Text>}</Panel>
    <Panel title="Connections at freeze">{data.connections.length ? <div className={s.steps}>{data.connections.map((connection, index) => <div key={`${connection.from_name}-${connection.to_name}-${index}`} className={s.step}><Badge>{connection.state}</Badge><div><Text size="sm">{connection.from_name} → {connection.to_name}</Text><Text size="xs" tone="tertiary">{connection.kind}</Text><Text size="sm" tone="tertiary" className={s.prose}>{connection.rationale}</Text></div></div>)}</div> : <Text size="sm" tone="tertiary">No connections were included.</Text>}</Panel>
    <Panel title="Events at freeze">{data.events.length ? <div className={s.steps}>{data.events.map((event, index) => <div key={`${event.title}-${index}`} className={s.step}><Badge>{event.time_precision}</Badge><div><Text size="sm">{event.title}</Text><Text size="xs" tone="tertiary">{[event.reported_time, event.sort_date, event.location].filter(Boolean).join(" · ")}</Text>{event.description ? <Text size="sm" tone="tertiary" className={s.prose}>{event.description}</Text> : null}</div></div>)}</div> : <Text size="sm" tone="tertiary">No events were included.</Text>}</Panel>
  </>}</Query>;
}

function HandoffSection({ title, value }: { title: string; value?: string }) {
  return <div className={s.step}><Text size="xs" tone="tertiary">{title}</Text><Text size="sm" className={s.value}>{value?.trim() || "Not recorded."}</Text></div>;
}

function dateLabel(value: string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
