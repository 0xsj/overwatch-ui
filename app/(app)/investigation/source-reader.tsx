"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Field, Input, Textarea } from "@/components/forms";
import { Badge, Panel } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import { filterLoadedRows } from "@/lib/query/filter";
import type { Capture, ManualObservation, SourceDetail, SourceSensitivity, TextCapture } from "@/lib/services/sources";
import { citedParts, quoteOccurrences } from "@/lib/services/sources/citation";
import { diffText, type TextDiffLine } from "@/lib/services/sources/diff";
import { duplicateCaptureVersion } from "@/lib/services/sources/history";
import { textOccurrences } from "@/lib/services/sources/search";
import type { AssistanceProposal, LatestAssistance } from "@/lib/services/assistance";
import type { ResearchConnectionKind } from "@/lib/services/research-connections";
import { mayWriteResearch } from "../_route-context";
import { PageHead } from "../_components/page-head";
import { Query, useContext } from "../_hooks";
import { assistanceHistoryQuery, captureExtractionQuery, captureExtractionsQuery, captureQuery, latestAssistanceQuery, sourceObservationQuery, sourceObservationsQuery, sourceQuery, sourceRetentionReviewQuery } from "../_queries";
import { extractCaptureAction, fetchSourceAction, generateAssistanceAction, purgeSourceAction, reviewAssistanceProposalAction, setSourcePrivacyAction, setSourceRetentionAction } from "./_actions";
import { authorLabel, dateLabel, Failure, investigationPath, MoreButton, recordHref, sourceHref, useResearchWrite } from "./_shared";
import { ObservationForm, type ObservationPrefill } from "./observation-form";
import { SourceForm } from "./source-form";
import s from "./investigation.module.css";

export function SourceReader({ workspace, source }: { workspace: string; source: string }) {
  const requestedReturn = useSearchParams().get("return") ?? "";
  const returnTo = requestedReturn.startsWith(`/investigation/${encodeURIComponent(workspace)}/`) ? requestedReturn : "";
  const detail = useQuery({ queryKey: keys.sources.one(workspace, source), queryFn: () => sourceQuery(workspace, source) });
  return <><Link href={returnTo || investigationPath(workspace, "sources")} className={s.back}>{returnTo ? "Back to handoff" : "Back to sources"}</Link><Query of={detail} label="source">{(data) => <SourceRecord workspace={workspace} detail={data} returnTo={returnTo} />}</Query></>;
}

function SourceRecord({ workspace, detail, returnTo }: { workspace: string; detail: SourceDetail; returnTo: string }) {
  const { source, captures } = detail;
  const params = useSearchParams();
  const router = useRouter();
  const { shell } = useContext();
  const [compareCaptureId, setCompareCaptureId] = useState<string>();
  const [captureFilter, setCaptureFilter] = useState("");
  const [observationFilter, setObservationFilter] = useState("");
  const [retentionDate, setRetentionDate] = useState(() => source.retention_until ? source.retention_until.slice(0, 10) : "");
  const [sensitivity, setSensitivity] = useState<SourceSensitivity>(source.sensitivity ?? "internal");
  const [legalHold, setLegalHold] = useState(source.legal_hold ?? false);
  const [legalHoldReason, setLegalHoldReason] = useState(source.legal_hold_reason ?? "");
  const [purgeReason, setPurgeReason] = useState("");
  const [purgeConfirmed, setPurgeConfirmed] = useState(false);
  const mayWrite = mayWriteResearch(shell?.context?.workspace);
  const citationId = params.get("citation") ?? "";
  const searchQuery = params.get("find")?.trim().slice(0, 200) ?? "";
  const searchIndex = nonNegativeIndex(params.get("match"));
  const requestedExtractionId = params.get("extraction") || undefined;
  const requestedObservationQuote = params.get("observe_quote")?.slice(0, 200) ?? "";
  const requestedObservationStart = optionalNonNegativeIndex(params.get("observe_start"));
  const observationDraft = requestedObservationQuote && requestedObservationStart !== undefined ? { statement: "", quote: requestedObservationQuote, quoteStart: requestedObservationStart, origin: "workspace-search" as const } : undefined;
  const citation = useQuery({ queryKey: keys.sources.observation(workspace, source.source_id, citationId), queryFn: () => sourceObservationQuery(workspace, source.source_id, citationId), enabled: Boolean(citationId), retry: false });
  const captureId = params.get("capture") ?? citation.data?.capture_id ?? source.latest_capture?.capture_id;
  const selected = captures.find((capture) => capture.capture_id === captureId);
  const duplicateVersion = duplicateCaptureVersion(captures, selected);
  const previous = selected ? captures.find((capture) => capture.version === selected.version - 1) : undefined;
  const comparison = useQuery({
    queryKey: keys.sources.captureCompare(workspace, source.source_id, compareCaptureId ?? "", selected?.capture_id ?? ""),
    queryFn: async () => {
      const [earlier, later] = await Promise.all([captureQuery(workspace, source.source_id, compareCaptureId!), captureQuery(workspace, source.source_id, selected!.capture_id)]);
      return { earlier, later };
    },
    enabled: Boolean(compareCaptureId && selected && previous?.capture_id === compareCaptureId),
    retry: false,
  });
  const mismatch = Boolean(citation.data && captureId !== citation.data.capture_id);
  const captured = useQuery({ queryKey: keys.sources.capture(workspace, source.source_id, captureId ?? ""), queryFn: () => captureQuery(workspace, source.source_id, captureId!), enabled: Boolean(selected) && !source.purged_at && !mismatch && (!citationId || citation.isSuccess), retry: false });
  const observations = useInfiniteQuery({ queryKey: keys.sources.observations(workspace, source.source_id), queryFn: ({ pageParam }) => sourceObservationsQuery(workspace, source.source_id, pageParam), initialPageParam: undefined as string | undefined, getNextPageParam: (page) => page.next_cursor ?? undefined });
  const observationRows = observations.data?.pages.flatMap((page) => page.items) ?? [];
  const visibleObservationRows = filterLoadedRows(observationRows, observationFilter, (observation) => [observation.observation_id, observation.statement, observation.quote, observation.locator ?? "", observation.extraction_id ?? ""]);
  const visibleCaptures = filterLoadedRows(captures, captureFilter, (capture) => [capture.capture_id, String(capture.version), capture.media_type, capture.sha256, capture.captured_at]);
  const captureOptions = selected && !visibleCaptures.some((capture) => capture.capture_id === selected.capture_id) ? [selected, ...visibleCaptures] : visibleCaptures;
  const retentionReview = useQuery({ queryKey: keys.sources.retentionReview(workspace, source.source_id), queryFn: () => sourceRetentionReviewQuery(workspace, source.source_id), retry: false });
  const fetch = useResearchWrite(() => fetchSourceAction(workspace, source.source_id), [keys.sources.all(workspace)], (captured) => router.push(sourceHref(workspace, source.source_id, captured.capture_id, undefined, returnTo)));
  const retention = useResearchWrite(() => setSourceRetentionAction(workspace, source.source_id, { retention_until: retentionDate ? new Date(`${retentionDate}T23:59:59.000Z`).toISOString() : null }), [keys.sources.one(workspace, source.source_id), keys.sources.list(workspace), keys.sources.retentionReview(workspace, source.source_id)], (updated) => setRetentionDate(updated.source.retention_until ? updated.source.retention_until.slice(0, 10) : ""));
  const privacy = useResearchWrite(() => setSourcePrivacyAction(workspace, source.source_id, { sensitivity, legal_hold: legalHold, legal_hold_reason: legalHold ? legalHoldReason : "" }), [keys.sources.one(workspace, source.source_id), keys.sources.list(workspace), keys.sources.retentionReview(workspace, source.source_id)], (updated) => { setSensitivity(updated.source.sensitivity); setLegalHold(updated.source.legal_hold); setLegalHoldReason(updated.source.legal_hold_reason ?? ""); });
  const purge = useResearchWrite(() => purgeSourceAction(workspace, source.source_id, purgeReason), [keys.sources.one(workspace, source.source_id), keys.sources.list(workspace), keys.sources.retentionReview(workspace, source.source_id)], () => { setPurgeReason(""); setPurgeConfirmed(false); });

  return <div className={s.stack}>
    <PageHead title={source.title}>Read the retained text and follow each observation to the passage it cites.</PageHead>
    <div className={s.row}>
      <Badge tone={source.latest_capture ? "neutral" : "warn"}>{source.latest_capture ? `${captures.length} captured version${captures.length === 1 ? "" : "s"}` : "URL reference only"}</Badge>
      {duplicateVersion ? <Badge tone="warn">Identical bytes to v{duplicateVersion}</Badge> : null}
      <span className={s.muted}>Added by {authorLabel(source.created_by, shell)} · {dateLabel(source.created_at)}</span>
      {source.url ? <a href={source.url} target="_blank" rel="noopener noreferrer" className={s.inlineLink}>Open original URL ↗</a> : null}
      {mayWrite && !source.purged_at && source.origin === "reference" ? <Button type="button" size="sm" intent="ghost" loading={fetch.isPending} onClick={() => fetch.mutate()}>{fetch.isPending ? "Fetching…" : "Fetch latest capture"}</Button> : null}
      {source.filename ? <span className={s.muted}>{source.filename}</span> : null}
    </div>
    {captures.length ? <div className={s.stack}><label className={s.row}><Text as="span" size="sm">Filter retained captures</Text><Input aria-label="Filter retained captures" value={captureFilter} onChange={(event) => setCaptureFilter(event.target.value)} placeholder="Filter versions, IDs, or hashes" /></label><Text size="xs" tone="tertiary">Showing {visibleCaptures.length} of {captures.length} loaded capture{captures.length === 1 ? "" : "s"}.</Text><label className={s.row}><Text as="span" size="sm">Retained version</Text><select aria-label="Retained version" className={s.select} value={selected?.capture_id ?? ""} onChange={(event) => { setCompareCaptureId(undefined); router.push(sourceHref(workspace, source.source_id, event.target.value, undefined, returnTo)); }}>
      {!selected ? <option value="" disabled>Requested capture unavailable</option> : null}
      {captureOptions.map((capture) => <option key={capture.capture_id} value={capture.capture_id}>v{capture.version} · {dateLabel(capture.captured_at)}</option>)}
    </select></label></div> : null}
    {previous ? <div className={s.row}><Button type="button" size="sm" intent="ghost" onClick={() => setCompareCaptureId((current) => current ? undefined : previous.capture_id)}>{compareCaptureId ? "Hide version comparison" : `Compare with v${previous.version}`}</Button><span className={s.muted}>Older citations remain attached to their original capture.</span></div> : null}
    {compareCaptureId ? comparison.isPending ? <Text size="sm">Loading retained versions…</Text> : comparison.error ? <Failure error={comparison.error} /> : comparison.data ? <CaptureComparison earlier={comparison.data.earlier} later={comparison.data.later} /> : null : null}
    {citationId && citation.isPending ? <Text size="sm">Opening cited passage…</Text> : null}
    <Failure error={fetch.error} />
    {citationId && citation.error ? <Alert tone="warn" role="alert"><Text size="sm">The cited observation could not be opened. Check the link or choose an observation below.</Text><Button type="button" size="sm" intent="ghost" loading={citation.isFetching} onClick={() => void citation.refetch()}>Try again</Button></Alert> : null}
    {mayWrite ? <Panel title="Privacy and retention" note={source.purged_at ? "This source has been purged; its metadata and audit history remain." : "Retention is enforced through an explicit, dependency-aware review."}><div className={s.stack}>
      <form className={s.stack} onSubmit={(event) => { event.preventDefault(); retention.mutate(); }}><Text size="sm" tone="tertiary">Set a review date for this retained source. Clearing the date keeps it indefinitely until an explicit policy is set.</Text><Field label="Review or purge date" hint="A purge can only proceed after this date and only when no downstream citation or derived artifact depends on the source.">{(aria) => <Input {...aria} type="date" value={retentionDate} onChange={(event) => setRetentionDate(event.target.value)} disabled={Boolean(source.purged_at)} />}</Field><Failure error={retention.error} />{retention.isSuccess ? <Text size="sm" tone="accent" role="status">Retention schedule saved.</Text> : null}<Button type="submit" intent="ghost" loading={retention.isPending} disabled={Boolean(source.purged_at)}>{retentionDate ? "Save retention date" : "Keep indefinitely"}</Button></form>
      <form className={s.stack} onSubmit={(event) => { event.preventDefault(); privacy.mutate(); }}><Field label="Sensitivity" hint="This classification is recorded with the source and can guide workspace policy.">{(aria) => <select {...aria} className={s.select} value={sensitivity} onChange={(event) => setSensitivity(event.target.value as SourceSensitivity)} disabled={Boolean(source.purged_at)}><option value="public">Public</option><option value="internal">Internal</option><option value="restricted">Restricted</option></select>}</Field><label className={s.checkboxLabel}><input type="checkbox" checked={legalHold} onChange={(event) => setLegalHold(event.target.checked)} disabled={Boolean(source.purged_at)} /><span>Place this source on legal hold</span></label>{legalHold ? <Field label="Legal hold reason" hint="A hold requires a durable reason and blocks purge.">{(aria) => <Textarea {...aria} rows={3} value={legalHoldReason} onChange={(event) => setLegalHoldReason(event.target.value)} disabled={Boolean(source.purged_at)} placeholder="Preserve while the related review is active." />}</Field> : null}<Failure error={privacy.error} />{privacy.isSuccess ? <Text size="sm" tone="accent" role="status">Privacy settings saved.</Text> : null}<Button type="submit" intent="ghost" loading={privacy.isPending} disabled={Boolean(source.purged_at)}>{legalHold ? "Save privacy and hold" : "Save privacy settings"}</Button></form>
      {retentionReview.isPending ? <Text size="sm" tone="tertiary">Checking retention dependencies…</Text> : retentionReview.error ? <Failure error={retentionReview.error} /> : retentionReview.data ? <div className={s.stack}><Text size="sm">Retention state: <strong>{retentionReview.data.state}</strong>{retentionReview.data.eligible ? " · eligible for explicit purge" : " · purge blocked"}</Text>{retentionReview.data.blockers.length ? <Text size="sm" tone="tertiary">Blocking conditions: {retentionReview.data.blockers.join(", ")}.</Text> : <Text size="sm" tone="tertiary">No citations or derived artifacts currently depend on this source.</Text>}<Text size="xs" tone="tertiary">Dependencies: {retentionReview.data.dependencies.capture_count} capture(s), {retentionReview.data.dependencies.observation_count} observation(s), {retentionReview.data.dependencies.extraction_count} extraction(s), {retentionReview.data.dependencies.assistance_operation_count} assistance operation(s).</Text></div> : null}
      {!source.purged_at && retentionReview.data?.eligible ? <form className={s.stack} onSubmit={(event) => { event.preventDefault(); if (purgeConfirmed) purge.mutate(); }}><Field label="Purge audit reason" hint="This reason is retained with the purge event and cannot be blank.">{(aria) => <Textarea {...aria} rows={3} value={purgeReason} onChange={(event) => setPurgeReason(event.target.value)} placeholder="Retention expired and no downstream research record depends on this source." />}</Field><label className={s.checkboxLabel}><input type="checkbox" checked={purgeConfirmed} onChange={(event) => setPurgeConfirmed(event.target.checked)} /><span>I understand that retained bytes will no longer be readable.</span></label><Failure error={purge.error} /><Button type="submit" intent="ghost" loading={purge.isPending} disabled={!purgeReason.trim() || !purgeConfirmed}>Purge retained bytes</Button></form> : null}
    </div></Panel> : null}
    {mismatch ? <Alert tone="warn"><Text size="sm">This observation cites a different capture. <Link className={s.inlineLink} href={sourceHref(workspace, source.source_id, citation.data?.capture_id, citationId, returnTo)}>Open its cited version</Link></Text></Alert> : null}
    {captureId && !selected && (!citationId || citation.isSuccess) ? <Alert tone="warn"><Text size="sm">The requested capture is unavailable in this source. Choose a retained version above.</Text></Alert> : null}
    {!captureId && !citationId ? <Panel title="No text retained yet"><Text size="sm" tone="tertiary">Only the source reference is saved. Add captured text before recording an observation.</Text></Panel> : null}
    {source.purged_at ? <Panel title="Retained bytes unavailable"><Text size="sm" tone="tertiary">This source was purged on {dateLabel(source.purged_at)}. Capture metadata, observations, and the audit trail remain addressable, but the original bytes are no longer served.</Text></Panel> : selected && !mismatch && (!citationId || citation.isSuccess) ? <Query of={captured} label="captured material">{(capture) => isTextCapture(capture) ? <CapturedReader key={`${capture.capture_id}:${requestedObservationQuote}:${requestedObservationStart ?? ""}`} workspace={workspace} capture={capture} citation={citation.data} mayWrite={mayWrite} capturedBy={authorLabel(capture.captured_by, shell)} returnTo={returnTo} initialObservationDraft={observationDraft} searchQuery={searchQuery} searchIndex={searchIndex} onSearchChange={(query, index, extractionId) => router.replace(sourceHref(workspace, source.source_id, capture.capture_id, citationId || undefined, returnTo, query, index, extractionId, requestedObservationQuote || undefined, requestedObservationStart))} /> : <BinaryCaptureReader workspace={workspace} source={source.source_id} capture={capture} citation={citation.data} mayWrite={mayWrite} capturedBy={authorLabel(capture.captured_by, shell)} returnTo={returnTo} initialObservationDraft={observationDraft} searchQuery={searchQuery} searchIndex={searchIndex} requestedExtractionId={requestedExtractionId} onSearchChange={(query, index, extractionId) => router.replace(sourceHref(workspace, source.source_id, capture.capture_id, citationId || undefined, returnTo, query, index, extractionId, requestedObservationQuote || undefined, requestedObservationStart))} />}</Query> : null}
    <div className={s.columns}>
      <Panel title="Cited observations" note="Each statement retains its original passage and capture.">
        <Query of={observations} label="cited observations">{() => <div className={s.stack}>
          {observationRows.length ? <><Input aria-label="Filter source observations" value={observationFilter} onChange={(event) => setObservationFilter(event.target.value)} placeholder="Filter loaded observations" /><Text size="xs" tone="tertiary">Showing {visibleObservationRows.length} of {observationRows.length} loaded observation{observationRows.length === 1 ? "" : "s"}.</Text></> : null}
          {visibleObservationRows.map((observation) => <article key={observation.observation_id} className={s.observation}>
            <p className={s.body}>{observation.statement}</p><blockquote className={s.quote}>{observation.quote}</blockquote>
            <div className={s.row}><Link href={sourceHref(workspace, source.source_id, observation.capture_id, observation.observation_id, returnTo)} className={s.inlineLink}>View cited passage</Link>{mayWrite ? <Link href={recordHref(workspace, observation.observation_id, undefined, undefined, sourceHref(workspace, source.source_id, observation.capture_id, observation.observation_id, returnTo))} className={s.inlineLink}>Create research record</Link> : null}<span className={s.muted}>{authorLabel(observation.author, shell)} · {observation.extraction_id ? "Derived text" : observation.locator || "Manual observation"} · {dateLabel(observation.recorded_at)}</span></div>
          </article>)}
          {!observationRows.length ? <Text size="sm" tone="tertiary">No observations recorded from this source yet.</Text> : visibleObservationRows.length ? null : <Text size="sm" tone="tertiary">No loaded observations match. Clear the filter or load more.</Text>}
          <MoreButton available={observations.hasNextPage} pending={observations.isFetchingNextPage} load={() => void observations.fetchNextPage()} />
        </div>}</Query>
      </Panel>
      {mayWrite && !source.purged_at ? <Panel title={captures.length ? "Add another capture" : "Add captured text"}><SourceForm workspace={workspace} source={source.source_id} /></Panel> : null}
    </div>
  </div>;
}

function CaptureComparison({ earlier, later }: { earlier: Capture; later: Capture }) {
  const isText = earlier.content !== undefined && later.content !== undefined;
  const diff = earlier.content !== undefined && later.content !== undefined ? diffText(earlier.content, later.content) : undefined;
  return <Panel title={`Changes from v${earlier.version} to v${later.version}`} note="Both retained captures remain immutable.">
    <div className={s.stack}>
      <div className={s.row}><Text size="sm">Earlier: {dateLabel(earlier.captured_at)}</Text><Text size="sm">Later: {dateLabel(later.captured_at)}</Text></div>
      {!isText ? <Text size="sm" tone="tertiary">These captures are binary or otherwise not directly text-diffable. Compare their format, byte count, and hashes in the capture details.</Text> : diff?.truncated ? <Text size="sm" tone="tertiary">This text is too large for an in-browser line diff. Open each retained version to inspect it without changing either capture.</Text> : <pre className={s.diff} aria-label="Retained capture changes">{diff?.lines.map((line, index) => <DiffLine key={`${index}:${line.kind}:${line.text}`} line={line} />)}</pre>}
      <div className={s.row}><Text size="xs" tone="tertiary">Earlier SHA-256: {earlier.sha256}</Text><Text size="xs" tone="tertiary">Later SHA-256: {later.sha256}</Text></div>
    </div>
  </Panel>;
}

function DiffLine({ line }: { line: TextDiffLine }) {
  return <span className={line.kind === "added" ? s.diffAdded : line.kind === "removed" ? s.diffRemoved : s.diffSame}>{line.kind === "added" ? "+ " : line.kind === "removed" ? "− " : "  "}{line.text}{"\n"}</span>;
}

function BinaryCaptureReader({ workspace, source, capture, citation, mayWrite, capturedBy, returnTo, initialObservationDraft, searchQuery, searchIndex, requestedExtractionId, onSearchChange }: { workspace: string; source: string; capture: Capture; citation?: ManualObservation; mayWrite: boolean; capturedBy: string; returnTo: string; initialObservationDraft?: ObservationPrefill; searchQuery: string; searchIndex: number; requestedExtractionId?: string; onSearchChange: (query: string, index: number, extractionId?: string) => void }) {
  const [extractionFilter, setExtractionFilter] = useState("");
  const router = useRouter();
  const extractions = useInfiniteQuery({ queryKey: keys.sources.extractions(workspace, source, capture.capture_id), queryFn: ({ pageParam }) => captureExtractionsQuery(workspace, source, capture.capture_id, pageParam), initialPageParam: undefined as string | undefined, getNextPageParam: (page) => page.next_cursor ?? undefined });
  const extractionRows = extractions.data?.pages.flatMap((page) => page.items) ?? [];
  const latest = extractionRows[0];
  const visibleExtractions = filterLoadedRows(extractionRows, extractionFilter, (extraction) => [extraction.extraction_id, extraction.method, extraction.status, extraction.message ?? "", extraction.created_at]);
  const extractionId = citation?.extraction_id ?? requestedExtractionId ?? latest?.extraction_id;
  const extracted = useQuery({ queryKey: keys.sources.extraction(workspace, source, capture.capture_id, extractionId ?? ""), queryFn: () => captureExtractionQuery(workspace, source, capture.capture_id, extractionId!), enabled: Boolean(extractionId), retry: false });
  const extract = useResearchWrite(() => extractCaptureAction(workspace, source, capture.capture_id), [keys.sources.extractions(workspace, source, capture.capture_id)], () => void extractions.refetch());
  const isPDF = capture.media_type === "application/pdf";
  const isImage = isImageCapture(capture);
  return <Panel title="Retained binary material" note={`Capture v${capture.version} · ${capture.bytes.toLocaleString()} bytes`}>
    <div className={s.stack}>
      <Text size="sm">This {capture.media_type} capture is retained and hash-verified.</Text>
      {isPDF || isImage ? <>
        <Text size="sm" tone="tertiary">{isPDF ? "PDF text extraction" : "Image OCR"} creates a separate derived artifact linked to this exact capture.</Text>
        {mayWrite ? <Button type="button" intent="ghost" loading={extract.isPending} onClick={() => extract.mutate()}>{extract.isPending ? (isImage ? "Running OCR…" : "Extracting…") : isImage ? "Run OCR" : "Extract text"}</Button> : null}
        <Failure error={extract.error} />
        {latest || citation?.extraction_id ? <div className={s.stack}>
          <Text size="sm">{citation?.extraction_id ? "Cited extraction" : "Latest extraction"}{extracted.data ? `: ${extracted.data.status} · ${extracted.data.method}` : latest ? `: ${latest.status} · ${latest.method}` : ""}</Text>
          {extracted.data?.message || latest?.message ? <Text size="sm" tone="tertiary">{extracted.data?.message ?? latest?.message}</Text> : null}
          {extracted.data?.status === "succeeded" ? <Query of={extracted} label="derived text">{(detail) => <CapturedReader key={`${capture.capture_id}:${detail.extraction_id}:${initialObservationDraft?.quote ?? ""}:${initialObservationDraft?.quoteStart ?? ""}`} workspace={workspace} capture={{ ...capture, content: detail.text ?? "" }} citation={citation} extractionId={detail.extraction_id} mayWrite={mayWrite} capturedBy={capturedBy} returnTo={returnTo} initialObservationDraft={initialObservationDraft ? { ...initialObservationDraft, extractionId: detail.extraction_id } : undefined} derived searchQuery={searchQuery} searchIndex={searchIndex} onSearchChange={onSearchChange} />}</Query> : null}
        </div> : <Text size="sm" tone="tertiary">No extraction has been attempted for this capture.</Text>}
        {extractionRows.length ? <div className={s.details}><Text size="sm">Extraction history</Text><Input aria-label="Filter extraction history" value={extractionFilter} onChange={(event) => setExtractionFilter(event.target.value)} placeholder="Filter loaded extractions" /><Text size="xs" tone="tertiary">Showing {visibleExtractions.length} of {extractionRows.length} loaded extraction{extractionRows.length === 1 ? "" : "s"}.</Text>{visibleExtractions.length ? <div className={s.stack}>{visibleExtractions.map((extraction) => <div key={extraction.extraction_id} className={s.sourceCard}><div className={s.row}><Badge tone={extraction.status === "succeeded" ? "accent" : extraction.status === "failed" ? "crit" : "warn"}>{extraction.status}</Badge><span className={s.muted}>{extraction.method} · {dateLabel(extraction.created_at)}</span></div>{extraction.message ? <Text size="xs" tone="tertiary" className={s.body}>{extraction.message}</Text> : null}<Button type="button" size="sm" intent={extraction.extraction_id === extractionId ? "primary" : "ghost"} disabled={Boolean(citation?.extraction_id)} onClick={() => router.replace(sourceHref(workspace, source, capture.capture_id, citation?.observation_id, returnTo, searchQuery, searchIndex, extraction.extraction_id, initialObservationDraft?.quote, initialObservationDraft?.quoteStart))}>{extraction.extraction_id === extractionId ? "Selected extraction" : "Open extraction"}</Button></div>)}</div> : <Text size="sm" tone="tertiary">No loaded extractions match. Clear the filter or load more.</Text>}<MoreButton available={extractions.hasNextPage} pending={extractions.isFetchingNextPage} load={() => void extractions.fetchNextPage()} /></div> : null}
      </> : <Text size="sm" tone="tertiary">No text extraction adapter is available for this binary format.</Text>}
      <details className={s.details}>
        <summary>Capture details</summary>
        <dl className={s.metadata}>
          <dt>Captured</dt><dd>{dateLabel(capture.captured_at)}</dd>
          <dt>Captured by</dt><dd>{capturedBy}</dd>
          <dt>Format</dt><dd>{capture.media_type}</dd>
          <dt>SHA-256</dt><dd>{capture.sha256}</dd>
          <dt>Capture ID</dt><dd>{capture.capture_id}</dd>
        </dl>
      </details>
    </div>
  </Panel>;
}

function isImageCapture(capture: Capture): boolean {
  return capture.media_type === "image/png" || capture.media_type === "image/jpeg" || capture.media_type === "image/webp";
}

function nonNegativeIndex(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function optionalNonNegativeIndex(value: string | null): number | undefined {
  if (value === null) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function isTextCapture(capture: Capture): capture is TextCapture {
  return capture.content !== undefined;
}

function CapturedReader({ workspace, capture, citation, extractionId, mayWrite, capturedBy, returnTo, initialObservationDraft, derived = false, searchQuery, searchIndex, onSearchChange }: { workspace: string; capture: TextCapture; citation?: ManualObservation; extractionId?: string; mayWrite: boolean; capturedBy: string; returnTo?: string; initialObservationDraft?: ObservationPrefill; derived?: boolean; searchQuery: string; searchIndex: number; onSearchChange: (query: string, index: number, extractionId?: string) => void }) {
  const reader = useRef<HTMLPreElement>(null);
  const marker = useRef<HTMLElement>(null);
  const searchMarker = useRef<HTMLElement>(null);
  const [observationDraft, setObservationDraft] = useState<ObservationPrefill | undefined>(initialObservationDraft);
  const [observationDraftVersion, setObservationDraftVersion] = useState(0);
  const parts = useMemo(() => citation ? citedParts(capture.content, citation.quote_start, citation.quote_end, citation.quote) : null, [capture.content, citation]);
  const matches = useMemo(() => textOccurrences(capture.content, searchQuery), [capture.content, searchQuery]);
  const activeSearchIndex = matches.length ? Math.min(searchIndex, matches.length - 1) : 0;
  const activeSearchStart = matches[activeSearchIndex];
  const searchRange = activeSearchStart === undefined ? null : { start: activeSearchStart, end: activeSearchStart + Array.from(searchQuery.trim()).length };
  const citationRange = parts && citation ? { start: citation.quote_start, end: citation.quote_end } : null;
  const recordReturn = sourceHref(workspace, capture.source_id, capture.capture_id, citation?.observation_id, returnTo, searchQuery, searchIndex, extractionId, initialObservationDraft?.quote, initialObservationDraft?.quoteStart);
  useEffect(() => {
    if (activeSearchStart !== undefined) searchMarker.current?.scrollIntoView({ block: "center" });
    else if (parts) marker.current?.scrollIntoView({ block: "center" });
  }, [activeSearchStart, citation?.observation_id, parts]);
  const prepareObservation = (draft: ObservationPrefill) => {
    setObservationDraft(draft);
    setObservationDraftVersion((version) => version + 1);
    requestAnimationFrame(() => document.getElementById("record-observation")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const advanceSearch = (delta: number) => {
    if (!matches.length) return;
    onSearchChange(searchQuery, (activeSearchIndex + delta + matches.length) % matches.length, extractionId);
  };
  const derivedLabel = capture.media_type.startsWith("image/") ? "Derived OCR text" : "Derived PDF text";
  return <div className={mayWrite ? s.readerColumns : undefined}>
    <Panel title={derived ? derivedLabel : "Retained text"} note={derived ? `Extraction ${extractionId} · source capture v${capture.version}` : `Capture v${capture.version} · ${capture.bytes.toLocaleString()} bytes`}>
      <div className={s.stack}>
        {citation ? parts ? <Alert tone="info"><Text size="sm">Highlighted passage supports: {citation.statement}</Text>{mayWrite ? <Link href={recordHref(workspace, citation.observation_id, undefined, undefined, recordReturn)} className={s.inlineLink}>Create research record from this observation</Link> : null}</Alert> : <Alert tone="warn"><Text size="sm">The citation does not match this capture. Its passage cannot be highlighted.</Text></Alert> : null}
        <form className={s.row} role="search" onSubmit={(event) => { event.preventDefault(); advanceSearch(1); }}>
          <Input aria-label="Search retained text" value={searchQuery} maxLength={200} onChange={(event) => onSearchChange(event.target.value, 0, extractionId)} placeholder="Search this capture" />
          <Button type="submit" size="sm" intent="ghost" disabled={!matches.length}>Find</Button>
          <Button type="button" size="sm" intent="ghost" disabled={!matches.length} onClick={() => advanceSearch(-1)}>Previous</Button>
          <Button type="button" size="sm" intent="ghost" disabled={!matches.length} onClick={() => advanceSearch(1)}>Next</Button>
          <Text size="xs" tone="tertiary">{matches.length ? `${activeSearchIndex + 1} of ${matches.length} matches` : searchQuery.trim() ? "No matches in this capture" : "Search within this capture"}</Text>
        </form>
        <pre ref={reader} tabIndex={0} aria-label={derived ? derivedLabel : "Retained source text"} className={s.retained}>{renderCaptureText(capture.content, citationRange, searchRange, marker, searchMarker, s.searchMatch, s.searchMatchCurrent)}</pre>
        <details className={s.details}><summary>{derived ? "Provenance details" : "Capture details"}</summary><dl className={s.metadata}><dt>Captured</dt><dd>{dateLabel(capture.captured_at)}</dd><dt>Captured by</dt><dd>{capturedBy}</dd><dt>Format</dt><dd>{capture.media_type}</dd><dt>SHA-256</dt><dd>{capture.sha256}</dd><dt>Capture ID</dt><dd>{capture.capture_id}</dd>{extractionId ? <><dt>Extraction ID</dt><dd>{extractionId}</dd></> : null}</dl></details>
      </div>
    </Panel>
    {mayWrite ? <>
      <Panel id="record-observation" title="Record an observation"><ObservationForm key={observationDraftVersion} workspace={workspace} source={capture.source_id} capture={capture} extractionId={extractionId} reader={reader} prefill={observationDraft} returnTo={returnTo} /></Panel>
      <AssistancePanel workspace={workspace} source={capture.source_id} capture={capture} extractionId={extractionId} prepareObservation={prepareObservation} />
    </> : null}
  </div>;
}

function renderCaptureText(content: string, citationRange: { start: number; end: number } | null, searchRange: { start: number; end: number } | null, marker: { current: HTMLElement | null }, searchMarker: { current: HTMLElement | null }, searchClass: string, currentSearchClass: string): ReactNode {
  const points = Array.from(content);
  const boundaries = new Set([0, points.length]);
  for (const range of [citationRange, searchRange]) {
    if (range && range.start >= 0 && range.end > range.start && range.end <= points.length) {
      boundaries.add(range.start);
      boundaries.add(range.end);
    }
  }
  const ordered = [...boundaries].sort((left, right) => left - right);
  return ordered.slice(0, -1).map((start, index) => {
    const end = ordered[index + 1];
    const cited = Boolean(citationRange && start < citationRange.end && end > citationRange.start);
    const searched = Boolean(searchRange && start < searchRange.end && end > searchRange.start);
    const current = searched;
    if (!cited && !searched) return <span key={start}>{points.slice(start, end).join("")}</span>;
    return <mark key={start} className={searched ? current ? `${searchClass} ${currentSearchClass}` : searchClass : undefined} ref={(element) => {
      if (element && citationRange && start <= citationRange.start && citationRange.start < end) marker.current = element;
      if (element && searchRange && start <= searchRange.start && searchRange.start < end) searchMarker.current = element;
    }} id={cited && start <= (citationRange?.start ?? -1) && (citationRange?.start ?? -1) < end ? "cited-passage" : undefined}>{points.slice(start, end).join("")}</mark>;
  });
}

function AssistancePanel({ workspace, source, capture, extractionId, prepareObservation }: { workspace: string; source: string; capture: TextCapture; extractionId?: string; prepareObservation: (draft: ObservationPrefill) => void }) {
  const cache = useQueryClient();
  const [selectedOperation, setSelectedOperation] = useState("");
  const latestKey = keys.assistance.capture(workspace, source, capture.capture_id, extractionId ?? "");
  const historyKey = keys.assistance.history(workspace, source, capture.capture_id, extractionId ?? "");
  const latest = useQuery({ queryKey: latestKey, queryFn: () => latestAssistanceQuery(workspace, source, capture.capture_id, extractionId), retry: false });
  const history = useQuery({ queryKey: historyKey, queryFn: () => assistanceHistoryQuery(workspace, source, capture.capture_id, extractionId), retry: false });
  const latestDetail = latest.data?.operation ? { operation: latest.data.operation, proposals: latest.data.proposals } : null;
  const selectedDetail = selectedOperation ? history.data?.items.find((one) => one.operation.operation_id === selectedOperation) : undefined;
  const detail = selectedDetail ?? latestDetail;
  const generate = useResearchWrite(() => generateAssistanceAction(workspace, source, capture.capture_id, extractionId), [latestKey, historyKey], () => { setSelectedOperation(""); void latest.refetch(); void history.refetch(); });
  const replace = (updated: AssistanceProposal) => {
    cache.setQueryData<LatestAssistance>(latestKey, (current) => current?.operation ? { ...current, proposals: current.proposals.map((one) => one.proposal_id === updated.proposal_id ? updated : one) } : current);
    cache.setQueryData<{ items: import("@/lib/services/assistance").AssistanceDetail[] }>(historyKey, (current) => current ? { ...current, items: current.items.map((one) => one.operation.operation_id === updated.operation_id ? { ...one, proposals: one.proposals.map((proposal) => proposal.proposal_id === updated.proposal_id ? updated : proposal) } : one) } : current);
  };
  const derivedLabel = capture.media_type.startsWith("image/") ? "derived OCR text" : "derived PDF text";
  return <Panel title="Assisted candidate passages" note={extractionId ? `One ${derivedLabel} · review required` : "One retained capture · review required"}>
    <div className={s.stack}>
      <Text size="sm" tone="tertiary">Generate exact passage candidates from this {extractionId ? derivedLabel : "capture"}. The local sentence pass does not make claims or record observations for you.</Text>
      <Button type="button" intent="ghost" loading={generate.isPending} onClick={() => generate.mutate()}>Generate candidates</Button>
      <Failure error={latest.error ?? generate.error} />
      {latest.isPending ? <Text size="sm" tone="tertiary">Loading saved assistance…</Text> : null}
      {history.error ? <Failure error={history.error} /> : null}
      {history.data?.items.length ? <label className={s.row}><Text as="span" size="sm">Saved run</Text><select aria-label="Saved assistance run" className={s.select} value={selectedOperation || detail?.operation.operation_id || ""} onChange={(event) => setSelectedOperation(event.target.value)}>{history.data.items.map((one) => <option key={one.operation.operation_id} value={one.operation.operation_id}>{dateLabel(one.operation.created_at)} · {one.proposals.length} candidate{one.proposals.length === 1 ? "" : "s"}{one.operation.operation_id === latestDetail?.operation.operation_id ? " · latest" : ""}</option>)}</select></label> : null}
      {detail ? <>
        <div className={s.assistanceMeta}><Badge tone="neutral">{detail.operation.provider} · {detail.operation.method}</Badge><span className={s.muted}>{detail.proposals.length} candidate{detail.proposals.length === 1 ? "" : "s"}</span></div>
        {detail.proposals.length ? <div className={s.proposalList}>{detail.proposals.map((proposal) => <ProposalCard key={proposal.proposal_id} workspace={workspace} operation={detail.operation.operation_id} proposal={proposal} capture={capture} replace={replace} prepareObservation={prepareObservation} />)}</div> : <Text size="sm" tone="tertiary">No sentence-sized passages were found in this {extractionId ? "derived artifact" : "capture"}.</Text>}
      </> : null}
    </div>
  </Panel>;
}

function ProposalCard({ workspace, operation, proposal, capture, replace, prepareObservation }: { workspace: string; operation: string; proposal: AssistanceProposal; capture: TextCapture; replace: (proposal: AssistanceProposal) => void; prepareObservation: (draft: ObservationPrefill) => void }) {
  const [statement, setStatement] = useState(proposal.generated_statement);
  const [quote, setQuote] = useState(proposal.generated_quote);
  const review = useResearchWrite(() => {
    const start = quote === proposal.generated_quote ? proposal.generated_quote_start : quoteOccurrences(capture.content, quote)[0];
    return reviewAssistanceProposalAction(workspace, operation, proposal.proposal_id, { decision: "accept", statement, quote, ...(start === undefined ? {} : { quote_start: start }) });
  }, [keys.assistance.one(workspace, operation)], replace);
  const reject = useResearchWrite(() => reviewAssistanceProposalAction(workspace, operation, proposal.proposal_id, { decision: "reject" }), [keys.assistance.one(workspace, operation)], replace);
  return <article className={s.proposalCard}>
    <div className={s.assistanceMeta}><Badge tone={proposal.state === "proposed" ? "warn" : proposal.state === "accepted" ? "accent" : "neutral"}>{proposal.state}</Badge><span className={s.muted}>Generated passage · rune {proposal.generated_quote_start}–{proposal.generated_quote_end}</span></div>
    <blockquote className={s.quote}>{proposal.generated_quote}</blockquote>
    {proposal.candidate_name ? <div className={s.details}><Badge tone="warn">Candidate record: {proposal.candidate_kind ?? "untyped"} · {proposal.candidate_name}</Badge>{proposal.candidate_description ? <Text size="xs" tone="tertiary">{proposal.candidate_description}</Text> : null}{proposal.relationship_kind && proposal.related_candidate_name ? <><Badge tone="warn">Suggested relationship: {proposal.relationship_kind} → {proposal.related_candidate_kind ?? "untyped"} · {proposal.related_candidate_name}</Badge>{proposal.relationship_description ? <Text size="xs" tone="tertiary">{proposal.relationship_description}</Text> : null}<Text size="xs" tone="tertiary">This relationship is a model suggestion, not an accepted connection. Create or select both research records and review it manually.</Text></> : null}<Text size="xs" tone="tertiary">This is a model suggestion, not an identity claim. Review it after recording the observation.</Text></div> : null}
    {proposal.state === "proposed" ? <form className={s.stack} onSubmit={(event) => { event.preventDefault(); review.mutate(); }}>
      <Field label="Proposed statement" hint="Edit the wording before accepting it. This remains a reviewable proposal.">{(aria) => <Textarea {...aria} rows={3} value={statement} onChange={(event) => setStatement(event.target.value)} />}</Field>
      <Field label="Exact passage" hint="If edited, it must still match this retained capture exactly.">{(aria) => <Textarea {...aria} rows={3} value={quote} onChange={(event) => setQuote(event.target.value)} />}</Field>
      <Failure error={review.error ?? reject.error} />
      <div className={s.row}><Button type="submit" intent="primary" loading={review.isPending}>Accept proposal</Button><Button type="button" intent="ghost" loading={reject.isPending} onClick={() => reject.mutate()}>Reject</Button></div>
    </form> : <div className={s.stack}><Text size="sm">{proposal.reviewed_statement || proposal.generated_statement}</Text>{proposal.reviewed_quote ? <blockquote className={s.quote}>{proposal.reviewed_quote}</blockquote> : null}<Text size="xs" tone="tertiary">{proposal.state === "accepted" ? "Accepted as assistance output; review the fields before recording it as evidence." : "Rejected; generated output is retained for provenance."}</Text>{proposal.state === "accepted" ? <Button type="button" intent="ghost" onClick={() => prepareObservation({ statement: proposal.reviewed_statement || proposal.generated_statement, quote: proposal.reviewed_quote || proposal.generated_quote, quoteStart: proposal.reviewed_quote_start ?? proposal.generated_quote_start, extractionId: proposal.extraction_id, ...(proposal.candidate_name && proposal.candidate_kind ? { candidate: { kind: proposal.candidate_kind, name: proposal.candidate_name, ...(proposal.candidate_description ? { description: proposal.candidate_description } : {}) } } : {}), ...(proposal.relationship_kind && proposal.related_candidate_kind && proposal.related_candidate_name ? { relationship: { kind: proposal.relationship_kind as ResearchConnectionKind, related: { kind: proposal.related_candidate_kind, name: proposal.related_candidate_name, ...(proposal.relationship_description ? { description: proposal.relationship_description } : {}) }, ...(proposal.relationship_description ? { description: proposal.relationship_description } : {}) } } : {}) })}>Prepare observation{proposal.relationship_kind ? " and review record pair" : proposal.candidate_name ? " and review candidate" : ""}</Button> : null}</div>}
  </article>;
}
