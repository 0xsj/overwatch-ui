"use client";

import Link from "next/link";
import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/display";
import { Button, Input } from "@/components/forms";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { isAppError } from "@/lib/kernel";
import type { Evidence } from "@/lib/services/review";
import type { ResearchRecord } from "@/lib/services/research-records";
import { filterLoadedRows, unresolvedIDs } from "@/lib/query/filter";
import type { Shell } from "../_shell";
import { keys } from "@/lib/query";
import { reviewBoundaryCopy, type ReviewBoundaryKind } from "@/lib/services/assistance/review-boundary";
import { sourceHref } from "@/lib/services/sources/navigation";
import { noteDraftHref } from "@/lib/services/notes/navigation";
import type { NoteContext } from "@/lib/services/notes";
export { recordHref } from "@/lib/services/research-records/navigation";
export { sourceHref } from "@/lib/services/sources/navigation";
import { useContext } from "../_hooks";
import { rememberInvestigationAction } from "./_actions";
import s from "./investigation.module.css";

export const investigationPath = (workspace: string, view = "overview") => `/investigation/${encodeURIComponent(workspace)}/${view}`;
export const authorLabel = (author: string, shell?: Shell) => {
  if (shell?.me.account_id === author) return "You";
  return shell?.members.find((member) => member.account_id === author)?.name || author;
};
export const dateLabel = (value: string) => new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export { reviewBoundaryCopy, type ReviewBoundaryKind } from "@/lib/services/assistance/review-boundary";

export function ReviewBoundary({ kind, text }: { kind: ReviewBoundaryKind; text?: string }) {
  const copy = reviewBoundaryCopy[kind];
  return <div className={s.reviewBoundary} role="note"><div className={s.row}><Badge tone={copy.tone}>{copy.label}</Badge><Text size="xs" tone="tertiary">{text ?? copy.text}</Text></div></div>;
}

export function WorkingNoteLink({ workspace, context, body, returnTo }: { workspace: string; context: NoteContext; body: string; returnTo: string }) {
  return <Link className={s.inlineLink} href={noteDraftHref(workspace, { body }, returnTo, context)}>Start a working note</Link>;
}

export function useResearchWrite<T>(run: () => Promise<{ ok: true; value: T } | { ok: false; message: string }>, invalidate: readonly QueryKey[], done?: (value: T) => void) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await run();
      if (!result.ok) throw new Error(result.message);
      return result.value;
    },
    onSuccess: async (value) => {
      await Promise.all(invalidate.map((queryKey) => cache.invalidateQueries({ queryKey })));
      done?.(value);
    },
  });
}
export function Failure({ error }: { error: Error | null }) {
  if (!error) return null;
  const appError = isAppError(error) ? error : undefined;
  return (
    <Alert tone="warn" role="alert">
      <Text size="sm">{error.message}</Text>
      {appError?.retryable ? <Text size="xs" tone="tertiary">This may be temporary. Try the action again.</Text> : null}
      {appError?.requestId ? <Text size="xs" tone="tertiary">Reference <code>{appError.requestId}</code></Text> : null}
    </Alert>
  );
}

export function InvestigationNav({ workspace, name, closed }: { workspace: string; name: string; closed: boolean }) {
  const pathname = usePathname();
  const { shell } = useContext();
  const cache = useQueryClient();
  useEffect(() => {
    let current = true;
    if (!closed) {
      void rememberInvestigationAction(workspace).then(() => {
        if (current) return cache.invalidateQueries({ queryKey: keys.shell() });
      }).catch(() => {});
    }
    return () => { current = false; };
  }, [workspace, closed, cache]);
  return (
    <div className={s.context}>
      <div className={s.contextTop}>
        <Link href="/investigation" className={s.back}>All investigations</Link>
        <span className={s.contextName}>{shell?.context?.workspace.name ?? name}{closed ? " · Closed · Read only" : ""}</span>
      </div>
      <nav aria-label="Investigation views" className={s.tabs}>
        {[["overview", "Overview"], ["sources", "Sources"], ["evidence", "Evidence review"], ["questions", "Open questions"], ["timeline", "Timeline"], ["records", "Records"], ["connections", "Connections"], ["brief", "Working brief"], ["notes", "Working notes"], ["activity", "Activity"]].map(([view, label]) => (
          <Link key={view} href={investigationPath(workspace, view)} aria-current={pathname.startsWith(investigationPath(workspace, view)) ? "page" : undefined}>{label}</Link>
        ))}
      </nav>
    </div>
  );
}

export function MoreButton({ available, pending, load }: { available: boolean; pending: boolean; load: () => void }) {
  return available ? <Button type="button" intent="ghost" loading={pending} onClick={load}>{pending ? "Loading…" : "Load more"}</Button> : null;
}

export function ObservationPicker({ workspace, label, selected, evidence, setSelected, error, max, other = [], hasNext, fetchingNext, fetchMore, returnTo }: {
  workspace: string;
  label: string;
  selected: string[];
  evidence: Evidence[];
  setSelected: (ids: string[]) => void;
  error: Error | null;
  max: number;
  other?: string[];
  hasNext: boolean;
  fetchingNext: boolean;
  fetchMore: () => void;
  returnTo?: string;
}) {
  const [filter, setFilter] = useState("");
  const visible = filterLoadedRows(evidence, filter, (row) => [row.observation_id, row.source_id, row.capture_id, row.source_title, row.statement, row.quote]);
  const unresolved = unresolvedIDs(selected, evidence, (row) => row.observation_id);
  return <div className={s.details}>
    <Text size="sm">{label} <span className={s.muted}>(optional, up to {max})</span></Text>
    {error ? <Failure error={error} /> : evidence.length ? <div className={s.stack}><Input aria-label={`Filter ${label.toLowerCase()}`} value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter loaded observations" /><Text size="xs" tone="tertiary">Showing {visible.length} of {evidence.length} loaded observation{evidence.length === 1 ? "" : "s"}.</Text>{visible.length ? <div className={s.checkboxList}>{visible.map((row) => { const checked = selected.includes(row.observation_id); const disabled = !checked && (selected.length >= max || other.includes(row.observation_id)); return <label key={row.observation_id} className={s.checkboxLabel}><input type="checkbox" checked={checked} disabled={disabled} onChange={() => setSelected(checked ? selected.filter((id) => id !== row.observation_id) : [...selected, row.observation_id])} /><span className={s.questionLinkText}>{row.source_title}: {row.statement}</span></label>; })}</div> : <Text size="xs" tone="tertiary">No loaded observations match. Clear the filter or load more.</Text>}<MoreButton available={hasNext} pending={fetchingNext} load={fetchMore} /></div> : <Text size="xs" tone="tertiary">No cited observations are loaded yet.</Text>}
    {unresolved.length ? <Text size="xs" tone="tertiary">{unresolved.length} selected citation ID{unresolved.length === 1 ? " is" : "s are"} currently unresolved; the ID{unresolved.length === 1 ? " is" : "s remain"} preserved.</Text> : null}
    {selected.length ? <div className={s.stack}><Text size="xs" tone="tertiary">Selected citation details</Text>{selected.map((id) => { const row = evidence.find((one) => one.observation_id === id); if (!row) return <Text key={id} size="xs" tone="tertiary">Observation {id} could not be resolved yet.</Text>; return <article key={id} className={s.observation}><div className={s.eventMeta}><Link className={s.inlineLink} href={sourceHref(workspace, row.source_id, row.capture_id, row.observation_id, returnTo)}>{row.source_title}</Link><span className={s.muted}>Observation {row.observation_id}</span></div><Text size="sm" className={s.evidenceStatement}>{row.statement}</Text><blockquote className={s.quote}>{row.quote}</blockquote><Text size="xs" tone="tertiary">Capture {row.capture_id} · recorded {dateLabel(row.recorded_at)}</Text></article>; })}</div> : null}
  </div>;
}

export function RecordPicker({ label, value, records, onChange, hasNext, fetchingNext, fetchMore, disabled = false }: {
  label: string;
  value: string;
  records: ResearchRecord[];
  onChange: (value: string) => void;
  hasNext: boolean;
  fetchingNext: boolean;
  fetchMore: () => void;
  disabled?: boolean;
}) {
  const [filter, setFilter] = useState("");
  const visible = filterLoadedRows(records, filter, (record) => [record.record_id, record.name, record.description ?? "", record.kind]);
  const selected = records.find((record) => record.record_id === value);
  const options = selected && !visible.some((record) => record.record_id === selected.record_id) ? [selected, ...visible] : visible;
  return <div className={s.stack}><Text size="sm">{label} <span className={s.muted}>(required)</span></Text><Input aria-label={`Filter ${label.toLowerCase()}`} value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter loaded records" disabled={disabled} /><Text size="xs" tone="tertiary">Showing {visible.length} of {records.length} loaded record{records.length === 1 ? "" : "s"}.</Text><select aria-label={label} className={s.select} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}><option value="">Choose a record</option>{options.map((record) => <option key={record.record_id} value={record.record_id}>{record.name} · {record.kind}</option>)}</select>{visible.length ? null : <Text size="xs" tone="tertiary">No loaded records match. Clear the filter or load more.</Text>}<MoreButton available={hasNext && !disabled} pending={fetchingNext} load={fetchMore} /></div>;
}
