"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Panel } from "@/components/display";
import { keys } from "@/lib/query";
import type { AuditEntry } from "@/lib/services/ledger";
import { noteHref } from "@/lib/services/notes/navigation";
import { workspaceAuditQuery } from "../_queries";
import { PageHead } from "../_components/page-head";
import { AuditTable } from "../_components/audit-table";
import { FacetRow } from "../_components/facet-row";
import { Query, useContext } from "../_hooks";
import { investigationPath } from "./_shared";

export function InvestigationActivityScreen({ workspace }: { workspace: string }) {
  const params = useSearchParams();
  const after = params.get("after") ?? undefined;
  const facet = params.get("facet") ?? undefined;
  const { shell } = useContext();
  const query = useQuery({
    queryKey: keys.ledger.workspace(workspace, after, facet),
    queryFn: () => workspaceAuditQuery(workspace, after, facet),
    retry: false,
  });

  return <>
    <PageHead title="Investigation activity">
      A resumable record of authored changes in this investigation. Audit answers who changed what; these links return you to the research object that needs attention.
    </PageHead>
    <Panel title={shell?.context?.workspace.name ?? "Investigation activity"} note="Workspace-scoped activity only. Facets and cursors are served by the audit ledger; this screen does not infer a total.">
      <Query of={query} label="investigation activity">{(page) => <>
        <FacetRow facets={page.facets ?? []} active={facet} href={(next) => activityHref(workspace, next)} />
        <AuditTable
          entries={page.entries}
          next={page.next}
          more={(cursor) => activityHref(workspace, facet, cursor)}
          chainHref={(correlation) => `/home/audit-log/${encodeURIComponent(correlation)}`}
          resumeHref={(entry) => resumeHref(workspace, entry)}
          empty={facet ? `Nothing under “${facet}” in this investigation.` : "Nothing has been recorded in this investigation yet. Authored questions, records, events, connections, notes, and brief changes will appear here as work resumes."}
        /></>}
      </Query>
    </Panel>
  </>;
}

function activityHref(workspace: string, facet?: string, after?: string) {
  const params = new URLSearchParams();
  if (facet) params.set("facet", facet);
  if (after) params.set("after", after);
  const base = investigationPath(workspace, "activity");
  return `${base}${params.size ? `?${params.toString()}` : ""}`;
}

function resumeHref(workspace: string, entry: AuditEntry): string | undefined {
  const base = investigationPath(workspace);
  const detailID = (key: string) => typeof entry.detail[key] === "string" && entry.detail[key] ? entry.detail[key] as string : undefined;
  switch (entry.action) {
    case "lead.question.changed": {
      const id = detailID("question_id");
      return id ? `${base}/questions?question=${encodeURIComponent(id)}` : undefined;
    }
    case "research.entity.changed": {
      const id = detailID("record_id");
      return id ? `${base}/records?record=${encodeURIComponent(id)}` : undefined;
    }
    case "timeline.event.changed": {
      const id = detailID("event_id");
      return id ? `${base}/timeline?event=${encodeURIComponent(id)}` : undefined;
    }
    case "research.connection.changed": {
      const id = detailID("connection_id");
      return id ? `${base}/connections?connection=${encodeURIComponent(id)}` : undefined;
    }
    case "brief.working.changed":
      return `${base}/brief`;
    case "note.written": {
      const id = detailID("note_id");
      return id ? noteHref(workspace, id) : undefined;
    }
    case "brief.snapshot.created": {
      const id = detailID("snapshot_id");
      return id ? `${base}/brief/snapshots/${encodeURIComponent(id)}` : undefined;
    }
    default:
      return undefined;
  }
}
