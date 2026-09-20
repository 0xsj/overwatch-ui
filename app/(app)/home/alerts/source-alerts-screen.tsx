"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert } from "@/components/feedback";
import { Badge, Panel, Stat } from "@/components/display";
import { Button } from "@/components/forms";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import type { SourceAlert, SourceAlertPage } from "@/lib/services/sources";
import { sourceHref } from "@/lib/services/sources/navigation";
import { questionHref } from "@/lib/services/questions/navigation";
import { markSourceAlertSeenAction, refreshSourceGapAlertsAction } from "../_actions";
import { sourceAlertsQuery } from "../../_queries";
import { PageHead } from "../../_components/page-head";
import { NoWorkspace, Query, useAfterWrite, useContext } from "../../_hooks";
import { investigationPath } from "../../investigation/_shared";
import s from "../../surface/surface.module.css";

const TITLE = "Source alerts";
const SUB =
  "Durable workspace alerts for changed sources, monitoring failures, and review gaps across questions, records, and evidence clusters. Each account keeps its own seen state.";

export function SourceAlertsScreen() {
  const { workspace } = useContext();
  const query = useQuery({
    queryKey: keys.sources.alerts(workspace ?? ""),
    queryFn: () => sourceAlertsQuery(workspace!),
    enabled: Boolean(workspace),
    retry: false,
  });

  if (!workspace) {
    return (
      <>
        <PageHead title={TITLE}>{SUB}</PageHead>
        <NoWorkspace what="Source alerts" />
      </>
    );
  }

  return (
    <Query of={query} label="source alerts">
      {(page) => <SourceAlertsView workspace={workspace} page={page} />}
    </Query>
  );
}

function SourceAlertsView({ workspace, page }: { workspace: string; page: SourceAlertPage }) {
  const afterWrite = useAfterWrite();
  const [marking, setMarking] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);
  const [writeError, setWriteError] = useState<string>();
  const unread = page.items.filter((alert) => !alert.seen_at).length;

  async function markSeen(alertId: string) {
    setWriteError(undefined);
    setMarking(alertId);
    try {
      await afterWrite(
        () => markSourceAlertSeenAction(workspace, alertId),
        [keys.sources.alerts(workspace)],
      );
    } catch (error) {
      setWriteError(error instanceof Error ? error.message : String(error));
    } finally {
      setMarking(undefined);
    }
  }

  async function refreshGaps() {
    setWriteError(undefined);
    setRefreshing(true);
    try {
      await afterWrite(
        () => refreshSourceGapAlertsAction(workspace),
        [keys.sources.alerts(workspace)],
      );
    } catch (error) {
      setWriteError(error instanceof Error ? error.message : String(error));
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <>
      <PageHead title={TITLE} actions={<Button type="button" intent="secondary" onClick={() => void refreshGaps()} loading={refreshing}>Refresh research gaps</Button>}>
        {SUB} {unread ? `${unread} need${unread === 1 ? "s" : ""} your attention.` : "You are caught up."}
      </PageHead>

      {writeError ? (
        <Alert tone="warn">
          <Text size="sm"><strong>Could not mark the alert seen.</strong> {writeError}</Text>
        </Alert>
      ) : null}

      <div className={s.legend}>
        <Stat label="Unread" value={unread} note="alerts for this account" tone={unread ? "accent" : "neutral"} />
        <Stat label="Shown" value={page.items.length} note="most recent retained alerts" />
      </div>

      <Panel title="Research attention" note="Changed captures link to retained source versions; derived gaps link to the question, record, or evidence cluster that needs review.">
        {page.items.length === 0 ? (
          <div className={s.empty}>
            <Text size="sm">No source alerts yet.</Text>
            <Text size="sm" tone="tertiary">Enable monitoring on a URL source and run it when there is something to check.</Text>
          </div>
        ) : (
          <div className={s.scroll}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th scope="col">status</th>
                  <th scope="col">source</th>
                  <th scope="col">what happened</th>
                  <th scope="col">received</th>
                  <th scope="col"><span className={s.quiet}>state</span></th>
                </tr>
              </thead>
              <tbody>
                {page.items.map((alert) => (
                  <AlertRow key={alert.alert_id} alert={alert} workspace={workspace} marking={marking === alert.alert_id} markSeen={() => void markSeen(alert.alert_id)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

function AlertRow({
  alert,
  workspace,
  marking,
  markSeen,
}: {
  alert: SourceAlert;
  workspace: string;
  marking: boolean;
  markSeen: () => void;
}) {
  const target = alert.question_id
      ? questionHref(workspace, alert.question_id, "/home/alerts")
      : alert.record_id
        ? `${investigationPath(workspace, "records")}?record=${encodeURIComponent(alert.record_id)}`
        : alert.cluster_id
        ? `${investigationPath(workspace, "evidence")}?cluster=${encodeURIComponent(alert.cluster_id)}`
        : alert.source_id
          ? sourceHref(workspace, alert.source_id, alert.capture_id, undefined, "/home/alerts")
          : "/home/alerts";
  const label = alert.question_id ? "Open question" : alert.record_id ? "Research record" : alert.cluster_id ? "Evidence cluster" : alert.source_title ?? "Monitored source";
  const targetID = alert.question_id ?? alert.record_id ?? alert.cluster_id;
  return (
    <tr className={s.row} data-open={!alert.seen_at || undefined}>
      <td><Badge tone={alert.kind === "capture_changed" ? "accent" : "warn"} mono>{alert.kind === "capture_changed" ? "changed" : alert.kind === "watch_failed" ? "failed" : alert.kind === "question_gap" ? "question gap" : alert.kind === "record_gap" ? "record gap" : "cluster gap"}</Badge></td>
      <td>
        <Link href={target} className={s.inlineLink}>{label}</Link>
        <div className={s.quiet}>{targetID ? `${alert.question_id ? "Question" : alert.record_id ? "Record" : "Cluster"} ${targetID}` : alert.capture_id ? `Capture ${alert.capture_id}` : "No capture retained"}</div>
      </td>
      <td>
        <strong>{alert.title}</strong>
        <div className={s.quiet}>{alert.detail}</div>
      </td>
      <td className={s.quiet}>{formatDate(alert.created_at)}</td>
      <td>
        {alert.seen_at ? (
          <span className={s.quiet}>Seen {formatDate(alert.seen_at)}</span>
        ) : (
          <Button type="button" size="sm" intent="ghost" onClick={markSeen} loading={marking}>Mark seen</Button>
        )}
      </td>
    </tr>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
