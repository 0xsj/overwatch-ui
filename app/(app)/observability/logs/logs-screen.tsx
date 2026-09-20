"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Badge, Panel, Stat } from "@/components/display";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import type { JournalEntry } from "@/lib/services/ledger";
import { workspaceLogsQuery } from "../../_queries";
import { PageHead } from "../../_components/page-head";
import { NoWorkspace, Query, useContext } from "../../_hooks";
import s from "../../surface/surface.module.css";

const TITLE = "Logs";
const SUB =
  "Every unit of work, and what caused it. A run, an invocation, a refusal and a correction all land here, each carrying the correlation that ties it to the others.";

export function LogsScreen() {
  const { workspace, shell } = useContext();
  const after = useSearchParams().get("after") ?? undefined;
  const q = useQuery({
    queryKey: keys.ledger.logs(workspace ?? "", after),
    queryFn: () => workspaceLogsQuery(workspace!, after),
    enabled: Boolean(workspace),
    retry: false,
  });

  if (!workspace) {
    return (
      <>
        <PageHead title={TITLE}>{SUB}</PageHead>
        <NoWorkspace what="Logs" />
      </>
    );
  }

  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>
      <Query of={q} label="the causal journal">
        {(page) => <JournalView page={page} name={shell?.context?.workspace.name} />}
      </Query>
    </>
  );
}

function JournalView({
  page,
  name,
}: {
  page: { entries: JournalEntry[]; next?: string };
  name?: string;
}) {
  const decisions = page.entries.filter((entry) => entry.decision).length;
  const origins = new Set(page.entries.map((entry) => entry.origin)).size;

  return (
    <>
      <div className={s.legend}>
        <Stat label="Lines" value={page.entries.length} note="this page — the journal has no total" />
        <Stat label="Decisions" value={decisions} note="choices made in this page" tone={decisions ? "accent" : "neutral"} />
        <Stat label="Origins" value={origins} note="request, schedule, replay or other causes" />
      </div>

      <Panel
        title={name ? `${name} causal journal` : "Causal journal"}
        note="Newest first. Audit answers who changed what; this view keeps the provenance that explains what work ran and what caused it."
      >
        {page.entries.length === 0 ? (
          <div className={s.empty}>
            <Text size="sm">Nothing has entered the causal journal yet.</Text>
            <Text size="sm" tone="tertiary">
              This is a measured empty result, not an unreadable log. Work appears
              here when a request, schedule, replay or backfill reaches this engagement.
            </Text>
          </div>
        ) : (
          <>
            <div className={s.scroll}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th scope="col">when</th>
                    <th scope="col">work</th>
                    <th scope="col">origin / actor</th>
                    <th scope="col">kind</th>
                    <th scope="col">caused by</th>
                  </tr>
                </thead>
                <tbody>
                  {page.entries.map((entry) => <JournalRow key={entry.id} entry={entry} />)}
                </tbody>
              </table>
            </div>
            {page.next ? (
              <Link className={s.inlineLink} href={`/observability/logs?after=${encodeURIComponent(page.next)}`}>
                Load older lines →
              </Link>
            ) : (
              <Text size="xs" tone="quiet">That is everything recorded this far back.</Text>
            )}
          </>
        )}
      </Panel>
    </>
  );
}

function JournalRow({ entry }: { entry: JournalEntry }) {
  return (
    <tr className={s.row}>
      <td><span className={s.mono}>{entry.occurred_at.slice(0, 19).replace("T", " ")}</span></td>
      <td>
        <div>
          <strong>{entry.action}</strong>
          <div className={s.quiet}>{entry.subject}</div>
        </div>
      </td>
      <td>
        <div className={s.stepValue}>
          <Badge mono>{entry.origin}</Badge>
          <span className={s.mono}>{entry.actor === "anonymous" ? "not signed in" : entry.actor.replace(/^user:/, "")}</span>
        </div>
      </td>
      <td>
        <div className={s.stepValue}>
          <Badge tone={entry.decision ? "accent" : "neutral"} mono>
            {entry.decision ? "decision" : "machinery"}
          </Badge>
          {entry.attempt > 0 ? <span className={s.quiet}>attempt {entry.attempt}</span> : null}
        </div>
      </td>
      <td>
        {entry.correlation_id ? (
          <Link href={`/home/audit-log/${encodeURIComponent(entry.correlation_id)}`} className={s.inlineLink}>
            chain →
          </Link>
        ) : (
          <span className={s.quiet}>unlinked</span>
        )}
      </td>
    </tr>
  );
}
