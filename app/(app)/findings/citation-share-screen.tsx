"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Alert } from "@/components/feedback";
import { Badge, Panel } from "@/components/display";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import { sharedCitationQuery } from "../_queries";
import { PageHead } from "../_components/page-head";
import { NoWorkspace, Query, useContext } from "../_hooks";
import s from "../surface/surface.module.css";

export function CitationShareScreen({ token }: { token: string }) {
  const { workspace } = useContext();
  const selectedWorkspace = useSearchParams().get("workspace") ?? workspace;
  const citation = useQuery({
    queryKey: keys.sources.sharedCitation(selectedWorkspace ?? "", token),
    queryFn: () => sharedCitationQuery(selectedWorkspace!, token),
    enabled: Boolean(selectedWorkspace),
    retry: false,
  });

  if (!selectedWorkspace) return <><PageHead title="Shared citation">A recipient-safe view of one cited passage.</PageHead><NoWorkspace what="A shared citation" /></>;

  return <Query of={citation} label="the shared citation">{(data) => <>
    <PageHead title={data.source_title}>Shared citation context</PageHead>
    <Alert tone="info"><Text size="sm"><strong>Recipient-safe view.</strong> This link shows the exact statement and quoted passage while omitting {data.redactions.join(", ")}.</Text></Alert>
    <Panel title="Citation context">
      <div className={s.stack}>
        <div className={s.row}><Badge tone="accent">{data.visibility}</Badge><Badge tone="neutral">{data.derived ? "Derived text" : data.media_type}</Badge></div>
        <Text size="sm" className={s.value}>{data.statement}</Text>
        <blockquote className={s.quote}>{data.quote}</blockquote>
        {data.locator ? <Text size="sm" tone="tertiary">Location: {data.locator}</Text> : null}
      </div>
    </Panel>
    <Panel title="Source context">
      <dl className={s.metadata}>
        <dt>Source</dt><dd>{data.source_title}</dd>
        <dt>Origin</dt><dd>{data.source_origin}</dd>
        {data.source_url ? <><dt>Original URL</dt><dd><a href={data.source_url} target="_blank" rel="noopener noreferrer" className={s.inlineLink}>{data.source_url} ↗</a></dd></> : null}
        <dt>Capture</dt><dd>Version {data.capture_version} · {data.media_type}</dd>
        <dt>Captured</dt><dd>{dateLabel(data.captured_at)}</dd>
      </dl>
    </Panel>
  </>}</Query>;
}

function dateLabel(value: string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
