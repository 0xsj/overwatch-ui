"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert } from "@/components/feedback";
import { Badge, Panel, Stat } from "@/components/display";
import { Button } from "@/components/forms";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import type { SourceAlert, SourceAlertDelivery, SourceAlertKind, SourceAlertPage } from "@/lib/services/sources";
import { sourceHref } from "@/lib/services/sources/navigation";
import { questionHref } from "@/lib/services/questions/navigation";
import { markSourceAlertSeenAction, refreshSourceGapAlertsAction, saveSourceAlertDeliveryAction } from "../_actions";
import { sourceAlertDeliveryQuery, sourceAlertsQuery } from "../../_queries";
import { PageHead } from "../../_components/page-head";
import { NoWorkspace, Query, useAfterWrite, useContext } from "../../_hooks";
import { investigationPath } from "../../investigation/_shared";
import s from "../../surface/surface.module.css";

const TITLE = "Source alerts";
const SUB =
  "Durable workspace alerts for changed sources, monitoring failures, and review gaps across questions, records, and evidence clusters. Each account keeps its own seen state.";
const ALERT_KIND_OPTIONS: ReadonlyArray<{ kind: SourceAlertKind; label: string; detail: string }> = [
  { kind: "capture_changed", label: "Changed captures", detail: "A monitored source returned new bytes." },
  { kind: "watch_failed", label: "Watch failures", detail: "A monitored source could not be checked." },
  { kind: "question_gap", label: "Question gaps", detail: "An open question still needs cited support." },
  { kind: "record_gap", label: "Record gaps", detail: "An authored record needs review or corroboration." },
  { kind: "cluster_gap", label: "Evidence-cluster gaps", detail: "A cluster needs review or opposing evidence." },
];

export function SourceAlertsScreen() {
  const { workspace } = useContext();
  const query = useQuery({
    queryKey: keys.sources.alerts(workspace ?? ""),
    queryFn: () => sourceAlertsQuery(workspace!),
    enabled: Boolean(workspace),
    retry: false,
  });
  const delivery = useQuery({
    queryKey: keys.sources.alertDelivery(workspace ?? ""),
    queryFn: () => sourceAlertDeliveryQuery(workspace!),
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
      {(page) => <Query of={delivery} label="alert delivery">{(preference) => <SourceAlertsView workspace={workspace} page={page} preference={preference} />}</Query>}
    </Query>
  );
}

function SourceAlertsView({ workspace, page, preference }: { workspace: string; page: SourceAlertPage; preference: SourceAlertDelivery }) {
  const afterWrite = useAfterWrite();
  const [marking, setMarking] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);
  const [savingDelivery, setSavingDelivery] = useState(false);
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

  async function saveDelivery(input: { email_enabled: boolean; kinds: SourceAlertKind[] }) {
    setWriteError(undefined);
    setSavingDelivery(true);
    try {
      await afterWrite(
        () => saveSourceAlertDeliveryAction(workspace, input),
        [keys.sources.alertDelivery(workspace)],
      );
    } catch (error) {
      setWriteError(error instanceof Error ? error.message : String(error));
    } finally {
      setSavingDelivery(false);
    }
  }

  function toggleKind(kind: SourceAlertKind) {
    const allKinds = ALERT_KIND_OPTIONS.map((option) => option.kind);
    const nextKinds = preference.kinds.length === 0
      ? allKinds.filter((one) => one !== kind)
      : preference.kinds.includes(kind)
        ? preference.kinds.filter((one) => one !== kind)
        : [...preference.kinds, kind];
    void saveDelivery({
      email_enabled: preference.email_enabled,
      kinds: nextKinds.length === allKinds.length ? [] : nextKinds,
    });
  }

  return (
    <>
      <PageHead title={TITLE} actions={<Button type="button" intent="secondary" onClick={() => void refreshGaps()} loading={refreshing}>Refresh research gaps</Button>}>
        {SUB} {unread ? `${unread} need${unread === 1 ? "s" : ""} your attention.` : "You are caught up."}
      </PageHead>

      {writeError ? (
        <Alert tone="warn">
          <Text size="sm"><strong>Could not save the alert setting.</strong> {writeError}</Text>
        </Alert>
      ) : null}

      <div className={s.legend}>
        <Stat label="Unread" value={unread} note="alerts for this account" tone={unread ? "accent" : "neutral"} />
        <Stat label="Shown" value={page.items.length} note="most recent retained alerts" />
      </div>

      <Panel title="Email delivery" note="Email is off by default. When enabled, new alerts created for your account are also sent through the configured Overwatch mail transport.">
        <div className={s.stack}>
          <label className={s.checkboxLabel}>
            <input
              type="checkbox"
              checked={preference.email_enabled}
              disabled={savingDelivery}
              onChange={() => void saveDelivery({ email_enabled: !preference.email_enabled, kinds: preference.kinds })}
            />
            <span>Send me new source alerts by email</span>
          </label>
          <Text size="xs" tone="tertiary">Choose which alert types should leave the inbox. Alerts remain available here and in the audit trail.</Text>
          <div className={s.stack}>
            {ALERT_KIND_OPTIONS.map((option) => (
              <label className={s.checkboxLabel} key={option.kind}>
                <input
                  type="checkbox"
                  checked={preference.kinds.length === 0 || preference.kinds.includes(option.kind)}
                  disabled={savingDelivery}
                  onChange={() => toggleKind(option.kind)}
                />
                <span>{option.label} <span className={s.quiet}>— {option.detail}</span></span>
              </label>
            ))}
          </div>
          <Text size="xs" tone="tertiary">No selected types means all five alert types.</Text>
        </div>
      </Panel>

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
