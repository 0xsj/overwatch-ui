"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Panel, Badge } from "@/components/display";
import { Button, Field, Input, Textarea } from "@/components/forms";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import type { ArtifactCleanupSweepRun, ArtifactLifecycleState, ArtifactLifecycleStatus, MediaType, RetentionQueueState, RetentionState, SourceIntakeStatus } from "@/lib/services/sources";
import { mayWriteResearch } from "../_route-context";
import { PageHead } from "../_components/page-head";
import { Query, useContext } from "../_hooks";
import { assistanceProviderPolicyQuery, retentionCleanupHistoryQuery, retentionCleanupQuery, retentionCleanupReviewQuery, retentionCleanupStatusQuery, retentionReviewQuery, sourceIntakeQuery, sourceSearchQuery, sourcesQuery } from "../_queries";
import { createSourceIntakeAction, discardRetentionCleanupReviewAction, reviewSourceIntakeAction, saveRetentionCleanupReviewAction, setAssistanceProviderPolicyAction, sweepRetentionCleanupAction } from "./_actions";
import { dateLabel, Failure, investigationPath, MoreButton, sourceHref, useResearchWrite } from "./_shared";
import { SourceForm } from "./source-form";
import s from "./investigation.module.css";

export function SourcesScreen({ workspace }: { workspace: string }) {
  const { shell } = useContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const cache = useQueryClient();
  const mayWrite = mayWriteResearch(shell?.context?.workspace);
  const mayAdmin = shell?.context?.workspace.access === "admin";
  const [retentionState, setRetentionState] = useState<RetentionQueueState>("");
  const [cleanupConfirmed, setCleanupConfirmed] = useState(false);
  const [discardReason, setDiscardReason] = useState("");
  const [localCleanupSelection, setLocalCleanupSelection] = useState<{ workspace: string; refs: string[] } | null>(null);
  const [lifecycleState, setLifecycleState] = useState<ArtifactLifecycleState | "">("");
  const [lifecycleRef, setLifecycleRef] = useState("");
  const [sourceSearch, setSourceSearch] = useState("");
  const [intakeStatus, setIntakeStatus] = useState<SourceIntakeStatus | "">("pending");
  const [intakeTitle, setIntakeTitle] = useState("");
  const [intakeOrigin, setIntakeOrigin] = useState<"reference" | "import">("reference");
  const [intakeURL, setIntakeURL] = useState("");
  const [intakeFilename, setIntakeFilename] = useState("");
  const [intakeContent, setIntakeContent] = useState("");
  const [intakeContentBase64, setIntakeContentBase64] = useState("");
  const [intakeMedia, setIntakeMedia] = useState<MediaType>("text/plain");
  const [intakeNote, setIntakeNote] = useState("");
  const [intakeFileError, setIntakeFileError] = useState<Error | null>(null);
  const [intakeReading, setIntakeReading] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const normalizedSourceSearch = sourceSearch.trim();
  const normalizedTextSearch = searchParams.get("search")?.trim().slice(0, 200) ?? "";
  const searchReturn = normalizedTextSearch ? `${investigationPath(workspace, "sources")}?search=${encodeURIComponent(normalizedTextSearch)}` : investigationPath(workspace, "sources");
  const sources = useInfiniteQuery({ queryKey: keys.sources.list(workspace, normalizedSourceSearch), queryFn: ({ pageParam }) => sourcesQuery(workspace, pageParam, normalizedSourceSearch), initialPageParam: undefined as string | undefined, getNextPageParam: (page) => page.next_cursor ?? undefined });
  const intake = useInfiniteQuery({ queryKey: keys.sources.intake(workspace, intakeStatus), queryFn: ({ pageParam }) => sourceIntakeQuery(workspace, intakeStatus, pageParam), initialPageParam: undefined as string | undefined, getNextPageParam: (page) => page.next_cursor ?? undefined });
  const textResults = useInfiniteQuery({ queryKey: keys.sources.search(workspace, normalizedTextSearch), queryFn: ({ pageParam }) => sourceSearchQuery(workspace, normalizedTextSearch, pageParam), initialPageParam: undefined as string | undefined, getNextPageParam: (page) => page.next_cursor ?? undefined, enabled: Boolean(normalizedTextSearch), retry: false });
  const retention = useInfiniteQuery({ queryKey: keys.sources.retentionQueue(workspace, retentionState), queryFn: ({ pageParam }) => retentionReviewQuery(workspace, retentionState, pageParam), initialPageParam: undefined as string | undefined, getNextPageParam: (page) => page.next_cursor ?? undefined });
  const cleanup = useQuery({ queryKey: keys.sources.retentionCleanup(workspace), queryFn: () => retentionCleanupQuery(workspace), enabled: mayAdmin, retry: false });
  const cleanupReview = useQuery({ queryKey: keys.sources.retentionCleanupReview(workspace), queryFn: () => retentionCleanupReviewQuery(workspace), enabled: mayAdmin, retry: false });
  const cleanupReviewHistory = useQuery({ queryKey: keys.sources.retentionCleanupHistory(workspace), queryFn: () => retentionCleanupHistoryQuery(workspace), enabled: mayAdmin, retry: false });
  const cleanupStatus = useInfiniteQuery({ queryKey: keys.sources.retentionCleanupStatus(workspace, lifecycleState, lifecycleRef), queryFn: ({ pageParam }) => retentionCleanupStatusQuery(workspace, lifecycleState, pageParam, lifecycleRef), initialPageParam: undefined as string | undefined, getNextPageParam: (page) => page.next_cursor ?? undefined, enabled: mayAdmin, retry: false });
  const assistancePolicy = useQuery({ queryKey: keys.assistance.policy(workspace), queryFn: () => assistanceProviderPolicyQuery(workspace), retry: false });
  const assistancePolicyWrite = useResearchWrite(
    () => setAssistanceProviderPolicyAction(workspace, !(assistancePolicy.data?.allow_external ?? false)),
    [keys.assistance.policy(workspace)],
    () => void assistancePolicy.refetch(),
  );
  const createIntake = useResearchWrite(
    () => createSourceIntakeAction(workspace, {
      title: intakeTitle,
      origin: intakeOrigin,
      note: intakeNote,
      ...(intakeOrigin === "reference" ? { url: intakeURL } : {
        filename: intakeFilename,
        media_type: intakeMedia,
        ...(intakeContentBase64 ? { content_base64: intakeContentBase64 } : { content: intakeContent }),
      }),
    }),
    [keys.sources.intake(workspace, intakeStatus)],
    () => { setIntakeTitle(""); setIntakeOrigin("reference"); setIntakeURL(""); setIntakeFilename(""); setIntakeContent(""); setIntakeContentBase64(""); setIntakeMedia("text/plain"); setIntakeNote(""); setIntakeFileError(null); void intake.refetch(); },
  );
  const reviewIntake = useMutation({
    mutationFn: async (input: { intake: string; decision: "approved" | "rejected"; note: string }) => {
      const result = await reviewSourceIntakeAction(workspace, input.intake, { decision: input.decision, note: input.note });
      if (!result.ok) throw new Error(result.message);
      return result.value;
    },
    onSuccess: async (result) => {
      await cache.invalidateQueries({ queryKey: keys.sources.intake(workspace, intakeStatus) });
      setReviewNote("");
      if (result.source) router.push(sourceHref(workspace, result.source.source_id));
    },
  });
  const sourceRows = sources.data?.pages.flatMap((page) => page.items) ?? [];
  const intakeRows = intake.data?.pages.flatMap((page) => page.items) ?? [];
  const intakeReady = intakeOrigin === "reference" ? Boolean(intakeURL.trim()) : Boolean(intakeFilename && (intakeContentBase64 || intakeContent));
  const readIntakeFile = async (file: File | undefined) => {
    setIntakeFileError(null);
    if (!file) return;
    const binary = /\.(pdf|png|jpe?g|webp)$/i.test(file.name);
    if (file.size > (binary ? 8388608 : 262144)) { setIntakeFileError(new Error(binary ? "Choose a PDF or image of 8 MiB or smaller." : "Choose a text or JSON file of 256 KiB or smaller.")); return; }
    if (!/\.(txt|json|pdf|png|jpe?g|webp)$/i.test(file.name)) { setIntakeFileError(new Error("Choose a .txt, .json, .pdf, .png, .jpg, or .webp file.")); return; }
    setIntakeReading(true);
    try {
      const raw = await file.arrayBuffer();
      const extension = file.name.toLowerCase();
      if (binary) {
        const bytes = new Uint8Array(raw);
        let encoded = "";
        for (let offset = 0; offset < bytes.length; offset += 0x8000) encoded += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
        setIntakeFilename(file.name); setIntakeContent(""); setIntakeContentBase64(btoa(encoded)); setIntakeMedia(extension.endsWith(".pdf") ? "application/pdf" : extension.endsWith(".png") ? "image/png" : extension.endsWith(".webp") ? "image/webp" : "image/jpeg");
      } else {
        const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(raw);
        if (/\.json$/i.test(file.name)) JSON.parse(text);
        setIntakeFilename(file.name); setIntakeContentBase64(""); setIntakeContent(text); setIntakeMedia(/\.json$/i.test(file.name) ? "application/json" : "text/plain");
      }
      if (!intakeTitle) setIntakeTitle(file.name);
    } catch { setIntakeFileError(new Error("The file must contain valid UTF-8 text or valid JSON.")); }
    finally { setIntakeReading(false); }
  };
  const textResultRows = textResults.data?.pages.flatMap((page) => page.items) ?? [];
  const selectedCleanupRefs = localCleanupSelection?.workspace === workspace ? localCleanupSelection.refs : cleanupReview.data?.status === "open" ? cleanupReview.data.selected_refs : [];
  const reviewSave = useResearchWrite(() => saveRetentionCleanupReviewAction(workspace, selectedCleanupRefs), [keys.sources.retentionCleanupReview(workspace), keys.sources.retentionCleanupHistory(workspace)]);
  const savedReviewRefs = cleanupReview.data?.status === "open" ? cleanupReview.data.selected_refs : [];
  const selectionMatchesReview = cleanupReview.data?.status === "open" && sameRefs(savedReviewRefs, selectedCleanupRefs);
  const reviewId = selectionMatchesReview ? cleanupReview.data?.review_id ?? "" : "";
  const discardReview = useResearchWrite(() => discardRetentionCleanupReviewAction(workspace, cleanupReview.data?.review_id ?? "", discardReason), [keys.sources.retentionCleanupReview(workspace), keys.sources.retentionCleanupHistory(workspace)], () => { setDiscardReason(""); setCleanupConfirmed(false); setLocalCleanupSelection({ workspace, refs: [] }); void cleanupReview.refetch(); void cleanupReviewHistory.refetch(); });
  const sweep = useResearchWrite(() => sweepRetentionCleanupAction(workspace, selectedCleanupRefs, reviewId), [keys.sources.retentionCleanup(workspace), keys.sources.retentionCleanupReview(workspace), keys.sources.retentionCleanupHistory(workspace), keys.sources.retentionCleanupStatus(workspace, lifecycleState, lifecycleRef)], () => { setCleanupConfirmed(false); setLocalCleanupSelection({ workspace, refs: [] }); void cleanup.refetch(); void cleanupReview.refetch(); void cleanupReviewHistory.refetch(); void cleanupStatus.refetch(); });
  return <>
    <PageHead title="Sources">Read the material behind your investigation. Captured text stays available when a website changes.</PageHead>
    <Panel title="Search retained text" note="Searches every retained text capture and successful OCR or PDF extraction in this investigation. Results keep exact source, capture, and extraction identity.">
      <div className={s.stack}>
        <Input aria-label="Search retained text across this investigation" value={normalizedTextSearch} maxLength={200} onChange={(event) => { const next = new URLSearchParams(searchParams.toString()); const query = event.target.value.slice(0, 200); if (query.trim()) next.set("search", query); else next.delete("search"); router.replace(`${investigationPath(workspace, "sources")}${next.size ? `?${next}` : ""}`); }} placeholder="Search across retained text and derived text" />
        {normalizedTextSearch ? <Query of={textResults} label="retained-text search">{() => textResultRows.length ? <><Text size="xs" tone="tertiary">Showing {textResultRows.length} matching artifact{textResultRows.length === 1 ? "" : "s"}.</Text><div className={s.sourceList}>{textResultRows.map((result) => <Link key={`${result.extraction_id ?? result.capture_id}:${result.match_start}`} href={sourceHref(workspace, result.source_id, result.capture_id, undefined, searchReturn, normalizedTextSearch, 0, result.extraction_id, result.match, result.match_start)} className={s.sourceCard}><span className={s.sourceTitle}>{result.source_title}</span><span className={s.row}><Badge tone="neutral">Capture v{result.capture_version}</Badge>{result.extraction_id ? <Badge tone="accent">{result.extraction_method ?? "Derived text"}</Badge> : <Badge tone="neutral">Retained text</Badge>}<span className={s.muted}>{result.match_start}–{result.match_end}</span></span><blockquote className={s.quote}>{result.excerpt}</blockquote><Text size="xs" tone="tertiary">Matched “{result.match}” · open exact reader position and observation draft</Text></Link>)}</div><MoreButton available={textResults.hasNextPage} pending={textResults.isFetchingNextPage} load={() => void textResults.fetchNextPage()} /></> : <Text size="sm" tone="tertiary">No retained text matches this query.</Text>}</Query> : <Text size="sm" tone="tertiary">Search is workspace-scoped and returns one exact, source-grounded result per matching capture or successful extraction.</Text>}
      </div>
    </Panel>
    <Panel title="Assistance provider policy" note="A workspace-wide privacy boundary for retained research material.">
      <Query of={assistancePolicy} label="assistance provider policy">{(policy) => <div className={s.stack}>
        <div className={s.row}><Badge tone={policy.allow_external ? "warn" : "accent"}>{policy.allow_external ? "External provider allowed" : "External provider blocked"}</Badge><Text size="sm">{policy.allow_external ? "Retained material may be sent to an explicitly configured external assistance provider." : "Only local assistance may use retained material until an admin opts in."}</Text></div>
        {mayAdmin ? <Button type="button" intent="ghost" loading={assistancePolicyWrite.isPending} onClick={() => assistancePolicyWrite.mutate()}>{policy.allow_external ? "Disable external providers" : "Allow external providers"}</Button> : <Text size="xs" tone="tertiary">Only workspace admins can change this setting.</Text>}
        <Failure error={assistancePolicyWrite.error} />
      </div>}</Query>
    </Panel>
    <Panel title="Source intake review" note="Stage URLs or imported files here before they become retained source records. Pending files stay outside source history until a writer approves them.">
      <div className={s.stack}>
        {mayWrite ? <form className={s.stack} onSubmit={(event) => { event.preventDefault(); createIntake.mutate(); }}>
          <Field label="Candidate title" hint="Give the discovered source a reviewable name before retention.">{(aria) => <Input {...aria} value={intakeTitle} onChange={(event) => setIntakeTitle(event.target.value)} maxLength={400} placeholder="Harbor authority bulletin" />}</Field>
          <Field label="Candidate type">{({ invalid: _invalid, ...aria }) => <select {...aria} className={s.select} value={intakeOrigin} onChange={(event) => { const next = event.target.value as "reference" | "import"; setIntakeOrigin(next); setIntakeFileError(null); }}><option value="reference">URL reference</option><option value="import">Imported file</option></select>}</Field>
          {intakeOrigin === "reference" ? <Field label="Candidate URL" hint="Only HTTP and HTTPS URLs without credentials are accepted.">{(aria) => <Input {...aria} type="url" value={intakeURL} onChange={(event) => setIntakeURL(event.target.value)} maxLength={4000} placeholder="https://example.test/bulletin" />}</Field> : <Field label="Candidate file" hint="Text/JSON up to 256 KiB; PDF/images up to 8 MiB. Bytes remain staged until approval.">{({ invalid: _invalid, ...aria }) => <input {...aria} type="file" accept=".txt,.json,.pdf,.png,.jpg,.jpeg,.webp,text/plain,application/json,application/pdf,image/png,image/jpeg,image/webp" className={s.file} onChange={(event) => void readIntakeFile(event.target.files?.[0])} />}</Field>}
          {intakeFilename ? <Text size="sm" tone="tertiary">Selected import: {intakeFilename} ({intakeMedia})</Text> : null}
          <Field label="Why should this be reviewed?" hint="This note travels with the candidate and is not source content.">{(aria) => <Textarea {...aria} rows={2} value={intakeNote} onChange={(event) => setIntakeNote(event.target.value)} maxLength={2000} placeholder="Discovered while checking the public transport feed." />}</Field>
          <Failure error={intakeFileError ?? createIntake.error} />
          {createIntake.isSuccess ? <Text size="sm" tone="accent" role="status">Candidate staged for review.</Text> : null}
          <Button type="submit" intent="ghost" loading={createIntake.isPending || intakeReading} disabled={!intakeTitle.trim() || !intakeReady || Boolean(intakeFileError) || intakeReading}>Stage candidate</Button>
        </form> : <Text size="sm" tone="tertiary">You have read access only. A workspace writer can stage and review source candidates.</Text>}
        <label className={s.row}><Text as="span" size="sm">Show</Text><select aria-label="Source intake status" className={s.select} value={intakeStatus} onChange={(event) => setIntakeStatus(event.target.value as SourceIntakeStatus | "")}><option value="pending">Pending review</option><option value="">All candidates</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label>
        <Query of={intake} label="source intake review">{() => intakeRows.length ? <div className={s.sourceList}>{intakeRows.map((candidate) => <div key={candidate.intake_id} className={s.sourceCard}>
          <span className={s.row}><span className={s.sourceTitle}>{candidate.title}</span><Badge tone={candidate.status === "approved" ? "accent" : candidate.status === "rejected" ? "neutral" : "warn"}>{candidate.status}</Badge></span>
          {candidate.origin === "import" ? <Text size="xs" tone="tertiary" className={s.body}>Imported file: {candidate.filename} · {candidate.media_type}</Text> : candidate.url ? <Text size="xs" tone="tertiary" className={s.body}>{candidate.url}</Text> : null}
          {candidate.note ? <Text size="sm" tone="tertiary" className={s.body}>{candidate.note}</Text> : null}
          {candidate.status === "pending" && mayWrite ? <div className={s.stack}><Field label="Review note" hint="Required for either decision and retained with the review event.">{(aria) => <Textarea {...aria} rows={2} value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} maxLength={2000} placeholder="Why this should or should not enter the investigation." />}</Field><div className={s.row}><Button type="button" intent="primary" loading={reviewIntake.isPending} disabled={!reviewNote.trim()} onClick={() => reviewIntake.mutate({ intake: candidate.intake_id, decision: "approved", note: reviewNote })}>Approve and create source</Button><Button type="button" intent="ghost" loading={reviewIntake.isPending} disabled={!reviewNote.trim()} onClick={() => reviewIntake.mutate({ intake: candidate.intake_id, decision: "rejected", note: reviewNote })}>Reject candidate</Button></div></div> : null}
          {candidate.source_id ? <Link className={s.inlineLink} href={sourceHref(workspace, candidate.source_id)}>Open created source ↗</Link> : null}
          {candidate.review_note ? <Text size="xs" tone="tertiary" className={s.body}>Review: {candidate.review_note}</Text> : null}
        </div>)}</div> : <div className={s.empty}><Text size="sm">No source candidates in this queue.</Text><Text size="sm" tone="tertiary">Candidates remain separate from retained sources until a writer explicitly approves one.</Text></div>}</Query>
        <Failure error={reviewIntake.error} />
        <MoreButton available={intake.hasNextPage} pending={intake.isFetchingNextPage} load={() => void intake.fetchNextPage()} />
      </div>
    </Panel>
    <Panel title="Retention review" note="A queue view over the same hold, date, and dependency checks that govern purge.">
      <Query of={retention} label="retention review">{(data) => <div className={s.stack}>
        <label className={s.row}><Text as="span" size="sm">Show</Text><select aria-label="Retention review state" className={s.select} value={retentionState} onChange={(event) => setRetentionState(event.target.value as RetentionQueueState)}><option value="">All lifecycle states</option><option value="unscheduled">Unscheduled</option><option value="scheduled">Scheduled</option><option value="due">Due and clear</option><option value="blocked">Due but blocked</option><option value="held">Legal hold</option><option value="purged">Purged</option></select></label>
        <div className={s.sourceList}>{data.pages.flatMap((page) => page.items).map((item) => <Link key={item.source.source_id} href={sourceHref(workspace, item.source.source_id)} className={s.sourceCard}>
          <span className={s.sourceTitle}>{item.source.title}</span>
          <span className={s.row}><Badge tone={retentionTone(item.review.state)}>{retentionLabel(item.review.state)}</Badge><Badge tone="neutral">{item.source.sensitivity}</Badge><span className={s.muted}>{item.review.dependencies.observation_count} observation{item.review.dependencies.observation_count === 1 ? "" : "s"} · {item.review.dependencies.extraction_count} extraction{item.review.dependencies.extraction_count === 1 ? "" : "s"}</span></span>
          <Text size="xs" tone="tertiary" className={s.body}>{item.review.eligible ? "Eligible for explicit purge." : item.review.blockers.join(", ") || "Review the retention date."}</Text>
        </Link>)}</div>
        {data.pages[0].items.length === 0 ? <div className={s.empty}><Text size="sm">No sources match this lifecycle state.</Text><Text size="sm" tone="tertiary">The queue is workspace-scoped and updates as dates, holds, citations, and derived artifacts change.</Text></div> : null}
        <MoreButton available={retention.hasNextPage} pending={retention.isFetchingNextPage} load={() => void retention.fetchNextPage()} />
      </div>}</Query>
    </Panel>
    {mayAdmin ? <Panel title="Physical cleanup" note="Purged records stay. Only content-addressed files with no live source, extraction, run, or report reference are eligible.">
      <Query of={cleanup} label="physical cleanup">{(data) => {
        const selectedCleanupItems = data.items.filter((item) => selectedCleanupRefs.includes(item.ref));
        const selectedCleanupBytes = selectedCleanupItems.reduce((sum, item) => sum + item.bytes, 0);
        return <div className={s.stack}>
        <Text size="sm">{data.candidate_count} unreferenced file{data.candidate_count === 1 ? "" : "s"} · {data.candidate_bytes.toLocaleString()} byte{data.candidate_bytes === 1 ? "" : "s"}</Text>
        {data.items.length ? <div className={s.sourceList}>{data.items.map((item) => <div key={`${item.kind}:${item.ref}`} className={s.sourceCard}><label className={s.checkboxLabel}><input type="checkbox" checked={selectedCleanupRefs.includes(item.ref)} onChange={(event) => setLocalCleanupSelection({ workspace, refs: event.target.checked ? [...selectedCleanupRefs, item.ref] : selectedCleanupRefs.filter((ref) => ref !== item.ref) })} /><span><span className={s.sourceTitle}>{item.kind === "source_capture" ? "Source capture" : "Derived extraction"}</span><span className={s.muted}>{item.bytes.toLocaleString()} bytes · purged {dateLabel(item.purged_at)}</span></span></label><Text size="xs" tone="tertiary" className={s.body}>{item.ref}</Text><Link href={sourceHref(workspace, item.source_id)} className={s.inlineLink}>Open source record</Link></div>)}</div> : <Text size="sm" tone="tertiary">Nothing is eligible for physical cleanup. The inventory is deliberately conservative.</Text>}
        <Text size="sm" tone={selectedCleanupRefs.length ? "primary" : "tertiary"}>{selectedCleanupRefs.length ? `${selectedCleanupRefs.length} selected · ${selectedCleanupBytes.toLocaleString()} currently eligible bytes` : "Select one or more verified files to prepare a cleanup review."}</Text>
        {cleanupReview.data?.status === "open" ? <Text size="xs" tone="tertiary">Saved review updated {dateLabel(cleanupReview.data.updated_at)}. {selectionMatchesReview ? "The current selection matches it." : "The current selection has unsaved changes."}</Text> : <Text size="xs" tone="tertiary">Selections are not executable until you save the review.</Text>}
        <div className={s.row}><Button type="button" intent="ghost" loading={reviewSave.isPending} disabled={selectedCleanupItems.length === 0 || Boolean(selectionMatchesReview)} onClick={() => reviewSave.mutate()}>Save cleanup review</Button></div>
        <Failure error={reviewSave.error} />
        {cleanupReview.data?.status === "open" ? <div className={s.stack}><Text size="xs" tone="tertiary">Discarding an open review keeps the audit record but releases the saved selection.</Text><label className={s.stack}><Text as="span" size="sm">Discard reason</Text><input aria-label="Cleanup review discard reason" className={s.input} value={discardReason} onChange={(event) => setDiscardReason(event.target.value)} placeholder="Why is this review no longer needed?" /></label><div className={s.row}><Button type="button" intent="ghost" loading={discardReview.isPending} disabled={!discardReason.trim()} onClick={() => discardReview.mutate()}>Discard open review</Button></div><Failure error={discardReview.error} /></div> : null}
        {data.recent_sweeps.length ? <div className={s.stack}><Text size="xs" tone="tertiary">Recent sweep runs</Text>{data.recent_sweeps.slice(0, 3).map((run) => <div key={run.sweep_id} className={s.row}><Badge tone={cleanupRunTone(run)}>{cleanupRunLabel(run.status)}</Badge><span className={s.muted}>{run.deleted_count} removed · {dateLabel(run.started_at)}</span>{run.error ? <Text size="xs" tone="tertiary" className={s.body}>{run.error}</Text> : null}</div>)}</div> : null}
        <Query of={cleanupReviewHistory} label="cleanup review history">{(history) => history.items.length ? <div className={s.stack}><Text size="xs" tone="tertiary">Cleanup review history</Text>{history.items.map((review) => <div key={review.review_id} className={s.sourceCard}><span className={s.row}><Badge tone={cleanupReviewTone(review.status)}>{cleanupReviewLabel(review.status)}</Badge><span className={s.muted}>{review.item_count} file{review.item_count === 1 ? "" : "s"} · {review.item_bytes.toLocaleString()} bytes · {dateLabel(review.updated_at)}</span></span>{review.sweep_id ? <Text size="xs" tone="tertiary" className={s.body}>Sweep {review.sweep_id}</Text> : null}{review.discard_reason ? <Text size="xs" tone="tertiary" className={s.body}>Reason: {review.discard_reason}</Text> : null}</div>)}</div> : null}</Query>
        <Query of={cleanupStatus} label="artifact lifecycle">{(data) => <div className={s.stack}><Text size="xs" tone="tertiary">Artifact lifecycle</Text><label className={s.row}><Text as="span" size="sm">State</Text><select aria-label="Artifact lifecycle state" className={s.select} value={lifecycleState} onChange={(event) => setLifecycleState(event.target.value as ArtifactLifecycleState | "")}><option value="">All states</option><option value="protected">Protected</option><option value="eligible">Eligible</option><option value="swept">Swept</option><option value="already_gone">Already gone</option><option value="missing">Missing</option><option value="mismatched">Size mismatch</option><option value="corrupted">Corrupted</option><option value="unavailable">Unavailable</option></select></label><label className={s.row}><Text as="span" size="sm">Exact reference</Text><input aria-label="Exact artifact reference" className={s.input} value={lifecycleRef} onChange={(event) => setLifecycleRef(event.target.value.trim())} placeholder="sha256:…" /></label><Text size="xs" tone="tertiary">{lifecycleSummary(data.pages[0]?.state_counts ?? {})}</Text>{data.pages.flatMap((page) => page.items).map((item) => <Link key={item.ref} href={sourceHref(workspace, item.source_id)} className={s.sourceCard}><span className={s.row}><Badge tone={lifecycleTone(item)}>{lifecycleLabel(item.state)}</Badge><span className={s.muted}>{item.bytes.toLocaleString()} bytes · {item.reference_count} reference{item.reference_count === 1 ? "" : "s"}</span></span><Text size="xs" tone="tertiary" className={s.body}>{item.reason}</Text><Text size="xs" tone="tertiary" className={s.body}>{item.ref}</Text></Link>)}<MoreButton available={cleanupStatus.hasNextPage} pending={cleanupStatus.isFetchingNextPage} load={() => void cleanupStatus.fetchNextPage()} /></div>}</Query>
        <label className={s.checkboxLabel}><input type="checkbox" checked={cleanupConfirmed} onChange={(event) => setCleanupConfirmed(event.target.checked)} /><span>I understand this removes only the selected verified, unreferenced bytes; records and audit history remain.</span></label>
        <Failure error={sweep.error} />
        {sweep.isSuccess ? <Text size="sm" tone="accent" role="status">Cleanup completed: {sweep.data.deleted.length} file{sweep.data.deleted.length === 1 ? "" : "s"} removed.</Text> : null}
        <Button type="button" intent="ghost" loading={sweep.isPending} disabled={!cleanupConfirmed || selectedCleanupRefs.length === 0 || !selectionMatchesReview} onClick={() => sweep.mutate()}>Sweep saved selection</Button>
      </div>}}
      </Query>
    </Panel> : null}
    <div className={mayWrite ? s.columns : undefined}>
      <Panel title="Collected material">
        <Query of={sources} label="sources">{() => <div className={s.stack}>
          <Input aria-label="Search collected sources" value={sourceSearch} onChange={(event) => setSourceSearch(event.target.value)} placeholder="Search title, URL, filename, or source ID" />
          {sourceRows.length ? <Text size="xs" tone="tertiary">{normalizedSourceSearch ? `Showing ${sourceRows.length} matching source${sourceRows.length === 1 ? "" : "s"} from the server.` : `Showing ${sourceRows.length} loaded source${sourceRows.length === 1 ? "" : "s"}.`}</Text> : null}
          {sourceRows.length ? <div className={s.sourceList}>{sourceRows.map((source) => <Link key={source.source_id} href={sourceHref(workspace, source.source_id)} className={s.sourceCard}>
            <span className={s.sourceTitle}>{source.title}</span>
            <span className={s.row}><Badge tone={source.latest_capture ? "neutral" : "warn"}>{source.latest_capture ? `Capture v${source.latest_capture.version}` : "URL reference only"}</Badge><span className={s.muted}>Added {dateLabel(source.created_at)}</span>{source.published_at ? <span className={s.muted}>Published {dateLabel(source.published_at)}</span> : null}</span>
            {source.url ? <Text size="xs" tone="tertiary" className={s.body}>{source.url}</Text> : null}
          </Link>)}</div> : normalizedSourceSearch ? <Text size="sm" tone="tertiary">No sources match this server search.</Text> : <div className={s.empty}><Text size="sm">Start with one source.</Text><Text size="sm" tone="tertiary">Paste a public notice, import an exported post, or save a URL to examine later.</Text></div>}
          <MoreButton available={sources.hasNextPage} pending={sources.isFetchingNextPage} load={() => void sources.fetchNextPage()} />
        </div>}</Query>
      </Panel>
      {mayWrite ? <Panel id="add-source" title="Add source"><SourceForm workspace={workspace} /></Panel> : null}
    </div>
  </>;
}

function retentionLabel(state: RetentionState) {
  switch (state) {
    case "unscheduled": return "Unscheduled";
    case "scheduled": return "Scheduled";
    case "due": return "Due";
    case "blocked": return "Blocked";
    case "held": return "Legal hold";
    case "purged": return "Purged";
  }
}

function retentionTone(state: RetentionState): "neutral" | "accent" | "warn" | "crit" | "info" {
  switch (state) {
    case "due": return "accent";
    case "blocked": return "warn";
    case "held": return "crit";
    case "purged": return "info";
    default: return "neutral";
  }
}

function cleanupRunLabel(status: ArtifactCleanupSweepRun["status"]) {
  switch (status) {
    case "completed": return "Completed";
    case "failed": return "Failed";
    case "interrupted": return "Interrupted";
    default: return "Running";
  }
}

function cleanupRunTone(run: ArtifactCleanupSweepRun): "neutral" | "accent" | "warn" | "crit" | "info" {
  switch (run.status) {
    case "completed": return "accent";
    case "failed": return "crit";
    case "interrupted": return "warn";
    default: return "info";
  }
}

function cleanupReviewLabel(status: "open" | "completed" | "discarded") {
  switch (status) {
    case "completed": return "Completed";
    case "discarded": return "Discarded";
    default: return "Open";
  }
}

function cleanupReviewTone(status: "open" | "completed" | "discarded"): "neutral" | "accent" | "warn" | "crit" | "info" {
  switch (status) {
    case "completed": return "accent";
    case "discarded": return "warn";
    default: return "info";
  }
}

function lifecycleLabel(state: ArtifactLifecycleStatus["state"]) {
  switch (state) {
    case "protected": return "Protected";
    case "eligible": return "Eligible";
    case "swept": return "Swept";
    case "already_gone": return "Already gone";
    case "missing": return "Missing";
    case "mismatched": return "Size mismatch";
    case "corrupted": return "Corrupted";
    default: return "Unavailable";
  }
}

function lifecycleTone(item: ArtifactLifecycleStatus): "neutral" | "accent" | "warn" | "crit" | "info" {
  switch (item.state) {
    case "eligible": return "accent";
    case "swept": return "info";
    case "mismatched":
    case "missing":
    case "already_gone": return "warn";
    case "corrupted":
    case "unavailable": return "crit";
    default: return "neutral";
  }
}

function lifecycleSummary(counts: Partial<Record<ArtifactLifecycleStatus["state"], number>>) {
  return Object.entries(counts).filter(([, count]) => count).map(([state, count]) => `${count} ${lifecycleLabel(state as ArtifactLifecycleStatus["state"]).toLowerCase()}`).join(" · ");
}

function sameRefs(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((ref) => rightSet.has(ref));
}
