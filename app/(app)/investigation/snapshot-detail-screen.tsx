"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge, Panel } from "@/components/display";
import { Button, Field, Input, Textarea } from "@/components/forms";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import type { BriefHandoffShare, BriefSnapshotComment, BriefSnapshotReview, SnapshotReviewState } from "@/lib/services/brief";
import type { AuditEntry } from "@/lib/services/ledger";
import type { Evidence } from "@/lib/services/review";
import { downloadBriefSnapshotMarkdown, snapshotEvidenceIds } from "@/lib/services/brief/export";
import { eventRevisionHref } from "@/lib/services/events/navigation";
import { mayWriteResearch } from "../_route-context";
import { PageHead } from "../_components/page-head";
import { useContext, Query } from "../_hooks";
import { briefSnapshotActivityQuery, briefSnapshotCommentsQuery, briefSnapshotEvidenceQuery, briefSnapshotQuery, briefSnapshotReviewQuery, briefSnapshotSharesQuery, workspaceMembersQuery } from "../_queries";
import { addBriefSnapshotCommentAction, assignBriefSnapshotReviewerAction, createBriefSnapshotShareAction, revokeBriefSnapshotShareAction, submitBriefSnapshotReviewAction } from "./_actions";
import { authorLabel, dateLabel, Failure, investigationPath, sourceHref, useResearchWrite } from "./_shared";
import s from "./investigation.module.css";

export function SnapshotDetailScreen({ workspace, snapshot: snapshotID }: { workspace: string; snapshot: string }) {
  const { shell } = useContext();
  const mayWrite = mayWriteResearch(shell?.context?.workspace);
  const snapshot = useQuery({
    queryKey: keys.brief.snapshot(workspace, snapshotID),
    queryFn: () => briefSnapshotQuery(workspace, snapshotID),
  });
  const evidence = useQuery({
    queryKey: keys.brief.snapshotEvidence(workspace, snapshotID),
    queryFn: () => briefSnapshotEvidenceQuery(workspace, snapshot.data ? snapshotEvidenceIds(snapshot.data) : []),
    enabled: snapshot.isSuccess,
  });
  const review = useQuery({
    queryKey: keys.brief.snapshotReview(workspace, snapshotID),
    queryFn: () => briefSnapshotReviewQuery(workspace, snapshotID),
  });
  const comments = useQuery({
    queryKey: keys.brief.snapshotComments(workspace, snapshotID),
    queryFn: () => briefSnapshotCommentsQuery(workspace, snapshotID),
  });
  const shares = useQuery({
    queryKey: keys.brief.snapshotShares(workspace, snapshotID),
    queryFn: () => briefSnapshotSharesQuery(workspace, snapshotID),
    enabled: mayWrite,
  });
  const activity = useQuery({
    queryKey: keys.brief.snapshotActivity(workspace, snapshotID),
    queryFn: () => briefSnapshotActivityQuery(workspace, snapshotID),
  });
  const members = useQuery({
    queryKey: keys.access.grants(workspace),
    queryFn: () => workspaceMembersQuery(workspace),
  });

  return <Query of={snapshot} label="the frozen handoff">{(data) => <>
    <PageHead title={data.title} actions={<div className={s.row}>
      <Button asChild intent="ghost"><Link href={investigationPath(workspace, "brief")}>Back to working brief</Link></Button>
      <Button asChild intent="ghost"><Link href={`/findings/handoffs/${encodeURIComponent(data.snapshot_id)}?workspace=${encodeURIComponent(workspace)}`}>Recipient view</Link></Button>
      <Button type="button" intent="primary" loading={evidence.isPending} disabled={!evidence.isSuccess} onClick={() => evidence.data && downloadBriefSnapshotMarkdown(data, evidence.data)}>
        {evidence.isPending ? "Preparing download…" : "Download Markdown"}
      </Button>
    </div>}>
      Frozen, read-only handoff. The authored text and linked question state below cannot change through this view.
    </PageHead>
    <div className={s.stack}>
      <Panel title="Frozen metadata" note="This record is immutable.">
        <dl className={s.metadata}>
          <dt>Frozen by</dt><dd>{authorLabel(data.frozen_by, shell)}</dd>
          <dt>Frozen at</dt><dd>{dateLabel(data.frozen_at)}</dd>
          <dt>Source brief updated</dt><dd>{dateLabel(data.source_updated_at)}</dd>
          <dt>Snapshot ID</dt><dd>{data.snapshot_id}</dd>
        </dl>
      </Panel>
      <Query of={review} label="handoff review">{(data) => <SnapshotReviewPanel key={data.updated_at} workspace={workspace} snapshot={snapshotID} review={data} members={members.data ?? []} mayWrite={mayWrite} shell={shell} membersError={members.isError ? members.error : null} />}</Query>
      <Query of={comments} label="handoff comments">{(rows) => <SnapshotCommentsPanel workspace={workspace} snapshot={snapshotID} comments={rows} mayWrite={mayWrite} shell={shell} />}</Query>
      {mayWrite ? <SnapshotSharesPanel workspace={workspace} snapshot={snapshotID} shares={shares.data ?? []} error={shares.isError ? shares.error : null} /> : null}
      <Query of={activity} label="handoff activity">{(page) => <SnapshotActivityPanel entries={page.entries} shell={shell} />}</Query>
      <Panel title="Authored handoff">
        <div className={s.stack}>
          <SnapshotSection label="Investigation question" value={data.question} />
          <SnapshotSection label="Current account" value={data.current_account} />
          <SnapshotSection label="Alternatives" value={data.alternatives} />
          <SnapshotSection label="Limitations" value={data.limitations} />
          <SnapshotSection label="Next steps" value={data.next_steps} />
        </div>
      </Panel>
      <Panel title="Cited observations" note="Brief-level citations are resolved directly from their workspace-scoped identifiers.">
        <Query of={evidence} label="the frozen citations">{(rows) => <EvidenceList rows={rows} workspace={workspace} snapshot={data.snapshot_id} ids={data.observation_ids} />}</Query>
      </Panel>
      <Panel title="Questions at freeze" note="Wording, state, resolution, and linked citations are copied into the immutable handoff.">
        {data.questions.length ? <div className={s.stack}>{data.questions.map((question) => <article key={question.question_id} className={s.briefSection}>
          <Text size="sm">{question.question}</Text>
          <Text size="xs" tone="tertiary">State: {question.state}{question.resolution ? ` · ${question.resolution}` : ""}</Text>
          <Text size="xs" tone="tertiary">Question ID: {question.question_id}</Text>
          <ObservationLinks label="Question observations" ids={question.observation_ids} rows={evidence.data ?? []} workspace={workspace} snapshot={data.snapshot_id} />
        </article>)}</div> : <Text size="sm" tone="tertiary">No investigation questions were linked at freeze time.</Text>}
      </Panel>
      <Panel title="Connections at freeze" note="Endpoint labels, descriptions, record citations, assessment, rationale, and evidence sides are copied into the immutable handoff.">
        {data.connections.length ? <div className={s.stack}>{data.connections.map((connection) => <article key={connection.connection_id} className={s.briefSection}>
          <Text size="sm">{connection.from_record_name} → {connection.to_record_name}</Text>
          <Text size="xs" tone="tertiary">{connection.from_record_kind} → {connection.to_record_kind} · {connection.kind} · {connection.state} · Connection ID: {connection.connection_id}</Text>
          <Text size="xs" tone="tertiary">From record: {connection.from_record_id} · {connection.from_record_description || "No description recorded."}</Text>
          <Text size="xs" tone="tertiary">To record: {connection.to_record_id} · {connection.to_record_description || "No description recorded."}</Text>
          <Text size="sm" className={s.body}>{connection.rationale}</Text>
          <Text size="xs" tone="tertiary">From record observations: {connection.from_record_observation_ids.length || "none"} · To record observations: {connection.to_record_observation_ids.length || "none"}</Text>
          <ObservationLinks label="From-record observations" ids={connection.from_record_observation_ids} rows={evidence.data ?? []} workspace={workspace} snapshot={data.snapshot_id} />
          <ObservationLinks label="To-record observations" ids={connection.to_record_observation_ids} rows={evidence.data ?? []} workspace={workspace} snapshot={data.snapshot_id} />
          <ObservationLinks label="Supporting observations" ids={connection.supporting_observation_ids} rows={evidence.data ?? []} workspace={workspace} snapshot={data.snapshot_id} />
          <ObservationLinks label="Opposing observations" ids={connection.opposing_observation_ids} rows={evidence.data ?? []} workspace={workspace} snapshot={data.snapshot_id} />
        </article>)}</div> : <Text size="sm" tone="tertiary">No connections were linked at freeze time.</Text>}
      </Panel>
      <Panel title="Events at freeze" note="Reported wording, time qualification, record labels, citations, and the selected event revision are copied into the immutable handoff.">
        {data.events.length ? <div className={s.stack}>{data.events.map((event) => <article key={event.event_id} className={s.briefSection}>
          <Text size="sm">{event.title}</Text>
          <Text size="xs" tone="tertiary">{event.time_precision}{event.reported_time ? ` · ${event.reported_time}` : ""}{event.sort_date ? ` · order ${event.sort_date}` : ""} · Event ID: {event.event_id}</Text>
          {event.event_revision_id ? <Link className={s.inlineLink} href={eventRevisionHref(workspace, event.event_id, event.event_revision_id)}>Open frozen event revision{event.event_revision ? ` ${event.event_revision}` : ""}</Link> : <Text size="xs" tone="tertiary">Event revision was not pinned in this older handoff.</Text>}
          {event.location ? <Text size="xs" tone="tertiary">Reported location: {event.location}</Text> : null}
          {event.location_record ? <Text size="xs" tone="tertiary">Place record: {event.location_record.name} ({event.location_record.kind}) · {event.location_record.record_id}{event.location_record.place_geometry ? <> · map point {event.location_record.place_geometry.latitude.toFixed(5)}, {event.location_record.place_geometry.longitude.toFixed(5)} · <a className={s.inlineLink} href={`https://www.openstreetmap.org/?mlat=${encodeURIComponent(event.location_record.place_geometry.latitude)}&mlon=${encodeURIComponent(event.location_record.place_geometry.longitude)}#map=12/${encodeURIComponent(event.location_record.place_geometry.latitude)}/${encodeURIComponent(event.location_record.place_geometry.longitude)}`} target="_blank" rel="noreferrer">Open map ↗</a></> : null}</Text> : null}
          {event.participant_records.length ? <Text size="xs" tone="tertiary">Participants: {event.participant_records.map((record) => `${record.name} (${record.kind})`).join(", ")}</Text> : null}
          <Text size="sm" className={s.body}>{event.description || "No event description recorded."}</Text>
          <ObservationLinks label="Event observations" ids={event.observation_ids} rows={evidence.data ?? []} workspace={workspace} snapshot={data.snapshot_id} />
          {event.participant_records.map((record) => <ObservationLinks key={record.record_id} label={`${record.name} record observations`} ids={record.observation_ids} rows={evidence.data ?? []} workspace={workspace} snapshot={data.snapshot_id} />)}
          {event.location_record ? <ObservationLinks label={`${event.location_record.name} place observations`} ids={event.location_record.observation_ids} rows={evidence.data ?? []} workspace={workspace} snapshot={data.snapshot_id} /> : null}
          {event.location_record?.place_geometry ? <ObservationLinks label={`${event.location_record.name} map context observations`} ids={event.location_record.place_geometry.observation_ids} rows={evidence.data ?? []} workspace={workspace} snapshot={data.snapshot_id} /> : null}
        </article>)}</div> : <Text size="sm" tone="tertiary">No reported events were linked at freeze time.</Text>}
      </Panel>
    </div>
  </>}</Query>;
}

function SnapshotSharesPanel({ workspace, snapshot, shares, error }: { workspace: string; snapshot: string; shares: BriefHandoffShare[]; error: Error | null }) {
  const [latestURL, setLatestURL] = useState("");
  const create = useResearchWrite(() => createBriefSnapshotShareAction(workspace, snapshot), [keys.brief.snapshotShares(workspace, snapshot), keys.brief.snapshotActivity(workspace, snapshot)], (value) => {
    if (value.token) setLatestURL(`${window.location.origin}/findings/handoffs/shared/${encodeURIComponent(value.token)}?workspace=${encodeURIComponent(workspace)}`);
  });
  return <Panel title="Recipient share links" note="Links open the redacted recipient view and can be revoked independently. The raw link is shown only when it is created.">
    <div className={s.stack}>
      <Button type="button" intent="ghost" loading={create.isPending} onClick={() => create.mutate()}>{create.isPending ? "Creating link…" : "Create recipient link"}</Button>
      <Failure error={error} />
      <Failure error={create.error} />
      {latestURL ? <Field label="New share link" hint="Copy this link now. The token will not be returned again after this response.">{(aria) => <div className={s.row}><Input {...aria} readOnly value={latestURL} /><Button type="button" intent="ghost" onClick={() => void navigator.clipboard?.writeText(latestURL)}>Copy</Button></div>}</Field> : null}
      {shares.length ? <div className={s.stack}>{shares.map((share) => <SnapshotShareRow key={share.share_id} workspace={workspace} share={share} />)}</div> : <Text size="sm" tone="tertiary">No share links have been created for this handoff.</Text>}
    </div>
  </Panel>;
}

function SnapshotShareRow({ workspace, share }: { workspace: string; share: BriefHandoffShare }) {
  const revoke = useResearchWrite(() => revokeBriefSnapshotShareAction(workspace, share.share_id), [keys.brief.snapshotShares(workspace, share.snapshot_id), keys.brief.snapshotActivity(workspace, share.snapshot_id)]);
  return <article className={s.briefSection}><div className={s.row}><Badge tone={share.revoked_at ? "neutral" : "accent"}>{share.revoked_at ? "Revoked" : "Active"}</Badge><Text size="xs" tone="tertiary">Created {dateLabel(share.created_at)}</Text></div><Text size="xs" tone="tertiary">Share {share.share_id} · created by {share.created_by}</Text>{share.revoked_at ? <Text size="xs" tone="tertiary">Revoked {dateLabel(share.revoked_at)}</Text> : <Button type="button" intent="ghost" loading={revoke.isPending} onClick={() => revoke.mutate()}>{revoke.isPending ? "Revoking…" : "Revoke link"}</Button>}{revoke.error ? <Failure error={revoke.error} /> : null}</article>;
}

function reviewLabel(state: SnapshotReviewState) {
  if (state === "approved") return "Approved";
  if (state === "changes_requested") return "Changes requested";
  return "Pending review";
}

function reviewTone(state: SnapshotReviewState): "accent" | "warn" | "neutral" {
  if (state === "approved") return "accent";
  if (state === "changes_requested") return "warn";
  return "neutral";
}

function SnapshotReviewPanel({ workspace, snapshot, review, members, mayWrite, shell, membersError }: { workspace: string; snapshot: string; review: BriefSnapshotReview; members: { account_id: string; name: string; email: string; role: string; access: string }[]; mayWrite: boolean; shell?: ReturnType<typeof useContext>["shell"]; membersError: Error | null }) {
  const [assignee, setAssignee] = useState(review.assignee_id ?? "");
  const [note, setNote] = useState("");
  const assignment = useResearchWrite(() => assignBriefSnapshotReviewerAction(workspace, snapshot, { assignee_id: assignee || null }), [keys.brief.snapshotReview(workspace, snapshot), keys.brief.snapshotActivity(workspace, snapshot)]);
  const approve = useResearchWrite(() => submitBriefSnapshotReviewAction(workspace, snapshot, { state: "approved", note }), [keys.brief.snapshotReview(workspace, snapshot), keys.brief.snapshotActivity(workspace, snapshot)]);
  const requestChanges = useResearchWrite(() => submitBriefSnapshotReviewAction(workspace, snapshot, { state: "changes_requested", note }), [keys.brief.snapshotReview(workspace, snapshot), keys.brief.snapshotActivity(workspace, snapshot)]);
  const assignedMember = members.find((member) => member.account_id === review.assignee_id);
  return <Panel title="Handoff review" note="Collaboration state is separate from the frozen content.">
    <div className={s.stack}>
      <div className={s.row}><Badge tone={reviewTone(review.state)}>{reviewLabel(review.state)}</Badge><Text size="xs" tone="tertiary">Updated {dateLabel(review.updated_at)}</Text></div>
      {membersError ? <Failure error={membersError} /> : null}
      {mayWrite ? <form className={s.stack} onSubmit={(event) => { event.preventDefault(); assignment.mutate(); }}>
        <Field label="Reviewer" hint="Assign a visible member of this investigation. Changes to this assignment are recorded in the audit trail.">{(aria) => <select {...aria} className={s.select} value={assignee} onChange={(event) => setAssignee(event.target.value)}><option value="">No reviewer assigned</option>{members.filter((member) => member.access !== "read" && member.role !== "client").map((member) => <option key={member.account_id} value={member.account_id}>{member.name} · {member.email}</option>)}</select>}</Field>
        <Failure error={assignment.error} />
        <Button type="submit" intent="ghost" loading={assignment.isPending}>{assignment.isPending ? "Saving assignment…" : "Save reviewer"}</Button>
      </form> : <Text size="sm" tone="tertiary">Assigned reviewer: {assignedMember?.name ?? (review.assignee_id ? authorLabel(review.assignee_id, shell) : "None")}</Text>}
      {mayWrite ? <form className={s.stack} onSubmit={(event) => { event.preventDefault(); requestChanges.mutate(); }}>
        <Field label="Review note" hint="Explain what the handoff still needs. A note is required when requesting changes.">{(aria) => <Textarea {...aria} rows={4} value={note} onChange={(event) => setNote(event.target.value)} placeholder="What should be clarified, cited, or revisited?" />}</Field>
        <div className={s.row}><Button type="button" intent="primary" loading={approve.isPending} onClick={() => approve.mutate()}>Approve handoff</Button><Button type="submit" intent="ghost" loading={requestChanges.isPending}>Request changes</Button></div>
        <Failure error={approve.error} /><Failure error={requestChanges.error} />
      </form> : <Text size="sm" tone="tertiary">This investigation is read-only. Review decisions remain visible, but only workspace writers can change the handoff review.</Text>}
      {review.decisions.length ? <section className={s.stack}><Text size="sm">Decision history</Text>{review.decisions.map((decision) => <article key={decision.decision_id} className={s.briefSection}><div className={s.row}><Badge tone={reviewTone(decision.state)}>{reviewLabel(decision.state)}</Badge><Text size="xs" tone="tertiary">{authorLabel(decision.reviewer_id, shell)} · {dateLabel(decision.created_at)}</Text></div>{decision.note ? <Text size="sm" className={s.body}>{decision.note}</Text> : null}</article>)}</section> : <Text size="sm" tone="tertiary">No review decision has been recorded yet.</Text>}
    </div>
  </Panel>;
}

function SnapshotCommentsPanel({ workspace, snapshot, comments, mayWrite, shell }: { workspace: string; snapshot: string; comments: BriefSnapshotComment[]; mayWrite: boolean; shell?: ReturnType<typeof useContext>["shell"] }) {
  const [body, setBody] = useState("");
  const add = useResearchWrite(() => addBriefSnapshotCommentAction(workspace, snapshot, { body }), [keys.brief.snapshotComments(workspace, snapshot), keys.brief.snapshotActivity(workspace, snapshot)], () => setBody(""));
  return <Panel title="Handoff comments" note="Reviewer and delivery discussion stays separate from the authored, frozen text and review decisions.">
    <div className={s.stack}>
      {mayWrite ? <form className={s.stack} onSubmit={(event) => { event.preventDefault(); add.mutate(); }}>
        <Field label="Add a comment" hint="Comments are append-only and visible to everyone who can read this handoff.">{(aria) => <Textarea {...aria} rows={4} maxLength={4000} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Call out a clarification, follow-up, or delivery concern…" />}</Field>
        <Failure error={add.error} />
        <Button type="submit" intent="ghost" loading={add.isPending} disabled={!body.trim()}>{add.isPending ? "Posting comment…" : "Post comment"}</Button>
      </form> : <Text size="sm" tone="tertiary">This investigation is read-only. Existing handoff comments remain visible, but only workspace writers can add new ones.</Text>}
      {comments.length ? <section className={s.stack}>{comments.map((comment) => <article key={comment.comment_id} className={s.briefSection}><div className={s.row}><Text size="xs" tone="tertiary">{authorLabel(comment.author, shell)} · {dateLabel(comment.created_at)}</Text></div><Text size="sm" className={s.body}>{comment.body}</Text></article>)}</section> : <Text size="sm" tone="tertiary">No handoff comments have been recorded yet.</Text>}
    </div>
  </Panel>;
}

function SnapshotActivityPanel({ entries, shell }: { entries: AuditEntry[]; shell?: ReturnType<typeof useContext>["shell"] }) {
  return <Panel title="Handoff activity" note="A focused audit of review, discussion, sharing, recipient access, and export actions for this frozen handoff.">
    {entries.length ? <div className={s.stack}>{entries.map((entry) => <article key={entry.id} className={s.briefSection}>
      <div className={s.row}><Badge tone="neutral">{activityLabel(entry)}</Badge><Text size="xs" tone="tertiary">{authorLabel(entry.actor.replace(/^user:/, ""), shell)} · {dateLabel(entry.occurred_at)}</Text></div>
      <Text size="xs" tone="tertiary">{entry.action}</Text>
    </article>)}</div> : <Text size="sm" tone="tertiary">No collaboration activity has been recorded for this handoff yet.</Text>}
  </Panel>;
}

function activityLabel(entry: AuditEntry) {
  if (entry.action === "brief.snapshot.created") return "Handoff frozen";
  if (entry.action === "brief.snapshot.review.assigned") return entry.detail.assignee_id ? "Reviewer assigned" : "Reviewer assignment cleared";
  if (entry.action === "brief.snapshot.review.decided") return entry.detail.state === "approved" ? "Handoff approved" : "Changes requested";
  if (entry.action === "brief.snapshot.comment.created") return "Comment added";
  if (entry.action === "brief.snapshot.share.created") return "Recipient link created";
  if (entry.action === "brief.snapshot.share.revoked") return "Recipient link revoked";
  if (entry.action === "brief.snapshot.handoff.accessed") return `Recipient view opened · ${String(entry.detail.access_mode ?? "unknown")}`;
  if (entry.action === "brief.snapshot.handoff.exported") return `Recipient export downloaded · ${String(entry.detail.access_mode ?? "unknown")}`;
  return entry.action;
}

function SnapshotSection({ label, value }: { label: string; value?: string }) {
  return <section className={s.briefSection}><Text size="xs" tone="tertiary">{label}</Text><Text size="sm" className={s.body}>{value?.trim() || "Not recorded."}</Text></section>;
}

function ObservationLinks({ label, ids, rows, workspace, snapshot }: { label: string; ids: string[]; rows: Evidence[]; workspace: string; snapshot: string }) {
  if (!ids.length) return <Text size="xs" tone="tertiary">{label}: none.</Text>;
  const byID = new Map(rows.map((row) => [row.observation_id, row]));
  const returnTo = investigationPath(workspace, `brief/snapshots/${encodeURIComponent(snapshot)}`);
  return <section className={s.stack}><Text size="xs" tone="tertiary">{label}</Text>{ids.map((id) => {
    const row = byID.get(id);
    if (!row) return <Text key={id} size="xs" tone="tertiary">Citation {id} could not be resolved.</Text>;
    return <article key={id} className={s.observation}>
      <Link href={sourceHref(workspace, row.source_id, row.capture_id, row.observation_id, returnTo)} className={s.inlineLink}>{row.source_title}</Link>
      <Text size="sm" className={s.evidenceStatement}>{row.statement}</Text>
      <blockquote className={s.quote}>{row.quote}</blockquote>
    </article>;
  })}</section>;
}

function EvidenceList({ rows, workspace, snapshot, ids }: { rows: Evidence[]; workspace: string; snapshot: string; ids: string[] }) {
  if (!ids.length) return <Text size="sm" tone="tertiary">No observations were cited.</Text>;
  const byID = new Map(rows.map((row) => [row.observation_id, row]));
  const returnTo = investigationPath(workspace, `brief/snapshots/${encodeURIComponent(snapshot)}`);
  return <div className={s.stack}>{ids.map((id) => {
    const row = byID.get(id);
    if (!row) return <Text key={id} size="sm" tone="tertiary">Citation {id} could not be resolved.</Text>;
    return <article key={id} className={s.observation}>
      <div className={s.eventMeta}><Link href={sourceHref(workspace, row.source_id, row.capture_id, row.observation_id, returnTo)} className={s.inlineLink}>{row.source_title}</Link><span className={s.muted}>Observation {row.observation_id}</span></div>
      <Text size="sm" className={s.evidenceStatement}>{row.statement}</Text>
      <blockquote className={s.quote}>{row.quote}</blockquote>
      <Text size="xs" tone="tertiary">Capture {row.capture_id} · recorded {dateLabel(row.recorded_at)}</Text>
    </article>;
  })}</div>;
}
