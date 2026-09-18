"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Field, Input } from "@/components/forms";
import { Alert } from "@/components/feedback";
import { Panel, Badge } from "@/components/display";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import { PageHead } from "../_components/page-head";
import { Query, useShell } from "../_hooks";
import { workspacesQuery } from "../_queries";
import { createInvestigationAction } from "./_actions";
import { Failure, investigationPath, useResearchWrite } from "./_shared";
import s from "./investigation.module.css";

export function InvestigationsScreen() {
  const shell = useShell();
  const org = shell?.context?.org ?? shell?.me.orgs[0];
  const router = useRouter();
  const cache = useQueryClient();
  const [preparing, setPreparing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const list = useQuery({ queryKey: keys.tenancy.workspaces(org?.org_id ?? ""), queryFn: () => workspacesQuery(org!.org_id), enabled: Boolean(org) });
  const create = useResearchWrite(() => createInvestigationAction(org!.org_id, name), [keys.shell(), keys.tenancy.workspaces(org?.org_id ?? "")], (result) => {
    setName("");
    if (result.ready) router.push(investigationPath(result.workspace.workspace_id));
    else setPreparing(result.workspace.name);
  });
  const mayCreate = org?.role === "owner" || org?.role === "admin";
  return <>
    <PageHead title="Investigations">Bring together sources, record what they say, and keep track of the questions that remain.</PageHead>
    {shell?.fixtures ? <Text size="sm" tone="tertiary" className={s.notice}>Demo workspace. Sample changes survive page reloads and reset when the UI server restarts.</Text> : null}
    <div className={s.columns}>
      <Panel title="Continue an investigation">
        {org ? <Query of={list} label="investigations">{(rows) => <div className={s.stack}>
          {rows.map((row) => <Link key={row.workspace_id} href={investigationPath(row.workspace_id)} className={s.investigationCard}>
            <span><strong>{row.name}</strong><Text size="xs" tone="tertiary">{row.closed ? "Read retained sources and notes" : "Open sources and working notes"}</Text></span><Badge tone={row.closed ? "warn" : "neutral"}>{row.closed ? "Closed" : row.access}</Badge>
          </Link>)}
          {rows.length === 0 ? <Text size="sm" tone="tertiary">No open investigations yet. Start one with a name.</Text> : null}
          {rows.some((row) => row.closed) ? <Link href="/settings/workspaces" className={s.inlineLink}>Manage closed investigations</Link> : null}
        </div>}</Query> : <Text size="sm">Your organisation is being set up. Reload to check its progress.</Text>}
      </Panel>
      <Panel id="new-investigation" title="New investigation" note="A question can start small.">
        {mayCreate ? <form className={s.stack} onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
          <Field label="Investigation name" required hint="Use a subject or question you will recognise later.">{(aria) => <Input {...aria} value={name} onChange={(event) => setName(event.target.value)} placeholder="Harbor line disruption" maxLength={200} />}</Field>
          {preparing ? <Alert tone="info"><Text size="sm">{preparing} was created. Access is still being prepared; refresh the list to open it.</Text><Button type="button" size="sm" intent="ghost" onClick={() => { void cache.invalidateQueries({ queryKey: keys.shell() }); void list.refetch(); }}>Refresh investigation list</Button></Alert> : null}
          <Failure error={create.error} />
          <Button type="submit" intent="primary" loading={create.isPending}>Create investigation</Button>
        </form> : <Text size="sm" tone="tertiary">An organisation owner or admin can create an investigation. You can open any investigation shared with you.</Text>}
      </Panel>
    </div>
  </>;
}
