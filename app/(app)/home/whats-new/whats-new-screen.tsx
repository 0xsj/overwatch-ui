"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert } from "@/components/feedback";
import { Badge, Panel, Stat } from "@/components/display";
import { Button } from "@/components/forms";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import type { Change, ChangeKind, ChangePage } from "@/lib/services/changes";
import { markChangesSeenAction } from "../_actions";
import { changesQuery } from "../../_queries";
import { PageHead } from "../../_components/page-head";
import { NoWorkspace, Query, useAfterWrite, useContext } from "../../_hooks";
import s from "../../surface/surface.module.css";

const TITLE = "What's new";
const SUB =
  "The difference between the last two completed runs, held against the last time you marked this view seen rather than against the clock.";
export function WhatsNewScreen() {
  const { workspace } = useContext();
  const q = useQuery({
    queryKey: keys.changes.list(workspace ?? ""),
    queryFn: () => changesQuery(workspace!),
    enabled: Boolean(workspace),
    retry: false,
  });
  const afterWrite = useAfterWrite();
  const [marking, setMarking] = useState(false);
  const [writeError, setWriteError] = useState<string | undefined>();

  if (!workspace) {
    return (
      <>
        <PageHead title={TITLE}>{SUB}</PageHead>
        <NoWorkspace what="What's new" />
      </>
    );
  }

  return (
    <Query of={q} label="the change projection">
      {(page) => (
        <WhatsNewView
          page={page}
          onMarkSeen={async () => {
            setWriteError(undefined);
            setMarking(true);
            try {
              await afterWrite(
                () => markChangesSeenAction(workspace),
                [keys.changes.list(workspace)],
              );
            } catch (error) {
              setWriteError(error instanceof Error ? error.message : String(error));
            } finally {
              setMarking(false);
            }
          }}
          marking={marking}
          writeError={writeError}
        />
      )}
    </Query>
  );
}

function WhatsNewView({
  page,
  onMarkSeen,
  marking,
  writeError,
}: {
  page: ChangePage;
  onMarkSeen: () => Promise<void>;
  marking: boolean;
  writeError?: string;
}) {
  const seenAt = page.seen_at;
  const changes = useMemo(
    () => page.changes.filter((change) => !seenAt || change.changed_at > seenAt),
    [page.changes, seenAt],
  );
  const counts = countKinds(changes);

  return (
    <>
      <PageHead
        title={TITLE}
        actions={
          <Button type="button" intent="secondary" onClick={() => void onMarkSeen()} disabled={changes.length === 0} loading={marking}>
            Mark all seen
          </Button>
        }
      >
        {SUB} {seenAt ? `Last marked seen ${formatDate(seenAt)}.` : "No seen marker has been set yet."}
      </PageHead>

      {writeError ? (
        <Alert tone="warn">
          <Text size="sm"><strong>Could not mark changes seen.</strong> {writeError}</Text>
        </Alert>
      ) : null}

      <div className={s.legend}>
        <Stat label="Changes" value={changes.length} note="since your seen marker" tone={changes.length ? "accent" : "neutral"} />
        <Stat label="Added" value={counts.added} note="new subjects or first answers" />
        <Stat label="Changed" value={counts.changed} note="previous and current values shown" />
        <Stat label="Gone" value={counts.gone} note="measured again, then absent" />
      </div>

      <Panel title="Since the last comparison" note={comparisonNote(page)}>
        {changes.length === 0 ? (
          <div className={s.empty}>
            <Text size="sm">You are caught up.</Text>
            <Text size="sm" tone="tertiary">
              No new differences remain after the last seen marker. A field that
              was not measured again is not reported as gone.
            </Text>
          </div>
        ) : (
          <div className={s.scroll}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th scope="col">kind</th>
                  <th scope="col">subject</th>
                  <th scope="col">what moved</th>
                  <th scope="col">comparison</th>
                  <th scope="col">evidence</th>
                </tr>
              </thead>
              <tbody>
                {changes.map((change) => <ChangeRow key={change.change_id} change={change} />)}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

function ChangeRow({ change }: { change: Change }) {
  const target = `/surface/assets?target=${encodeURIComponent(change.target_id)}`;
  const run = `/observability/runs?run=${encodeURIComponent(change.current_run_id)}`;
  return (
    <tr className={s.row}>
      <td><ChangeBadge kind={change.kind} /></td>
      <td>
        <Link href={target} className={s.inlineLink}>{change.subject_value}</Link>
        <div className={s.quiet}>{change.subject_kind} · {change.target_name}</div>
      </td>
      <td>
        <strong>{change.field}</strong>
        <div className={s.quiet}>{change.summary}</div>
      </td>
      <td>
        <div className={s.stepValue}>
          {change.previous_value ? <span className={s.value}>{change.previous_value}</span> : null}
          {change.kind === "changed" ? <span className={s.quiet}>→</span> : null}
          {change.current_value ? <span className={s.value}>{change.current_value}</span> : null}
          {!change.previous_value && !change.current_value ? <span className={s.quiet}>no value recorded</span> : null}
        </div>
      </td>
      <td>
        <Link href={run} className={s.inlineLink}>current run →</Link>
        <div className={s.quiet}>{formatDate(change.changed_at)}</div>
      </td>
    </tr>
  );
}

function ChangeBadge({ kind }: { kind: ChangeKind }) {
  const tone = kind === "added" ? "accent" : kind === "gone" ? "warn" : "neutral";
  return <Badge tone={tone} mono>{kind}</Badge>;
}

function countKinds(changes: Change[]): Record<ChangeKind, number> {
  return changes.reduce<Record<ChangeKind, number>>(
    (counts, change) => ({ ...counts, [change.kind]: counts[change.kind] + 1 }),
    { added: 0, changed: 0, gone: 0 },
  );
}

function comparisonNote(page: ChangePage): string {
  if (!page.comparisons?.length) {
    return "There are not two completed runs to compare yet.";
  }
  return `Comparing the latest two completed runs for ${page.comparisons.length} target${page.comparisons.length === 1 ? "" : "s"}. The server decides whether a missing value was measured again.`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
