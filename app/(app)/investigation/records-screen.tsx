"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Badge, Panel } from "@/components/display";
import { Button, Field, Input, Textarea } from "@/components/forms";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import type { Evidence } from "@/lib/services/review";
import type { PlacePrecision, ResearchRecord, ResearchRecordCitationFilter, ResearchRecordKind, ResearchRecordNeighborhood, ResearchRecordResolutionFilter, WriteResearchRecord } from "@/lib/services/research-records";
import type { RecordCandidatePrefill, RelationshipPrefill } from "@/lib/services/research-records/navigation";
import type { ResearchConnectionKind } from "@/lib/services/research-connections";
import { connectionHref } from "@/lib/services/research-connections/navigation";
import type { ResearchResolution, ResearchResolutionImpact } from "@/lib/services/research-resolutions";
import type { ResearchResolutionSet, ProposeResearchResolutionSet } from "@/lib/services/research-resolution-sets";
import { eventHref } from "@/lib/services/events/navigation";
import { mayWriteResearch } from "../_route-context";
import { PageHead } from "../_components/page-head";
import { Query, useContext } from "../_hooks";
import { evidenceByIDsQuery, evidenceQuery, researchRecordNeighborhoodQuery, researchRecordQuery, researchRecordsByIDsQuery, researchRecordsQuery, researchRecordSummaryQuery, researchResolutionImpactQuery, researchResolutionSetImpactQuery, researchResolutionSetsQuery, researchResolutionsQuery } from "../_queries";
import { createResearchRecordAction, createResearchResolutionAction, createResearchResolutionSetAction, reverseResearchResolutionAction, reverseResearchResolutionSetAction, reviewResearchResolutionAction, reviewResearchResolutionSetAction, updateResearchRecordAction } from "./_actions";
import { authorLabel, dateLabel, Failure, investigationPath, MoreButton, ObservationPicker as CitationPicker, RecordPicker, recordHref, sourceHref, useResearchWrite, WorkingNoteLink } from "./_shared";
import s from "./investigation.module.css";

const kindLabels: Record<ResearchRecordKind, string> = {
  person: "Person",
  account: "Account",
  organisation: "Organisation",
  place: "Place",
};

function candidateKind(raw: string | null): ResearchRecordKind | undefined {
  return raw && raw in kindLabels ? raw as ResearchRecordKind : undefined;
}

function citationFilter(raw: string | null): ResearchRecordCitationFilter {
  return raw === "cited" || raw === "uncited" ? raw : "";
}

function resolutionFilter(raw: string | null): ResearchRecordResolutionFilter {
  return raw === "open" || raw === "accepted" || raw === "none" ? raw : "";
}

function neighborhoodDepth(raw: string | null): 1 | 2 {
  return raw === "2" ? 2 : 1;
}

const connectionKindLabels: Record<ResearchConnectionKind, string> = {
  associated_with: "Associated with",
  may_belong_to: "May belong to",
  mentions: "Mentions",
  concerns_same_event: "May concern the same event",
  located_at: "Located at",
  possible_same_subject: "Possible same subject",
};

function connectionKind(raw: string | null): ResearchConnectionKind | undefined {
  return raw && raw in connectionKindLabels ? raw as ResearchConnectionKind : undefined;
}

type RecordDraft = { observationIds: string[]; candidateKind?: ResearchRecordKind; candidateName: string; candidateDescription: string };
type Promotion = { observationIds: string[]; primary: RecordCandidatePrefill; related: RecordCandidatePrefill; relationship: RelationshipPrefill; fromRecordId?: string };

function blankDraft(): RecordDraft {
  return { observationIds: [], candidateKind: undefined, candidateName: "", candidateDescription: "" };
}

function promotionFrom(params: { get: (name: string) => string | null; getAll: (name: string) => string[] }): Promotion | undefined {
  const primaryKind = candidateKind(params.get("candidate_kind"));
  const primaryName = params.get("candidate_name")?.trim() ?? "";
  const relatedKind = candidateKind(params.get("related_kind"));
  const relatedName = params.get("related_name")?.trim() ?? "";
  const kind = connectionKind(params.get("relationship_kind"));
  if (!primaryKind || !primaryName || !relatedKind || !relatedName || !kind) return undefined;
  const relatedDescription = params.get("related_description")?.trim() ?? "";
  const relationshipDescription = params.get("relationship_description")?.trim() ?? "";
  return {
    observationIds: params.getAll("observation"),
    primary: { kind: primaryKind, name: primaryName, ...(params.get("candidate_description") ? { description: params.get("candidate_description")!.trim() } : {}) },
    related: { kind: relatedKind, name: relatedName, ...(relatedDescription ? { description: relatedDescription } : {}) },
    relationship: { kind, related: { kind: relatedKind, name: relatedName, ...(relatedDescription ? { description: relatedDescription } : {}) }, ...(relationshipDescription ? { description: relationshipDescription } : {}) },
  };
}

function draftFor(candidate: RecordCandidatePrefill, observationIds: string[]): RecordDraft {
  return { observationIds, candidateKind: candidate.kind, candidateName: candidate.name, candidateDescription: candidate.description ?? "" };
}

export function RecordsScreen({ workspace }: { workspace: string }) {
  const { shell } = useContext();
  const searchParams = useSearchParams();
  const router = useRouter();
  const mayWrite = mayWriteResearch(shell?.context?.workspace);
  const requestedReturn = searchParams.get("return") ?? "";
  const returnTo = requestedReturn.startsWith(`/investigation/${encodeURIComponent(workspace)}/`) ? requestedReturn : "";
  const depth = neighborhoodDepth(searchParams.get("depth"));
  const initialPromotion = promotionFrom(searchParams);
  const initialObservationIds = searchParams.getAll("observation");
  const recordQuery = searchParams.get("q")?.trim().slice(0, 200) ?? "";
  const recordKind = candidateKind(searchParams.get("kind")) ?? "";
  const recordCitation = citationFilter(searchParams.get("citation"));
  const recordResolution = resolutionFilter(searchParams.get("resolution"));
  const recordSummary = useQuery({
    queryKey: keys.records.summary(workspace),
    queryFn: () => researchRecordSummaryQuery(workspace),
    retry: false,
  });
  const records = useInfiniteQuery({
    queryKey: keys.records.list(workspace, recordQuery, recordKind, recordCitation, recordResolution),
    queryFn: ({ pageParam }) => researchRecordsQuery(workspace, pageParam, recordQuery, recordKind || undefined, recordCitation, recordResolution),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });
  const evidence = useInfiniteQuery({
    queryKey: keys.evidence.list(workspace),
    queryFn: ({ pageParam }) => evidenceQuery(workspace, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });
  const resolutions = useInfiniteQuery({
    queryKey: keys.resolutions.list(workspace),
    queryFn: ({ pageParam }) => researchResolutionsQuery(workspace, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });
  const resolutionSets = useInfiniteQuery({
    queryKey: keys.resolutionSets.list(workspace),
    queryFn: ({ pageParam }) => researchResolutionSetsQuery(workspace, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });
  const rows = records.data?.pages.flatMap((page) => page.items) ?? [];
  const resolutionRows = resolutions.data?.pages.flatMap((page) => page.items) ?? [];
  const resolutionSetRows = resolutionSets.data?.pages.flatMap((page) => page.items) ?? [];
  const visibleRows = rows;
  const [activeId, setActiveId] = useState<string | null>(() => searchParams.get("record"));
  const [promotion, setPromotion] = useState<Promotion | undefined>(initialPromotion);
  const [draft, setDraft] = useState<RecordDraft>(() => initialPromotion ? draftFor(initialPromotion.primary, initialPromotion.observationIds) : { observationIds: initialObservationIds, candidateKind: candidateKind(searchParams.get("candidate_kind")), candidateName: searchParams.get("candidate_name") ?? "", candidateDescription: searchParams.get("candidate_description") ?? "" });
  const targetedRecord = useQuery({
    queryKey: keys.records.one(workspace, activeId ?? ""),
    queryFn: () => researchRecordQuery(workspace, activeId!),
    enabled: Boolean(activeId) && !rows.some((record) => record.record_id === activeId),
    retry: false,
  });
  const active = rows.find((record) => record.record_id === activeId) ?? targetedRecord.data;
  const targetedRecordLoading = Boolean(activeId && !active && targetedRecord.isPending);
  const neighborhood = useQuery({
    queryKey: keys.records.neighborhood(workspace, activeId ?? "", depth),
    queryFn: () => researchRecordNeighborhoodQuery(workspace, activeId!, depth),
    enabled: Boolean(activeId),
    retry: false,
  });
  const targetedObservationIds = [...new Set([...initialObservationIds, ...(active?.observation_ids ?? [])])];
  const candidateEvidence = useQuery({
    queryKey: keys.evidence.recordEvidence(workspace, targetedObservationIds),
    queryFn: () => evidenceByIDsQuery(workspace, targetedObservationIds),
    enabled: targetedObservationIds.length > 0,
  });
  const evidenceRows = mergeEvidence(evidence.data?.pages.flatMap((page) => page.items) ?? [], candidateEvidence.data ?? []);
  const evidenceError = evidence.isError ? evidence.error : candidateEvidence.isError ? candidateEvidence.error : null;
  const setRecordFilter = (name: "q" | "kind" | "citation" | "resolution", value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    const cleaned = name === "q" ? value.slice(0, 200) : value;
    if (cleaned.trim()) next.set(name, cleaned); else next.delete(name);
    next.delete("before");
    const path = investigationPath(workspace, "records");
    router.replace(`${path}${next.size ? `?${next}` : ""}`);
  };
  const setNeighborhoodDepth = (value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value === "2") next.set("depth", "2"); else next.delete("depth");
    const path = investigationPath(workspace, "records");
    router.replace(`${path}${next.size ? `?${next}` : ""}`);
  };
  const resetDraft = () => { setPromotion(undefined); setActiveId(null); setDraft(blankDraft()); };
  const saved = (record: ResearchRecord) => {
    if (promotion && !promotion.fromRecordId) {
      setPromotion({ ...promotion, fromRecordId: record.record_id });
      setActiveId(null);
      setDraft(draftFor(promotion.related, promotion.observationIds));
      return;
    }
    if (promotion?.fromRecordId) {
      router.push(connectionHref(workspace, { fromRecordId: promotion.fromRecordId, toRecordId: record.record_id, kind: promotion.relationship.kind, rationale: promotion.relationship.description || `Review the proposed ${connectionKindLabels[promotion.relationship.kind].toLowerCase()} relationship between these records.`, supportingObservationIds: promotion.observationIds, ...(returnTo ? { returnTo } : {}) }));
      return;
    }
    if (returnTo) {
      router.push(returnTo);
      return;
    }
    setDraft(blankDraft());
    setActiveId(record.record_id);
  };

  return <>
    <PageHead title="Research records" actions={<div className={s.row}>{returnTo ? <Link href={returnTo} className={s.back}>Back to handoff</Link> : null}{mayWrite ? <Button type="button" intent="primary" onClick={resetDraft}>New record</Button> : null}</div>}>
      Author people, accounts, organisations, and places as investigation records. A record is a researcher&apos;s working description with citations; it does not resolve identity automatically.
    </PageHead>
    <Panel title="Record coverage" note="Workspace-wide counts across the authored record set, independent of the current search.">
      <Query of={recordSummary} label="record coverage">{(summary) => <div className={s.stack}>
        <div className={s.row}><Badge tone="neutral">{summary.record_count} record{summary.record_count === 1 ? "" : "s"}</Badge>{(Object.keys(kindLabels) as ResearchRecordKind[]).map((kind) => <Badge key={kind} tone="neutral">{kindLabels[kind]} {summary.kind_counts[kind] ?? 0}</Badge>)}<Badge tone={summary.uncited_record_count ? "warn" : "accent"}>{summary.uncited_record_count} without citations</Badge><Badge tone={summary.open_resolution_record_count ? "warn" : "neutral"}>{summary.open_resolution_record_count} in open resolution review</Badge></div>
        <Text size="xs" tone="tertiary">{summary.citation_count} citation link{summary.citation_count === 1 ? "" : "s"} across {summary.cited_record_count} cited record{summary.cited_record_count === 1 ? "" : "s"}. {summary.accepted_resolution_record_count} record{summary.accepted_resolution_record_count === 1 ? "" : "s"} involved in accepted resolution{summary.accepted_resolution_record_count === 1 ? "" : "s"}.</Text>
      </div>}</Query>
    </Panel>
    <div className={s.columns}>
      <Panel title="Records" note={rows.length ? `${rows.length} loaded${recordQuery || recordKind || recordCitation || recordResolution ? " matching" : ""}` : undefined}>
        <Query of={records} label="research records">{() => <div className={s.stack}>
          <div className={s.row}>
            <Input aria-label="Search research records" maxLength={200} value={recordQuery} onChange={(event) => setRecordFilter("q", event.target.value)} placeholder="Search records and cited observations" />
            <label className={s.row}><Text as="span" size="sm">Type</Text><select aria-label="Filter research records by type" className={s.select} value={recordKind} onChange={(event) => setRecordFilter("kind", event.target.value)}><option value="">All types</option>{(Object.keys(kindLabels) as ResearchRecordKind[]).map((kind) => <option key={kind} value={kind}>{kindLabels[kind]}</option>)}</select></label>
            <label className={s.row}><Text as="span" size="sm">Citations</Text><select aria-label="Filter research records by citation coverage" className={s.select} value={recordCitation} onChange={(event) => setRecordFilter("citation", event.target.value)}><option value="">All citation states</option><option value="cited">Cited</option><option value="uncited">Uncited</option></select></label>
            <label className={s.row}><Text as="span" size="sm">Resolution</Text><select aria-label="Filter research records by resolution review" className={s.select} value={recordResolution} onChange={(event) => setRecordFilter("resolution", event.target.value)}><option value="">All review states</option><option value="open">Needs review</option><option value="accepted">Accepted</option><option value="none">No active resolution</option></select></label>
          </div>
          {!rows.length ? (
            <div className={s.empty}>
              <Text size="sm">{recordQuery || recordKind || recordCitation || recordResolution ? "No research records match these filters." : "No research records yet."}</Text>
              <Text size="sm" tone="tertiary">{recordQuery || recordKind || recordCitation || recordResolution ? "Try different filters or clear the browse facets." : "Create a qualified working record when the investigation needs to refer to a person, account, organisation, or place across several citations."}</Text>
              {!recordQuery && !recordKind && !recordCitation && !recordResolution && mayWrite ? <Button type="button" intent="primary" onClick={resetDraft}>Create a record</Button> : null}
            </div>
          ) : <div className={s.stack}><Text size="xs" tone="tertiary">Showing {visibleRows.length} matching record{visibleRows.length === 1 ? "" : "s"} across the loaded pages.</Text><div className={s.eventList}>{visibleRows.map((record) => <RecordCard key={record.record_id} record={record} active={record.record_id === activeId} evidence={evidenceRows} workspace={workspace} shell={shell} select={() => { setActiveId(record.record_id); setDraft({ observationIds: [], candidateKind: undefined, candidateName: "", candidateDescription: "" }); }} />)}</div></div>}
          <MoreButton available={records.hasNextPage} pending={records.isFetchingNextPage} load={() => void records.fetchNextPage()} />
        </div>}</Query>
      </Panel>
      <Panel title={promotion ? promotion.fromRecordId ? "Review related record" : "Review proposed record pair" : active ? "Review record" : targetedRecordLoading ? "Loading record" : activeId ? "Selected record" : "Create a record"}>
        {targetedRecordLoading ? <Text size="sm" tone="tertiary">Opening the selected record…</Text> : targetedRecord.error && !active ? <Failure error={targetedRecord.error} /> : <RecordEditor key={active?.record_id ?? `new:${draft.observationIds.join(",")}:${draft.candidateKind ?? ""}:${draft.candidateName}:${promotion?.fromRecordId ?? ""}`} workspace={workspace} record={active} initialObservationIds={draft.observationIds} initialCandidate={draft.candidateKind && draft.candidateName ? { kind: draft.candidateKind, name: draft.candidateName, ...(draft.candidateDescription ? { description: draft.candidateDescription } : {}) } : undefined} promotion={promotion} evidence={evidenceRows} evidenceError={evidenceError} evidenceHasNext={evidence.hasNextPage} evidenceFetchingNext={evidence.isFetchingNextPage} fetchMoreEvidence={() => void evidence.fetchNextPage()} mayWrite={mayWrite} shell={shell} saved={saved} />}
      </Panel>
    </div>
    {activeId ? <Panel title="Record neighborhood" note="A bounded view of the selected record, its authored relationships, linked timeline events, and cited provenance." actions={<label className={s.row}><Text as="span" size="sm">Depth</Text><select aria-label="Neighborhood depth" className={s.select} value={depth} onChange={(event) => setNeighborhoodDepth(event.target.value)}><option value="1">Direct links</option><option value="2">Two hops</option></select></label>}>
      <Query of={neighborhood} label="record neighborhood">{(data) => <RecordNeighborhood workspace={workspace} neighborhood={data} />}</Query>
    </Panel> : null}
    <IdentityResolutionPanel workspace={workspace} records={rows} recordsHasNext={records.hasNextPage} recordsFetchingNext={records.isFetchingNextPage} fetchMoreRecords={() => void records.fetchNextPage()} resolutions={resolutionRows} resolutionsError={resolutions.isError ? resolutions.error : null} mayWrite={mayWrite} shell={shell} more={resolutions.hasNextPage} morePending={resolutions.isFetchingNextPage} loadMore={() => void resolutions.fetchNextPage()} />
    <IdentityResolutionSetPanel workspace={workspace} records={rows} recordsHasNext={records.hasNextPage} recordsFetchingNext={records.isFetchingNextPage} fetchMoreRecords={() => void records.fetchNextPage()} resolutions={resolutionRows} resolutionSets={resolutionSetRows} resolutionSetsError={resolutionSets.isError ? resolutionSets.error : null} mayWrite={mayWrite} shell={shell} more={resolutionSets.hasNextPage} morePending={resolutionSets.isFetchingNextPage} loadMore={() => void resolutionSets.fetchNextPage()} />
  </>;
}

function RecordNeighborhood({ workspace, neighborhood }: { workspace: string; neighborhood: ResearchRecordNeighborhood }) {
  const recordPath = (record: string) => `${investigationPath(workspace, "records")}?record=${encodeURIComponent(record)}`;
  const connectionPath = (connection: string) => `${investigationPath(workspace, "connections")}?connection=${encodeURIComponent(connection)}`;
  return <div className={s.stack}>
    <div className={s.row}>
      <Badge tone={neighborhood.meta.truncated ? "warn" : "neutral"}>{neighborhood.meta.depth}-hop view{neighborhood.meta.truncated ? " · truncated" : ""}</Badge>
      <Badge tone="accent">{neighborhood.records.length} related record{neighborhood.records.length === 1 ? "" : "s"}</Badge>
      <Badge tone={neighborhood.connections.length ? "warn" : "neutral"}>{neighborhood.connections.length} connection{neighborhood.connections.length === 1 ? "" : "s"}</Badge>
      <Badge tone="neutral">{neighborhood.events.length} timeline event{neighborhood.events.length === 1 ? "" : "s"}</Badge>
      <Badge tone={neighborhood.citations.length ? "accent" : "warn"}>{neighborhood.citations.length} citation{neighborhood.citations.length === 1 ? "" : "s"}</Badge>
    </div>
    <div className={s.columns}>
      <div className={s.stack}>
        <Text size="sm">Related records</Text>
        {neighborhood.records.length ? neighborhood.records.map((record) => <div className={s.eventMeta} key={record.record_id}><Link className={s.inlineLink} href={recordPath(record.record_id)}>{record.name}</Link><Text size="xs" tone="tertiary">{record.kind}{record.description ? ` · ${record.description}` : ""}</Text></div>) : <Text size="sm" tone="tertiary">No authored records are connected yet.</Text>}
      </div>
      <div className={s.stack}>
        <Text size="sm">Relationships and events</Text>
        {neighborhood.connections.map((connection) => <div className={s.eventMeta} key={connection.connection_id}><Link className={s.inlineLink} href={connectionPath(connection.connection_id)}>{connection.kind.replaceAll("_", " ")}</Link><Text size="xs" tone="tertiary">{connection.state} · {connection.rationale}</Text></div>)}
        {neighborhood.events.map((event) => <div className={s.eventMeta} key={event.event_id}><Link className={s.inlineLink} href={eventHref(workspace, event.event_id)}>{event.title}</Link><Text size="xs" tone="tertiary">{event.sort_date ?? event.reported_time ?? "Undated"}{event.location ? ` · ${event.location}` : ""}</Text></div>)}
        {!neighborhood.connections.length && !neighborhood.events.length ? <Text size="sm" tone="tertiary">No relationships or timeline events are linked yet.</Text> : null}
      </div>
    </div>
    <div className={s.stack}>
      <Text size="sm">Citations and provenance</Text>
      {neighborhood.citations.length ? neighborhood.citations.map((citation) => <div className={s.eventMeta} key={citation.observation_id}><Link className={s.inlineLink} href={sourceHref(workspace, citation.source_id, citation.capture_id, citation.observation_id)}>{citation.source_title}</Link><Text size="xs" tone="tertiary">{citation.locator ? `${citation.locator} · ` : ""}{citation.statement || citation.quote}</Text></div>) : <Text size="sm" tone="tertiary">No visible citations are attached to this neighborhood.</Text>}
    </div>
  </div>;
}

function mergeEvidence(primary: Evidence[], additional: Evidence[]) {
  const byID = new Map(primary.map((row) => [row.observation_id, row]));
  for (const row of additional) if (!byID.has(row.observation_id)) byID.set(row.observation_id, row);
  return [...byID.values()];
}

function IdentityResolutionPanel({ workspace, records, recordsHasNext, recordsFetchingNext, fetchMoreRecords, resolutions, resolutionsError, mayWrite, shell, more, morePending, loadMore }: { workspace: string; records: ResearchRecord[]; recordsHasNext: boolean; recordsFetchingNext: boolean; fetchMoreRecords: () => void; resolutions: ResearchResolution[]; resolutionsError: Error | null; mayWrite: boolean; shell?: ReturnType<typeof useContext>["shell"]; more: boolean; morePending: boolean; loadMore: () => void }) {
  const [aliasRecordId, setAliasRecordId] = useState("");
  const [canonicalRecordId, setCanonicalRecordId] = useState("");
  const [rationale, setRationale] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = resolutions.find((one) => one.resolution_id === selectedId);
  const selectedRecordIDs = selected ? [selected.alias_record_id, selected.canonical_record_id] : [];
  const hydratedSelectedRecords = useQuery({
    queryKey: keys.records.byIDs(workspace, selectedRecordIDs),
    queryFn: () => researchRecordsByIDsQuery(workspace, selectedRecordIDs),
    enabled: selectedRecordIDs.length > 0,
    retry: false,
  });
  const selectedImpact = useQuery({
    queryKey: keys.resolutions.impact(workspace, selectedId ?? ""),
    queryFn: () => researchResolutionImpactQuery(workspace, selectedId!),
    enabled: Boolean(selectedId),
    retry: false,
  });
  const recordsByID = new Map([...records, ...(hydratedSelectedRecords.data ?? [])].map((record) => [record.record_id, record]));
  const draftAlias = recordsByID.get(aliasRecordId);
  const draftCanonical = recordsByID.get(canonicalRecordId);
  const selectedAlias = selected ? recordsByID.get(selected.alias_record_id) : undefined;
  const selectedCanonical = selected ? recordsByID.get(selected.canonical_record_id) : undefined;
  const previewAlias = selected ? selectedAlias : draftAlias;
  const previewCanonical = selected ? selectedCanonical : draftCanonical;
  const previewObservationIDs = [...new Set([...(previewAlias?.observation_ids ?? []), ...(previewCanonical?.observation_ids ?? [])])];
  const previewEvidence = useQuery({
    queryKey: keys.evidence.recordEvidence(workspace, previewObservationIDs),
    queryFn: () => evidenceByIDsQuery(workspace, previewObservationIDs),
    enabled: previewObservationIDs.length > 0,
    retry: false,
  });
  const resolvedAliases = new Set(resolutions.filter((one) => one.state === "proposed" || one.state === "accepted").map((one) => one.alias_record_id));
  const aliases = records.filter((one) => !resolvedAliases.has(one.record_id));
  const canonicalRecords = records.filter((record) => record.record_id !== aliasRecordId && !resolvedAliases.has(record.record_id));
  const propose = useResearchWrite(() => createResearchResolutionAction(workspace, aliasRecordId, { canonical_record_id: canonicalRecordId, rationale }), [keys.resolutions.all(workspace)], (resolution) => { setSelectedId(resolution.resolution_id); setRationale(""); });
  const review = useResearchWrite(() => reviewResearchResolutionAction(workspace, selected!.resolution_id, "accept"), [keys.resolutions.all(workspace), keys.records.all(workspace)], () => undefined);
  const reject = useResearchWrite(() => reviewResearchResolutionAction(workspace, selected!.resolution_id, "reject"), [keys.resolutions.all(workspace)], () => undefined);
  const reverse = useResearchWrite(() => reverseResearchResolutionAction(workspace, selected!.resolution_id), [keys.resolutions.all(workspace), keys.records.all(workspace)], () => undefined);
  const recordName = (id: string) => recordsByID.get(id)?.name ?? id;
  return <Panel title="Identity resolution" note="Human-confirmed alias links only; records and connection endpoint IDs remain preserved.">
    <div className={s.stack}>
      <Text size="sm" tone="tertiary">Use this when the evidence supports treating one authored record as an alias of another. A proposal changes nothing until it is explicitly accepted.</Text>
      {mayWrite && aliases.length > 1 ? <form className={s.eventEditor} aria-label="Propose a record resolution" onSubmit={(event) => { event.preventDefault(); propose.mutate(); }}>
        <RecordPicker label="Record to resolve" value={aliasRecordId} records={aliases} onChange={setAliasRecordId} hasNext={recordsHasNext} fetchingNext={recordsFetchingNext} fetchMore={fetchMoreRecords} />
        <RecordPicker label="Canonical record to keep" value={canonicalRecordId} records={canonicalRecords} onChange={setCanonicalRecordId} hasNext={recordsHasNext} fetchingNext={recordsFetchingNext} fetchMore={fetchMoreRecords} />
        {draftAlias && draftCanonical ? <ResolutionPreview workspace={workspace} alias={draftAlias} canonical={draftCanonical} evidence={previewEvidence.data ?? []} evidenceError={previewEvidence.isError ? previewEvidence.error : null} /> : null}
        <Field label="Why should these records resolve?" hint="State the human-reviewed basis and remaining limits." required>{(aria) => <Textarea {...aria} rows={3} value={rationale} onChange={(event) => setRationale(event.target.value)} placeholder="The two records use the same handle and are supported by independent observations." />}</Field>
        <Failure error={propose.error} />
        <Button type="submit" intent="primary" disabled={!aliasRecordId || !canonicalRecordId || !rationale.trim()} loading={propose.isPending}>Create review proposal</Button>
      </form> : mayWrite ? <Text size="sm" tone="tertiary">Create at least two unresolved research records before proposing a resolution.</Text> : null}
      {resolutionsError ? <Failure error={resolutionsError} /> : null}
      {selected ? hydratedSelectedRecords.isError ? <Failure error={hydratedSelectedRecords.error} /> : selectedAlias && selectedCanonical ? <ResolutionReview resolution={selected} workspace={workspace} alias={selectedAlias} canonical={selectedCanonical} evidence={previewEvidence.data ?? []} evidenceError={previewEvidence.isError ? previewEvidence.error : null} impact={selectedImpact.data} impactLoading={selectedImpact.isPending} impactError={selectedImpact.isError ? selectedImpact.error : null} mayWrite={mayWrite} review={review} reject={reject} reverse={reverse} /> : <Text size="sm" tone="tertiary">Loading the records in this proposal…</Text> : null}
      {resolutions.length ? <div className={s.eventList}>{resolutions.map((resolution) => <button type="button" key={resolution.resolution_id} className={resolution.resolution_id === selectedId ? `${s.eventCardSelect} ${s.eventCardActive}` : s.eventCardSelect} onClick={() => setSelectedId(resolution.resolution_id)}><span className={s.eventMeta}><Badge tone={resolution.state === "accepted" ? "accent" : resolution.state === "rejected" ? "neutral" : "warn"}>{resolution.state}</Badge><span className={s.muted}>{dateLabel(resolution.proposed_at)} · {resolution.proposed_by === shell?.me.account_id ? "You" : resolution.proposed_by}</span></span><strong className={s.eventTitle}>{recordName(resolution.alias_record_id)} <span className={s.muted}>→</span> {recordName(resolution.canonical_record_id)}</strong><span className={s.body}>{resolution.rationale}</span></button>)}</div> : <Text size="sm" tone="tertiary">No identity-resolution proposals have been recorded.</Text>}
      <MoreButton available={more} pending={morePending} load={loadMore} />
    </div>
  </Panel>;
}

function IdentityResolutionSetPanel({ workspace, records, recordsHasNext, recordsFetchingNext, fetchMoreRecords, resolutions, resolutionSets, resolutionSetsError, mayWrite, shell, more, morePending, loadMore }: { workspace: string; records: ResearchRecord[]; recordsHasNext: boolean; recordsFetchingNext: boolean; fetchMoreRecords: () => void; resolutions: ResearchResolution[]; resolutionSets: ResearchResolutionSet[]; resolutionSetsError: Error | null; mayWrite: boolean; shell?: ReturnType<typeof useContext>["shell"]; more: boolean; morePending: boolean; loadMore: () => void }) {
  const [canonicalRecordId, setCanonicalRecordId] = useState("");
  const [aliasRecordIds, setAliasRecordIds] = useState<string[]>([]);
  const [rationale, setRationale] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = resolutionSets.find((one) => one.resolution_set_id === selectedId);
  const selectedRecordIDs = selected ? [...selected.alias_record_ids, selected.canonical_record_id] : [];
  const hydratedSelectedRecords = useQuery({
    queryKey: keys.records.byIDs(workspace, selectedRecordIDs),
    queryFn: () => researchRecordsByIDsQuery(workspace, selectedRecordIDs),
    enabled: selectedRecordIDs.length > 0,
    retry: false,
  });
  const selectedImpact = useQuery({
    queryKey: keys.resolutionSets.impact(workspace, selectedId ?? ""),
    queryFn: () => researchResolutionSetImpactQuery(workspace, selectedId!),
    enabled: Boolean(selectedId),
    retry: false,
  });
  const recordsByID = new Map([...records, ...(hydratedSelectedRecords.data ?? [])].map((record) => [record.record_id, record]));
  const activeRecordIDs = new Set([
    ...resolutions.filter((one) => one.state === "proposed" || one.state === "accepted").flatMap((one) => [one.alias_record_id, one.canonical_record_id]),
    ...resolutionSets.filter((one) => one.state === "proposed" || one.state === "accepted").flatMap((one) => [...one.alias_record_ids, one.canonical_record_id]),
  ]);
  const available = records.filter((one) => !activeRecordIDs.has(one.record_id));
  const canonicalRecords = available.filter((record) => !aliasRecordIds.includes(record.record_id));
  const selectedAliases = selected?.alias_record_ids.map((id) => recordsByID.get(id)).filter((record): record is ResearchRecord => Boolean(record)) ?? [];
  const selectedCanonical = selected ? recordsByID.get(selected.canonical_record_id) : undefined;
  const draftCanonical = recordsByID.get(canonicalRecordId);
  const draftAliases = aliasRecordIds.map((id) => recordsByID.get(id)).filter((record): record is ResearchRecord => Boolean(record));
  const previewAliases = selected ? selectedAliases : draftAliases;
  const previewCanonical = selected ? selectedCanonical : draftCanonical;
  const previewObservationIDs = [...new Set([...(previewCanonical?.observation_ids ?? []), ...previewAliases.flatMap((record) => record.observation_ids)])];
  const previewEvidence = useQuery({
    queryKey: keys.evidence.recordEvidence(workspace, previewObservationIDs),
    queryFn: () => evidenceByIDsQuery(workspace, previewObservationIDs),
    enabled: previewObservationIDs.length > 0,
    retry: false,
  });
  const propose = useResearchWrite(() => createResearchResolutionSetAction(workspace, { canonical_record_id: canonicalRecordId, alias_record_ids: aliasRecordIds, rationale } satisfies ProposeResearchResolutionSet), [keys.resolutionSets.all(workspace)], (resolution) => { setSelectedId(resolution.resolution_set_id); setRationale(""); setAliasRecordIds([]); setCanonicalRecordId(""); });
  const review = useResearchWrite(() => reviewResearchResolutionSetAction(workspace, selected!.resolution_set_id, "accept"), [keys.resolutionSets.all(workspace), keys.records.all(workspace)], () => undefined);
  const reject = useResearchWrite(() => reviewResearchResolutionSetAction(workspace, selected!.resolution_set_id, "reject"), [keys.resolutionSets.all(workspace)], () => undefined);
  const reverse = useResearchWrite(() => reverseResearchResolutionSetAction(workspace, selected!.resolution_set_id), [keys.resolutionSets.all(workspace), keys.records.all(workspace)], () => undefined);
  const recordName = (id: string) => recordsByID.get(id)?.name ?? id;
  const toggleAlias = (id: string) => setAliasRecordIds((current) => current.includes(id) ? current.filter((one) => one !== id) : current.length < 3 ? [...current, id] : current);
  return <Panel title="Multi-record identity resolution" note="Bounded, human-confirmed alias sets; one canonical record is kept and every alias remains preserved.">
    <div className={s.stack}>
      <Text size="sm" tone="tertiary">Use this when several authored records appear to describe the same subject. The set is reviewed as one decision, while field differences and citation conflicts stay visible for the analyst.</Text>
      {mayWrite && available.length > 1 ? <form className={s.eventEditor} aria-label="Propose a multi-record resolution" onSubmit={(event) => { event.preventDefault(); propose.mutate(); }}>
        <RecordPicker label="Canonical record to keep" value={canonicalRecordId} records={canonicalRecords} onChange={(value) => { setCanonicalRecordId(value); setAliasRecordIds((current) => current.filter((id) => id !== value)); }} hasNext={recordsHasNext} fetchingNext={recordsFetchingNext} fetchMore={fetchMoreRecords} />
        <div className={s.stack}><Text size="sm">Alias records <span className={s.muted}>(choose one to three)</span></Text>{available.filter((record) => record.record_id !== canonicalRecordId).map((record) => <label className={s.row} key={record.record_id}><input type="checkbox" checked={aliasRecordIds.includes(record.record_id)} onChange={() => toggleAlias(record.record_id)} /> <span>{record.name} <span className={s.muted}>· {kindLabels[record.kind]} · {record.observation_ids.length} citations</span></span></label>)}<MoreButton available={recordsHasNext && !propose.isPending} pending={recordsFetchingNext} load={fetchMoreRecords} /></div>
        {previewCanonical && previewAliases.length ? <ResolutionSetPreview workspace={workspace} aliases={previewAliases} canonical={previewCanonical} resolution={undefined} evidence={previewEvidence.data ?? []} evidenceError={previewEvidence.isError ? previewEvidence.error : null} /> : null}
        <Field label="Why should these records resolve together?" hint="State the common identity basis, field conflicts, and remaining limits." required>{(aria) => <Textarea {...aria} rows={3} value={rationale} onChange={(event) => setRationale(event.target.value)} placeholder="The same distinctive handle appears across independent sources; the names differ but no contradiction is currently known." />}</Field>
        <Failure error={propose.error} />
        <Button type="submit" intent="primary" disabled={!canonicalRecordId || aliasRecordIds.length < 1 || !rationale.trim()} loading={propose.isPending}>Create multi-record review</Button>
      </form> : mayWrite ? <Text size="sm" tone="tertiary">Create at least two unresolved research records before proposing a multi-record resolution.</Text> : null}
      {resolutionSetsError ? <Failure error={resolutionSetsError} /> : null}
      {selected ? hydratedSelectedRecords.isError ? <Failure error={hydratedSelectedRecords.error} /> : selectedCanonical && selectedAliases.length === selected.alias_record_ids.length ? <ResolutionSetReview resolution={selected} workspace={workspace} aliases={selectedAliases} canonical={selectedCanonical} evidence={previewEvidence.data ?? []} evidenceError={previewEvidence.isError ? previewEvidence.error : null} impact={selectedImpact.data} impactLoading={selectedImpact.isPending} impactError={selectedImpact.isError ? selectedImpact.error : null} mayWrite={mayWrite} review={review} reject={reject} reverse={reverse} /> : <Text size="sm" tone="tertiary">Loading the records in this review set…</Text> : null}
      {resolutionSets.length ? <div className={s.eventList}>{resolutionSets.map((resolution) => <button type="button" key={resolution.resolution_set_id} className={resolution.resolution_set_id === selectedId ? `${s.eventCardSelect} ${s.eventCardActive}` : s.eventCardSelect} onClick={() => setSelectedId(resolution.resolution_set_id)}><span className={s.eventMeta}><Badge tone={resolution.state === "accepted" ? "accent" : resolution.state === "rejected" ? "neutral" : "warn"}>{resolution.state}</Badge><span className={s.muted}>{dateLabel(resolution.proposed_at)} · {resolution.proposed_by === shell?.me.account_id ? "You" : resolution.proposed_by}</span></span><strong className={s.eventTitle}>{resolution.alias_record_ids.map(recordName).join(", ")} <span className={s.muted}>→</span> {recordName(resolution.canonical_record_id)}</strong><span className={s.body}>{resolution.rationale}</span></button>)}</div> : <Text size="sm" tone="tertiary">No multi-record resolution proposals have been recorded.</Text>}
      <MoreButton available={more} pending={morePending} load={loadMore} />
    </div>
  </Panel>;
}

function ResolutionSetPreview({ workspace, aliases, canonical, resolution, evidence, evidenceError }: { workspace: string; aliases: ResearchRecord[]; canonical: ResearchRecord; resolution?: ResearchResolutionSet; evidence: Evidence[]; evidenceError: Error | null }) {
  const canonicalObservationIDs = new Set(canonical.observation_ids);
  const currentAddedIDs = [...new Set(aliases.flatMap((record) => record.observation_ids.filter((id) => !canonicalObservationIDs.has(id))))];
  const proposedAddedIDs = resolution?.added_observation_ids ?? currentAddedIDs;
  const changedFields = aliases.reduce((total, alias) => total + [alias.kind !== canonical.kind, alias.name !== canonical.name, (alias.description ?? "") !== (canonical.description ?? "")].filter(Boolean).length, 0);
  return <div className={s.stack}><div className={s.eventMeta}><Badge tone={changedFields ? "warn" : "accent"}>{changedFields} field difference{changedFields === 1 ? "" : "s"}</Badge><Text size="xs" tone="tertiary">{resolution ? "Exact acceptance preview" : "Proposed effect preview"}</Text></div><Text size="sm"><strong>{aliases.length} alias records</strong> will remain preserved and will not have their IDs rewritten. <strong>{canonical.name}</strong> remains the canonical working record.</Text><div className={s.stack}><Text size="xs" tone="tertiary">Alias comparison</Text>{aliases.map((alias) => <div className={s.stack} key={alias.record_id}><Text size="xs"><strong>{alias.name}</strong> · {kindLabels[alias.kind]} · {alias.observation_ids.length} citations</Text><Text size="xs" tone={alias.name === canonical.name && alias.kind === canonical.kind ? "tertiary" : "primary"}>canonical: {canonical.name} · {kindLabels[canonical.kind]}</Text><CitationLinks ids={alias.observation_ids} evidence={evidence} workspace={workspace} error={evidenceError} returnTo={recordHref(workspace, alias.record_id)} /></div>)}</div><Text size="xs" tone="tertiary">Current effect: canonical keeps {canonical.observation_ids.length} citation{canonical.observation_ids.length === 1 ? "" : "s"} and would gain {currentAddedIDs.length || "no"} new citation{currentAddedIDs.length === 1 ? "" : "s"}. {resolution ? `The proposal recorded ${proposedAddedIDs.length || "no"} new citation${proposedAddedIDs.length === 1 ? "" : "s"} at creation.` : "Acceptance recalculates this from the current records."}</Text>{resolution && !sameIDs(proposedAddedIDs, currentAddedIDs) ? <Text size="xs" tone="accent">The records changed after this proposal was created; acceptance will use the current effect shown above.</Text> : null}<div className={s.stack}><Text size="xs" tone="tertiary">Canonical citations</Text><CitationLinks ids={canonical.observation_ids} evidence={evidence} workspace={workspace} error={evidenceError} returnTo={recordHref(workspace, canonical.record_id)} /></div></div>;
}

function ResolutionSetReview({ resolution, workspace, aliases, canonical, evidence, evidenceError, impact, impactLoading, impactError, mayWrite, review, reject, reverse }: { resolution: ResearchResolutionSet; workspace: string; aliases: ResearchRecord[]; canonical: ResearchRecord; evidence: Evidence[]; evidenceError: Error | null; impact?: ResearchResolutionImpact; impactLoading: boolean; impactError: Error | null; mayWrite: boolean; review: ReturnType<typeof useResearchWrite<ResearchResolutionSet>>; reject: ReturnType<typeof useResearchWrite<ResearchResolutionSet>>; reverse: ReturnType<typeof useResearchWrite<ResearchResolutionSet>> }) {
  const history = [{ label: "Proposed", actor: resolution.proposed_by, at: resolution.proposed_at }, ...(resolution.reviewed_at ? [{ label: resolution.state === "reversed" ? "Accepted before reversal" : resolution.state === "accepted" ? "Accepted" : "Rejected", actor: resolution.reviewed_by, at: resolution.reviewed_at }] : []), ...(resolution.reversed_at ? [{ label: "Reversed", actor: resolution.reversed_by, at: resolution.reversed_at }] : [])];
  return <article className={s.observation}><div className={s.eventMeta}><Badge tone={resolution.state === "accepted" ? "accent" : resolution.state === "rejected" ? "neutral" : "warn"}>{resolution.state}</Badge><Text size="xs" tone="tertiary">Multi-record resolution review</Text></div><ResolutionSetPreview workspace={workspace} aliases={aliases} canonical={canonical} resolution={resolution} evidence={evidence} evidenceError={evidenceError} /><div className={s.stack}><Text size="xs" tone="tertiary">Decision history</Text>{history.map((entry) => <div className={s.row} key={`${entry.label}:${entry.at}`}><Badge tone={entry.label === "Accepted" ? "accent" : entry.label === "Rejected" || entry.label === "Reversed" ? "neutral" : "warn"}>{entry.label}</Badge><Text size="xs" tone="tertiary">{dateLabel(entry.at)} · {entry.actor}</Text></div>)}</div><Text size="sm">Review rationale: {resolution.rationale}</Text>{impactError ? <Failure error={impactError} /> : impactLoading ? <Text size="xs" tone="tertiary">Checking authored connections, events, briefs, and frozen handoffs…</Text> : impact ? <div className={s.stack}><Text size="xs" tone="tertiary">Affected authored surfaces ({impact.connections.length + impact.events.length + impact.briefs.length + impact.snapshots.length})</Text>{impact.connections.map((connection) => <Link key={connection.connection_id} className={s.inlineLink} href={`${investigationPath(workspace, "connections")}?connection=${encodeURIComponent(connection.connection_id)}`}>{connection.from_record_name} → {connection.to_record_name} · {connection.kind} · {connection.state}</Link>)}{impact.events.map((event) => <Link key={event.event_id} className={s.inlineLink} href={eventHref(workspace, event.event_id)}>{event.title}{event.sort_date ? ` · ${event.sort_date}` : ""}</Link>)}{impact.briefs.map((brief) => <Link key={brief.brief_id} className={s.inlineLink} href={investigationPath(workspace, "brief")}>{brief.title}</Link>)}{impact.snapshots.map((snapshot) => <Link key={snapshot.snapshot_id} className={s.inlineLink} href={investigationPath(workspace, `brief/snapshots/${encodeURIComponent(snapshot.snapshot_id)}`)}>{snapshot.title} · frozen {dateLabel(snapshot.frozen_at)}</Link>)}{!impact.connections.length && !impact.events.length && !impact.briefs.length && !impact.snapshots.length ? <Text size="xs" tone="tertiary">No authored connections, events, working briefs, or frozen handoffs currently reference these records.</Text> : null}</div> : null}{mayWrite && resolution.state === "proposed" ? <div className={s.row}><Button type="button" intent="primary" loading={review.isPending} onClick={() => review.mutate()}>Confirm resolution set</Button><Button type="button" intent="ghost" loading={reject.isPending} onClick={() => reject.mutate()}>Reject proposal</Button></div> : null}{mayWrite && resolution.state === "accepted" ? <Button type="button" intent="ghost" loading={reverse.isPending} onClick={() => reverse.mutate()}>Reverse resolution set</Button> : null}<Failure error={review.error ?? reject.error ?? reverse.error} /></article>;
}

function ResolutionReview({ resolution, workspace, alias, canonical, evidence, evidenceError, impact, impactLoading, impactError, mayWrite, review, reject, reverse }: { resolution: ResearchResolution; workspace: string; alias: ResearchRecord; canonical: ResearchRecord; evidence: Evidence[]; evidenceError: Error | null; impact?: ResearchResolutionImpact; impactLoading: boolean; impactError: Error | null; mayWrite: boolean; review: ReturnType<typeof useResearchWrite<ResearchResolution>>; reject: ReturnType<typeof useResearchWrite<ResearchResolution>>; reverse: ReturnType<typeof useResearchWrite<ResearchResolution>> }) {
  return <article className={s.observation}><div className={s.eventMeta}><Badge tone={resolution.state === "accepted" ? "accent" : resolution.state === "rejected" ? "neutral" : "warn"}>{resolution.state}</Badge><Text size="xs" tone="tertiary">Resolution review</Text></div><ResolutionPreview workspace={workspace} alias={alias} canonical={canonical} resolution={resolution} evidence={evidence} evidenceError={evidenceError} /><ResolutionHistoryImpact resolution={resolution} workspace={workspace} impact={impact} loading={impactLoading} error={impactError} /><Text size="sm">Review rationale: {resolution.rationale}</Text>{mayWrite && resolution.state === "proposed" ? <div className={s.row}><Button type="button" intent="primary" loading={review.isPending} onClick={() => review.mutate()}>Confirm resolution</Button><Button type="button" intent="ghost" loading={reject.isPending} onClick={() => reject.mutate()}>Reject proposal</Button></div> : null}{mayWrite && resolution.state === "accepted" ? <Button type="button" intent="ghost" loading={reverse.isPending} onClick={() => reverse.mutate()}>Reverse resolution</Button> : null}<Failure error={review.error ?? reject.error ?? reverse.error} /></article>;
}

function ResolutionHistoryImpact({ resolution, workspace, impact, loading, error }: { resolution: ResearchResolution; workspace: string; impact?: ResearchResolutionImpact; loading: boolean; error: Error | null }) {
  const history = [
    { label: "Proposed", actor: resolution.proposed_by, at: resolution.proposed_at },
    ...(resolution.reviewed_at ? [{ label: resolution.state === "reversed" ? "Accepted before reversal" : resolution.state === "accepted" ? "Accepted" : "Rejected", actor: resolution.reviewed_by, at: resolution.reviewed_at }] : []),
    ...(resolution.reversed_at ? [{ label: "Reversed", actor: resolution.reversed_by, at: resolution.reversed_at }] : []),
  ];
  return <div className={s.stack}>
    <div className={s.eventMeta}><Text size="xs" tone="tertiary">Decision history</Text><Badge tone={impact && (impact.connections.length + impact.events.length + impact.briefs.length + impact.snapshots.length) ? "warn" : "accent"}>{impact ? `${impact.connections.length + impact.events.length + impact.briefs.length + impact.snapshots.length} affected reference${impact.connections.length + impact.events.length + impact.briefs.length + impact.snapshots.length === 1 ? "" : "s"}` : "Impact loading"}</Badge></div>
    <div className={s.stack}>{history.map((entry) => <div className={s.row} key={`${entry.label}:${entry.at}`}><Badge tone={entry.label === "Accepted" ? "accent" : entry.label === "Rejected" || entry.label === "Reversed" ? "neutral" : "warn"}>{entry.label}</Badge><Text size="xs" tone="tertiary">{dateLabel(entry.at)} · {entry.actor}</Text></div>)}</div>
    {error ? <Failure error={error} /> : loading ? <Text size="xs" tone="tertiary">Checking live connections, events, briefs, and frozen handoffs…</Text> : impact ? <div className={s.stack}>
      <Text size="xs" tone="tertiary">Affected authored surfaces</Text>
      {impact.connections.length ? <div className={s.stack}><Text size="xs">Connections ({impact.connections.length})</Text>{impact.connections.map((connection) => <Link key={connection.connection_id} className={s.inlineLink} href={`${investigationPath(workspace, "connections")}?connection=${encodeURIComponent(connection.connection_id)}`}>{connection.from_record_name} → {connection.to_record_name} · {connection.kind} · {connection.state}</Link>)}</div> : null}
      {impact.events.length ? <div className={s.stack}><Text size="xs">Events ({impact.events.length})</Text>{impact.events.map((event) => <Link key={event.event_id} className={s.inlineLink} href={eventHref(workspace, event.event_id)}>{event.title}{event.sort_date ? ` · ${event.sort_date}` : ""}</Link>)}</div> : null}
      {impact.briefs.length ? <div className={s.stack}><Text size="xs">Working briefs ({impact.briefs.length})</Text>{impact.briefs.map((brief) => <Link key={brief.brief_id} className={s.inlineLink} href={investigationPath(workspace, "brief")}>{brief.title}</Link>)}</div> : null}
      {impact.snapshots.length ? <div className={s.stack}><Text size="xs">Frozen handoffs ({impact.snapshots.length})</Text>{impact.snapshots.map((snapshot) => <Link key={snapshot.snapshot_id} className={s.inlineLink} href={investigationPath(workspace, `brief/snapshots/${encodeURIComponent(snapshot.snapshot_id)}`)}>{snapshot.title} · frozen {dateLabel(snapshot.frozen_at)}</Link>)}</div> : null}
      {!impact.connections.length && !impact.events.length && !impact.briefs.length && !impact.snapshots.length ? <Text size="xs" tone="tertiary">No authored connections, events, working briefs, or frozen handoffs currently reference either record.</Text> : null}
    </div> : null}
  </div>;
}

function ResolutionPreview({ workspace, alias, canonical, resolution, evidence, evidenceError }: { workspace: string; alias: ResearchRecord; canonical: ResearchRecord; resolution?: ResearchResolution; evidence: Evidence[]; evidenceError: Error | null }) {
  const aliasObservationIDs = new Set(alias.observation_ids);
  const canonicalObservationIDs = new Set(canonical.observation_ids);
  const currentAddedIDs = alias.observation_ids.filter((id) => !canonicalObservationIDs.has(id));
  const proposedAddedIDs = resolution?.added_observation_ids ?? currentAddedIDs;
  const fields = [
    ["Type", kindLabels[alias.kind], kindLabels[canonical.kind]],
    ["Name", alias.name, canonical.name],
    ["Description", alias.description || "(none)", canonical.description || "(none)"],
  ] as const;
  const changedFields = fields.filter(([, left, right]) => left !== right).length;
  const proposalChanged = resolution ? !sameIDs(proposedAddedIDs, currentAddedIDs) : false;
  return <div className={s.stack}>
    <div className={s.eventMeta}><Badge tone={changedFields ? "warn" : "accent"}>{changedFields} field difference{changedFields === 1 ? "" : "s"}</Badge><Text size="xs" tone="tertiary">{resolution ? "Exact acceptance preview" : "Proposed effect preview"}</Text></div>
    <Text size="sm"><strong>{alias.name}</strong> will remain preserved as an alias of <strong>{canonical.name}</strong>. Existing connection, event, brief, and citation IDs are not rewritten.</Text>
    <div className={s.stack}><Text size="xs" tone="tertiary">Field comparison</Text>{fields.map(([label, left, right]) => <div className={s.row} key={label}><Text size="xs"><strong>{label}</strong> · alias: {left}</Text><Text size="xs" tone={left === right ? "tertiary" : "primary"}>canonical: {right}</Text></div>)}</div>
    <Text size="xs" tone="tertiary">Current effect: canonical keeps {canonical.observation_ids.length} citation{canonical.observation_ids.length === 1 ? "" : "s"} and would gain {currentAddedIDs.length || "no"} new citation{currentAddedIDs.length === 1 ? "" : "s"}; the alias keeps its {alias.observation_ids.length} original citation{alias.observation_ids.length === 1 ? "" : "s"}. {resolution ? `The proposal recorded ${proposedAddedIDs.length || "no"} new citation${proposedAddedIDs.length === 1 ? "" : "s"} at creation.` : "Acceptance recalculates this from the current records."}</Text>
    {proposalChanged ? <Text size="xs" tone="accent">The records changed after this proposal was created; acceptance will use the current effect shown above.</Text> : null}
    <div className={s.stack}><Text size="xs" tone="tertiary">Alias citations</Text><CitationLinks ids={[...aliasObservationIDs]} evidence={evidence} workspace={workspace} error={evidenceError} returnTo={recordHref(workspace, alias.record_id)} /><Text size="xs" tone="tertiary">Canonical citations</Text><CitationLinks ids={[...canonicalObservationIDs]} evidence={evidence} workspace={workspace} error={evidenceError} returnTo={recordHref(workspace, canonical.record_id)} /></div>
  </div>;
}

function sameIDs(left: string[], right: string[]) {
  return left.length === right.length && left.every((id) => right.includes(id));
}

function RecordCard({ record, active, evidence, workspace, shell, select }: { record: ResearchRecord; active: boolean; evidence: Evidence[]; workspace: string; shell?: ReturnType<typeof useContext>["shell"]; select: () => void }) {
  return <article className={active ? `${s.eventCard} ${s.eventCardActive}` : s.eventCard}>
    <button type="button" className={s.eventCardSelect} onClick={select}>
      <span className={s.eventMeta}><Badge tone="neutral">{kindLabels[record.kind]}</Badge><span className={s.muted}>{authorLabel(record.updated_by, shell)} · {dateLabel(record.updated_at)}</span></span>
      <strong className={s.eventTitle}>{record.name}</strong>
      {record.description ? <span className={s.body}>{record.description}</span> : null}
      {record.place_geometry ? <span className={s.muted}>Map point · {record.place_geometry.latitude.toFixed(4)}, {record.place_geometry.longitude.toFixed(4)} · {record.place_geometry.precision}</span> : null}
      <span className={s.muted}>{record.observation_ids.length} cited observation{record.observation_ids.length === 1 ? "" : "s"}</span>
    </button>
    {record.observation_ids.length ? <span className={s.questionLinks}>{record.observation_ids.map((id) => {
      const found = evidence.find((one) => one.observation_id === id);
      return found ? <Link key={id} href={sourceHref(workspace, found.source_id, found.capture_id, found.observation_id, recordHref(workspace, record.record_id))} className={s.inlineLink}>{found.source_title}: {found.statement}</Link> : <span key={id} className={s.muted}>Citation {id.slice(0, 8)}…</span>;
    })}</span> : null}
  </article>;
}

function RecordEditor({ workspace, record, initialObservationIds, initialCandidate, promotion, evidence, evidenceError, evidenceHasNext, evidenceFetchingNext, fetchMoreEvidence, mayWrite, shell, saved }: { workspace: string; record?: ResearchRecord; initialObservationIds: string[]; initialCandidate?: RecordCandidatePrefill; promotion?: Promotion; evidence: Evidence[]; evidenceError: Error | null; evidenceHasNext: boolean; evidenceFetchingNext: boolean; fetchMoreEvidence: () => void; mayWrite: boolean; shell?: ReturnType<typeof useContext>["shell"]; saved: (record: ResearchRecord) => void }) {
  const [kind, setKind] = useState<ResearchRecordKind>(record?.kind ?? initialCandidate?.kind ?? "person");
  const [name, setName] = useState(record?.name ?? initialCandidate?.name ?? "");
  const [description, setDescription] = useState(record?.description ?? initialCandidate?.description ?? "");
  const [observationIds, setObservationIds] = useState<string[]>(record?.observation_ids ?? initialObservationIds);
  const [latitude, setLatitude] = useState(record?.place_geometry ? String(record.place_geometry.latitude) : "");
  const [longitude, setLongitude] = useState(record?.place_geometry ? String(record.place_geometry.longitude) : "");
  const [precision, setPrecision] = useState<PlacePrecision>(record?.place_geometry?.precision ?? "approximate");
  const [geometryObservationIds, setGeometryObservationIds] = useState<string[]>(record?.place_geometry?.observation_ids ?? initialObservationIds);
  const numericLatitude = Number(latitude);
  const numericLongitude = Number(longitude);
  const body: WriteResearchRecord = {
    kind, name, description, observation_ids: observationIds,
    ...(kind === "place" && latitude.trim() && longitude.trim() && Number.isFinite(numericLatitude) && Number.isFinite(numericLongitude) ? { place_geometry: { latitude: numericLatitude, longitude: numericLongitude, precision, observation_ids: geometryObservationIds } } : {}),
  };
  const save = useResearchWrite(() => record ? updateResearchRecordAction(workspace, record.record_id, body) : createResearchRecordAction(workspace, body), [keys.records.all(workspace)], saved);

  if (!mayWrite) return record ? <RecordDetail record={record} evidence={evidence} workspace={workspace} shell={shell} error={evidenceError} /> : <Text size="sm" tone="tertiary">This investigation is read-only. Existing records remain visible, but new records require write access.</Text>;

  return <form className={s.eventEditor} aria-label={record ? "Edit research record" : "Create research record"} onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
    {promotion ? <Text size="sm" tone="accent">{promotion.fromRecordId ? "The first record is saved. Review the second record before a proposed connection is opened." : `This is a reviewable ${connectionKindLabels[promotion.relationship.kind].toLowerCase()} hypothesis. Verify both records before creating any connection.`}{initialObservationIds.length ? <> Using {initialObservationIds.length} supporting observation{initialObservationIds.length === 1 ? "" : "s"}.</> : null}</Text> : initialObservationIds.length || initialCandidate ? <Text size="sm" tone="accent">Started from a review candidate{initialObservationIds.length ? <> using {initialObservationIds.length} supporting observation{initialObservationIds.length === 1 ? "" : "s"}</> : null}. Verify the suggested fields and citation before saving.</Text> : null}
    <Field label="Record type" required>{(aria) => <select {...aria} className={s.select} value={kind} onChange={(event) => setKind(event.target.value as ResearchRecordKind)}>{Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}</Field>
    <Field label="Name" hint="Use the wording currently supported by the investigation; do not imply a resolved identity." required>{(aria) => <Input {...aria} value={name} onChange={(event) => setName(event.target.value)} placeholder="A working name or handle" />}</Field>
    <Field label="Description" hint="Explain what this record refers to and what remains uncertain.">{(aria) => <Textarea {...aria} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="A qualified description grounded in the cited observations." />}</Field>
    <CitationPicker workspace={workspace} label="Cited observations" selected={observationIds} evidence={evidence} setSelected={setObservationIds} error={evidenceError} max={12} hasNext={evidenceHasNext} fetchingNext={evidenceFetchingNext} fetchMore={fetchMoreEvidence} returnTo={investigationPath(workspace, "records")} />
    {kind === "place" ? <PlaceGeometryEditor observationIds={observationIds} selectedObservationIds={geometryObservationIds} setSelectedObservationIds={setGeometryObservationIds} latitude={latitude} longitude={longitude} precision={precision} setLatitude={setLatitude} setLongitude={setLongitude} setPrecision={setPrecision} evidence={evidence} /> : null}
    <Failure error={save.error} />
    {save.isSuccess ? <Text size="sm" tone="accent" role="status">Record saved.</Text> : null}
    <div className={s.row}><Button type="submit" intent="primary" loading={save.isPending}>{record ? "Update record" : "Save record"}</Button>{record ? <><Text size="xs" tone="tertiary">Last updated by {authorLabel(record.updated_by, shell)}</Text><WorkingNoteLink workspace={workspace} context={{ kind: "record", id: record.record_id }} returnTo={recordHref(workspace, record.record_id)} body={`Follow up on research record: ${record.name}\n\n${record.description ?? ""}\n\nNext steps: `} /></> : null}</div>
  </form>;
}

function RecordDetail({ record, evidence, workspace, shell, error }: { record: ResearchRecord; evidence: Evidence[]; workspace: string; shell?: ReturnType<typeof useContext>["shell"]; error: Error | null }) {
  return <div className={s.stack}>
    <div className={s.eventMeta}><Badge tone="neutral">{kindLabels[record.kind]}</Badge><span className={s.muted}>Updated by {authorLabel(record.updated_by, shell)} · {dateLabel(record.updated_at)}</span></div>
    <Text size="sm" className={s.eventTitle}>{record.name}</Text>
    {record.description ? <Text size="sm" tone="tertiary">{record.description}</Text> : <Text size="sm" tone="tertiary">No description recorded.</Text>}
    {record.place_geometry ? <PlaceGeometryDetail geometry={record.place_geometry} evidence={evidence} workspace={workspace} error={error} returnTo={recordHref(workspace, record.record_id)} /> : null}
    <CitationLinks ids={record.observation_ids} evidence={evidence} workspace={workspace} error={error} returnTo={recordHref(workspace, record.record_id)} />
  </div>;
}

function PlaceGeometryEditor({ observationIds, selectedObservationIds, setSelectedObservationIds, latitude, longitude, precision, setLatitude, setLongitude, setPrecision, evidence }: { observationIds: string[]; selectedObservationIds: string[]; setSelectedObservationIds: (ids: string[]) => void; latitude: string; longitude: string; precision: PlacePrecision; setLatitude: (value: string) => void; setLongitude: (value: string) => void; setPrecision: (value: PlacePrecision) => void; evidence: Evidence[] }) {
  const toggle = (id: string) => setSelectedObservationIds(selectedObservationIds.includes(id) ? selectedObservationIds.filter((one) => one !== id) : [...selectedObservationIds, id]);
  return <div className={s.stack}>
    <Text size="sm">Place map context</Text>
    <Text size="xs" tone="tertiary">Coordinates are authored from the cited material. Overwatch does not geocode names or infer a point without evidence.</Text>
    <div className={s.row}>
      <Field label="Latitude" hint="-90 to 90" required>{(aria) => <Input {...aria} type="number" step="any" min="-90" max="90" value={latitude} onChange={(event) => setLatitude(event.target.value)} placeholder="41.0082" />}</Field>
      <Field label="Longitude" hint="-180 to 180" required>{(aria) => <Input {...aria} type="number" step="any" min="-180" max="180" value={longitude} onChange={(event) => setLongitude(event.target.value)} placeholder="28.9784" />}</Field>
    </div>
    <Field label="Spatial precision" hint="A region point is representative, not an exact boundary." required>{(aria) => <select {...aria} className={s.select} value={precision} onChange={(event) => setPrecision(event.target.value as PlacePrecision)}><option value="exact">Exact</option><option value="approximate">Approximate</option><option value="region">Region representative point</option></select>}</Field>
    <div className={s.stack}><Text size="xs" tone="tertiary">Observations supporting these coordinates</Text>{observationIds.length ? observationIds.map((id) => { const found = evidence.find((one) => one.observation_id === id); return <label className={s.row} key={id}><input type="checkbox" checked={selectedObservationIds.includes(id)} onChange={() => toggle(id)} /> <span>{found?.statement ?? `Citation ${id.slice(0, 8)}…`}</span></label>; }) : <Text size="xs" tone="tertiary">Attach record citations before adding map context.</Text>}</div>
  </div>;
}

function PlaceGeometryDetail({ geometry, evidence, workspace, error, returnTo }: { geometry: { latitude: number; longitude: number; precision: PlacePrecision; observation_ids: string[] }; evidence: Evidence[]; workspace: string; error: Error | null; returnTo: string }) {
  const mapURL = `https://www.openstreetmap.org/?mlat=${encodeURIComponent(geometry.latitude)}&mlon=${encodeURIComponent(geometry.longitude)}#map=12/${encodeURIComponent(geometry.latitude)}/${encodeURIComponent(geometry.longitude)}`;
  return <div className={s.stack}><Text size="xs" tone="tertiary">Map context</Text><Text size="sm">{geometry.latitude.toFixed(5)}, {geometry.longitude.toFixed(5)} <span className={s.muted}>· {geometry.precision}</span></Text><a className={s.inlineLink} href={mapURL} target="_blank" rel="noreferrer">Open in OpenStreetMap ↗</a><CitationLinks ids={geometry.observation_ids} evidence={evidence} workspace={workspace} error={error} returnTo={returnTo} /></div>;
}

function CitationLinks({ ids, evidence, workspace, error, returnTo }: { ids: string[]; evidence: Evidence[]; workspace: string; error: Error | null; returnTo?: string }) {
  if (!ids.length) return <Text size="sm" tone="tertiary">No cited observations attached.</Text>;
  return <div className={s.stack}><Text size="xs" tone="tertiary">Cited observations</Text>{error ? <Failure error={error} /> : ids.map((id) => {
    const found = evidence.find((one) => one.observation_id === id);
    return found ? <Link key={id} className={s.inlineLink} href={sourceHref(workspace, found.source_id, found.capture_id, found.observation_id, returnTo)}>{found.source_title}: {found.statement}</Link> : <Text key={id} size="xs" tone="tertiary">Citation {id}</Text>;
  })}</div>;
}
