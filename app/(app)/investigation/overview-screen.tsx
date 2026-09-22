"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Badge, Panel } from "@/components/display";
import { Button } from "@/components/forms";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import { mayWriteResearch } from "../_route-context";
import { PageHead } from "../_components/page-head";
import { Query, useContext } from "../_hooks";
import { briefQuery, evidenceQuery, researchRecordSummaryQuery, sourcesQuery, workingNotesQuery } from "../_queries";
import { dateLabel, investigationPath, sourceHref } from "./_shared";
import s from "./investigation.module.css";

export function OverviewScreen({ workspace }: { workspace: string }) {
  const { shell } = useContext();
  const sources = useQuery({ queryKey: [...keys.sources.list(workspace), "recent"], queryFn: () => sourcesQuery(workspace) });
  const notes = useQuery({ queryKey: keys.notes.list(workspace), queryFn: () => workingNotesQuery(workspace) });
  const evidence = useQuery({ queryKey: keys.evidence.list(workspace), queryFn: () => evidenceQuery(workspace), enabled: Boolean(sources.data?.items.length) });
  const records = useQuery({ queryKey: keys.records.summary(workspace), queryFn: () => researchRecordSummaryQuery(workspace), enabled: Boolean(sources.data?.items.length) });
  const brief = useQuery({ queryKey: keys.brief.one(workspace), queryFn: () => briefQuery(workspace), enabled: Boolean(sources.data?.items.length) });
  const mayWrite = mayWriteResearch(shell?.context?.workspace);
  return <>
    <PageHead title={shell?.context?.workspace.name ?? "Investigation"} actions={mayWrite ? <Button intent="primary" asChild><Link href={`${investigationPath(workspace, "sources")}#add-source`}>Add source</Link></Button> : undefined}>Build a sourced account. Keep what a source says separate from your interpretation.</PageHead>
    <Query of={sources} label="investigation start">
      {(page) => page.items.length === 0 ? <GettingStarted workspace={workspace} mayWrite={mayWrite} /> : (
        <Query of={evidence} label="evidence progress">
          {(evidencePage) => <Query of={records} label="entity progress">
            {(recordSummary) => <Query of={brief} label="brief progress">
              {(workingBrief) => <WorkflowProgress workspace={workspace} sourceCount={page.items.length} evidenceCount={evidencePage.items.length} recordCount={recordSummary.record_count} hasBrief={Boolean(workingBrief)} />}
            </Query>}
          </Query>}
        </Query>
      )}
    </Query>
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

function GettingStarted({ workspace, mayWrite }: { workspace: string; mayWrite: boolean }) {
  return (
    <Panel title="Start an investigation" note="Overwatch keeps retained source material, cited observations, and your authored account separate so every conclusion can be revisited.">
      <div className={s.stack}>
        <Text size="sm">Begin with something you can cite: an online reference, pasted text, or an imported file.</Text>
        <div className={s.stack}>
          <Link href={`${investigationPath(workspace, "sources")}#add-source`} className={s.investigationCard}>
            <span><strong>1. Add a source</strong><span className={s.muted}>Retain the material and its capture history.</span></span>
            <span className={s.inlineLink}>{mayWrite ? "Add source →" : "Open sources →"}</span>
          </Link>
          <div className={s.investigationCard}>
            <span><strong>2. Cite what it says</strong><span className={s.muted}>Select an exact passage and record an observation.</span></span>
            <Badge tone="neutral">after source</Badge>
          </div>
          <div className={s.investigationCard}>
            <span><strong>3. Build the account</strong><span className={s.muted}>Turn reviewed observations into records, relationships, and a brief.</span></span>
            <Badge tone="neutral">after evidence</Badge>
          </div>
        </div>
        {mayWrite ? <Text size="xs" tone="tertiary">Need the legacy collection workflow too? <Link href="/home/targets" className={s.inlineLink}>Add a target for collection →</Link></Text> : null}
      </div>
    </Panel>
  );
}

function WorkflowProgress({ workspace, sourceCount, evidenceCount, recordCount, hasBrief }: { workspace: string; sourceCount: number; evidenceCount: number; recordCount: number; hasBrief: boolean }) {
  const steps = [
    { label: "Retain a source", detail: `${sourceCount} source${sourceCount === 1 ? "" : "s"} in this investigation`, done: sourceCount > 0, href: investigationPath(workspace, "sources") },
    { label: "Record cited evidence", detail: evidenceCount ? `${evidenceCount} citation${evidenceCount === 1 ? "" : "s"} available to review` : "Select an exact passage from a retained capture", done: evidenceCount > 0, href: investigationPath(workspace, "evidence") },
    { label: "Create an authored record", detail: recordCount ? `${recordCount} research record${recordCount === 1 ? "" : "s"} created` : "Name the person, organization, place, or event supported by evidence", done: recordCount > 0, href: investigationPath(workspace, "records") },
    { label: "Draft the working brief", detail: hasBrief ? "A current account is ready to refine" : "Bring the reviewed account together with limitations and next steps", done: hasBrief, href: investigationPath(workspace, "brief") },
  ];
  const next = steps.find((step) => !step.done);
  return (
    <Panel title="Investigation progress" note={next ? `Next: ${next.label}. Each step stays linked to the evidence that supports it.` : "The core source-to-brief loop is established. Continue refining evidence, relationships, and handoff."}>
      <div className={s.stack}>
        {steps.map((step) => (
          <Link href={step.href} key={step.label} className={s.investigationCard}>
            <span><strong>{step.label}</strong><span className={s.muted}>{step.detail}</span></span>
            <Badge tone={step.done ? "accent" : "neutral"}>{step.done ? "done" : "next"}</Badge>
          </Link>
        ))}
      </div>
    </Panel>
  );
}
