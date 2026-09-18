"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Panel } from "@/components/display";
import { Button } from "@/components/forms";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import { mayWriteResearch } from "../_route-context";
import { PageHead } from "../_components/page-head";
import { Query, useContext } from "../_hooks";
import { sourcesQuery, workingNotesQuery } from "../_queries";
import { dateLabel, investigationPath, sourceHref } from "./_shared";
import s from "./investigation.module.css";

export function OverviewScreen({ workspace }: { workspace: string }) {
  const { shell } = useContext();
  const sources = useQuery({ queryKey: [...keys.sources.list(workspace), "recent"], queryFn: () => sourcesQuery(workspace) });
  const notes = useQuery({ queryKey: keys.notes.list(workspace), queryFn: () => workingNotesQuery(workspace) });
  const mayWrite = mayWriteResearch(shell?.context?.workspace);
  return <>
    <PageHead title={shell?.context?.workspace.name ?? "Investigation"} actions={mayWrite ? <Button intent="primary" asChild><Link href={`${investigationPath(workspace, "sources")}#add-source`}>Add source</Link></Button> : undefined}>Build a sourced account. Keep what a source says separate from your interpretation.</PageHead>
    <div className={s.columns}>
      <Panel title="Recent sources" actions={<Link href={investigationPath(workspace, "sources")} className={s.inlineLink}>All sources</Link>}>
        <Query of={sources} label="recent sources">{(page) => page.items.length ? <div className={s.stack}>{page.items.slice(0, 5).map((source) => <Link key={source.source_id} href={sourceHref(workspace, source.source_id)} className={s.sourceCard}><strong className={s.sourceTitle}>{source.title}</strong><span className={s.muted}>{source.latest_capture ? `Text retained · v${source.latest_capture.version}` : "URL reference only"} · {dateLabel(source.created_at)}</span></Link>)}</div> : <div className={s.empty}><Text size="sm">Your first source starts the record.</Text><Text size="sm" tone="tertiary">Add text or a file, read it, then cite the passage that supports an observation.</Text><Link href={investigationPath(workspace, "sources")} className={s.inlineLink}>Open sources</Link></div>}</Query>
      </Panel>
      <div className={s.stack}>
        <Panel title="Working question & notes" actions={<Link href={investigationPath(workspace, "notes")} className={s.inlineLink}>{mayWrite ? "Write a note" : "All notes"}</Link>}>
          <Query of={notes} label="working notes">{(all) => all.length ? <div className={s.stack}>{all.slice(0, 3).map((note) => <div key={note.note_id} className={s.note}><p className={s.body}>{note.body}</p><Text size="xs" tone="tertiary">{dateLabel(note.updated_at)}</Text></div>)}</div> : <Text size="sm" tone="tertiary">What are you trying to understand? Record the question, possible explanations, and what would help distinguish them.</Text>}</Query>
        </Panel>
        {!shell?.context?.workspace.closed ? <Panel title="Collection tools"><Text size="sm" tone="tertiary">Existing runners and security research remain available for investigations that need them.</Text><div className={s.row}><Link href="/tools/installed" className={s.inlineLink}>Collection settings</Link><Link href="/observability/runs" className={s.inlineLink}>Collection activity</Link></div></Panel> : null}
      </div>
    </div>
  </>;
}
