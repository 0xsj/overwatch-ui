"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Badge, Panel } from "@/components/display";
import { Button, Field, Input, Textarea } from "@/components/forms";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import { filterLoadedRows } from "@/lib/query/filter";
import type { Evidence } from "@/lib/services/review";
import type { ResearchRecord, ResearchRecordKind, WriteResearchRecord } from "@/lib/services/research-records";
import type { RecordCandidatePrefill, RelationshipPrefill } from "@/lib/services/research-records/navigation";
import type { ResearchConnectionKind } from "@/lib/services/research-connections";
import { connectionHref } from "@/lib/services/research-connections/navigation";
import type { ResearchResolution } from "@/lib/services/research-resolutions";
import { mayWriteResearch } from "../_route-context";
import { PageHead } from "../_components/page-head";
import { Query, useContext } from "../_hooks";
import { evidenceByIDsQuery, evidenceQuery, researchRecordQuery, researchRecordsQuery, researchResolutionsQuery } from "../_queries";
import { createResearchRecordAction, createResearchResolutionAction, reverseResearchResolutionAction, reviewResearchResolutionAction, updateResearchRecordAction } from "./_actions";
import { authorLabel, dateLabel, Failure, investigationPath, MoreButton, ObservationPicker as CitationPicker, RecordPicker, recordHref, sourceHref, useResearchWrite } from "./_shared";
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
  const initialPromotion = promotionFrom(searchParams);
  const initialObservationIds = searchParams.getAll("observation");
  const records = useInfiniteQuery({
    queryKey: keys.records.list(workspace),
    queryFn: ({ pageParam }) => researchRecordsQuery(workspace, pageParam),
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
  const rows = records.data?.pages.flatMap((page) => page.items) ?? [];
  const resolutionRows = resolutions.data?.pages.flatMap((page) => page.items) ?? [];
  const [filter, setFilter] = useState("");
  const visibleRows = filterLoadedRows(rows, filter, (row) => [row.record_id, row.name, row.description ?? "", row.kind]);
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
  const targetedObservationIds = [...new Set([...initialObservationIds, ...(active?.observation_ids ?? [])])];
  const candidateEvidence = useQuery({
    queryKey: keys.evidence.recordEvidence(workspace, targetedObservationIds),
    queryFn: () => evidenceByIDsQuery(workspace, targetedObservationIds),
    enabled: targetedObservationIds.length > 0,
  });
  const evidenceRows = mergeEvidence(evidence.data?.pages.flatMap((page) => page.items) ?? [], candidateEvidence.data ?? []);
  const evidenceError = evidence.isError ? evidence.error : candidateEvidence.isError ? candidateEvidence.error : null;
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
    <div className={s.columns}>
      <Panel title="Records" note={rows.length ? `${rows.length} loaded` : undefined}>
        <Query of={records} label="research records">{() => <div className={s.stack}>
          {!rows.length ? (
            <div className={s.empty}>
              <Text size="sm">No research records yet.</Text>
              <Text size="sm" tone="tertiary">Create a qualified working record when the investigation needs to refer to a person, account, organisation, or place across several citations.</Text>
              {mayWrite ? <Button type="button" intent="primary" onClick={resetDraft}>Create a record</Button> : null}
            </div>
          ) : <div className={s.stack}><Input aria-label="Filter research records" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter loaded records" /><Text size="xs" tone="tertiary">Showing {visibleRows.length} of {rows.length} loaded record{rows.length === 1 ? "" : "s"}.</Text>{visibleRows.length ? <div className={s.eventList}>{visibleRows.map((record) => <RecordCard key={record.record_id} record={record} active={record.record_id === activeId} evidence={evidenceRows} workspace={workspace} shell={shell} select={() => { setActiveId(record.record_id); setDraft({ observationIds: [], candidateKind: undefined, candidateName: "", candidateDescription: "" }); }} />)}</div> : <Text size="sm" tone="tertiary">No loaded records match. Clear the filter or load more.</Text>}</div>}
          <MoreButton available={records.hasNextPage} pending={records.isFetchingNextPage} load={() => void records.fetchNextPage()} />
        </div>}</Query>
      </Panel>
      <Panel title={promotion ? promotion.fromRecordId ? "Review related record" : "Review proposed record pair" : active ? "Review record" : targetedRecordLoading ? "Loading record" : activeId ? "Selected record" : "Create a record"}>
        {targetedRecordLoading ? <Text size="sm" tone="tertiary">Opening the selected record…</Text> : targetedRecord.error && !active ? <Failure error={targetedRecord.error} /> : <RecordEditor key={active?.record_id ?? `new:${draft.observationIds.join(",")}:${draft.candidateKind ?? ""}:${draft.candidateName}:${promotion?.fromRecordId ?? ""}`} workspace={workspace} record={active} initialObservationIds={draft.observationIds} initialCandidate={draft.candidateKind && draft.candidateName ? { kind: draft.candidateKind, name: draft.candidateName, ...(draft.candidateDescription ? { description: draft.candidateDescription } : {}) } : undefined} promotion={promotion} evidence={evidenceRows} evidenceError={evidenceError} evidenceHasNext={evidence.hasNextPage} evidenceFetchingNext={evidence.isFetchingNextPage} fetchMoreEvidence={() => void evidence.fetchNextPage()} mayWrite={mayWrite} shell={shell} saved={saved} />}
      </Panel>
    </div>
    <IdentityResolutionPanel workspace={workspace} records={rows} recordsHasNext={records.hasNextPage} recordsFetchingNext={records.isFetchingNextPage} fetchMoreRecords={() => void records.fetchNextPage()} resolutions={resolutionRows} resolutionsError={resolutions.isError ? resolutions.error : null} mayWrite={mayWrite} shell={shell} more={resolutions.hasNextPage} morePending={resolutions.isFetchingNextPage} loadMore={() => void resolutions.fetchNextPage()} />
  </>;
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
  const resolvedAliases = new Set(resolutions.filter((one) => one.state === "proposed" || one.state === "accepted").map((one) => one.alias_record_id));
  const aliases = records.filter((one) => !resolvedAliases.has(one.record_id));
  const canonicalRecords = records.filter((record) => record.record_id !== aliasRecordId && !resolvedAliases.has(record.record_id));
  const propose = useResearchWrite(() => createResearchResolutionAction(workspace, aliasRecordId, { canonical_record_id: canonicalRecordId, rationale }), [keys.resolutions.all(workspace)], (resolution) => { setSelectedId(resolution.resolution_id); setRationale(""); });
  const review = useResearchWrite(() => reviewResearchResolutionAction(workspace, selected!.resolution_id, "accept"), [keys.resolutions.all(workspace), keys.records.all(workspace)], () => undefined);
  const reject = useResearchWrite(() => reviewResearchResolutionAction(workspace, selected!.resolution_id, "reject"), [keys.resolutions.all(workspace)], () => undefined);
  const reverse = useResearchWrite(() => reverseResearchResolutionAction(workspace, selected!.resolution_id), [keys.resolutions.all(workspace), keys.records.all(workspace)], () => undefined);
  const recordName = (id: string) => records.find((one) => one.record_id === id)?.name ?? id;
  return <Panel title="Identity resolution" note="Human-confirmed alias links only; records and connection endpoint IDs remain preserved.">
    <div className={s.stack}>
      <Text size="sm" tone="tertiary">Use this when the evidence supports treating one authored record as an alias of another. A proposal changes nothing until it is explicitly accepted.</Text>
      {mayWrite && aliases.length > 1 ? <form className={s.eventEditor} onSubmit={(event) => { event.preventDefault(); propose.mutate(); }}>
        <RecordPicker label="Record to resolve" value={aliasRecordId} records={aliases} onChange={setAliasRecordId} hasNext={recordsHasNext} fetchingNext={recordsFetchingNext} fetchMore={fetchMoreRecords} />
        <RecordPicker label="Canonical record to keep" value={canonicalRecordId} records={canonicalRecords} onChange={setCanonicalRecordId} hasNext={recordsHasNext} fetchingNext={recordsFetchingNext} fetchMore={fetchMoreRecords} />
        <Field label="Why should these records resolve?" hint="State the human-reviewed basis and remaining limits." required>{(aria) => <Textarea {...aria} rows={3} value={rationale} onChange={(event) => setRationale(event.target.value)} placeholder="The two records use the same handle and are supported by independent observations." />}</Field>
        <Failure error={propose.error} />
        <Button type="submit" intent="primary" disabled={!aliasRecordId || !canonicalRecordId || !rationale.trim()} loading={propose.isPending}>Create review proposal</Button>
      </form> : mayWrite ? <Text size="sm" tone="tertiary">Create at least two unresolved research records before proposing a resolution.</Text> : null}
      {resolutionsError ? <Failure error={resolutionsError} /> : null}
      {selected ? <ResolutionReview resolution={selected} aliasName={recordName(selected.alias_record_id)} canonicalName={recordName(selected.canonical_record_id)} mayWrite={mayWrite} review={review} reject={reject} reverse={reverse} /> : null}
      {resolutions.length ? <div className={s.eventList}>{resolutions.map((resolution) => <button type="button" key={resolution.resolution_id} className={resolution.resolution_id === selectedId ? `${s.eventCardSelect} ${s.eventCardActive}` : s.eventCardSelect} onClick={() => setSelectedId(resolution.resolution_id)}><span className={s.eventMeta}><Badge tone={resolution.state === "accepted" ? "accent" : resolution.state === "rejected" ? "neutral" : "warn"}>{resolution.state}</Badge><span className={s.muted}>{dateLabel(resolution.proposed_at)} · {resolution.proposed_by === shell?.me.account_id ? "You" : resolution.proposed_by}</span></span><strong className={s.eventTitle}>{recordName(resolution.alias_record_id)} <span className={s.muted}>→</span> {recordName(resolution.canonical_record_id)}</strong><span className={s.body}>{resolution.rationale}</span></button>)}</div> : <Text size="sm" tone="tertiary">No identity-resolution proposals have been recorded.</Text>}
      <MoreButton available={more} pending={morePending} load={loadMore} />
    </div>
  </Panel>;
}

function ResolutionReview({ resolution, aliasName, canonicalName, mayWrite, review, reject, reverse }: { resolution: ResearchResolution; aliasName: string; canonicalName: string; mayWrite: boolean; review: ReturnType<typeof useResearchWrite<ResearchResolution>>; reject: ReturnType<typeof useResearchWrite<ResearchResolution>>; reverse: ReturnType<typeof useResearchWrite<ResearchResolution>> }) {
  return <article className={s.observation}><div className={s.eventMeta}><Badge tone={resolution.state === "accepted" ? "accent" : resolution.state === "rejected" ? "neutral" : "warn"}>{resolution.state}</Badge><Text size="xs" tone="tertiary">Resolution preview</Text></div><Text size="sm"><strong>{aliasName}</strong> will be treated as an alias of <strong>{canonicalName}</strong>.</Text><Text size="xs" tone="tertiary">The alias record remains preserved. Existing connection endpoints and citations are not rewritten. The canonical record gains {resolution.added_observation_ids.length || "no"} citation{resolution.added_observation_ids.length === 1 ? "" : "s"} on acceptance; reversal removes only citations introduced by this decision.</Text><Text size="sm">{resolution.rationale}</Text>{mayWrite && resolution.state === "proposed" ? <div className={s.row}><Button type="button" intent="primary" loading={review.isPending} onClick={() => review.mutate()}>Confirm resolution</Button><Button type="button" intent="ghost" loading={reject.isPending} onClick={() => reject.mutate()}>Reject proposal</Button></div> : null}{mayWrite && resolution.state === "accepted" ? <Button type="button" intent="ghost" loading={reverse.isPending} onClick={() => reverse.mutate()}>Reverse resolution</Button> : null}<Failure error={review.error ?? reject.error ?? reverse.error} /></article>;
}

function RecordCard({ record, active, evidence, workspace, shell, select }: { record: ResearchRecord; active: boolean; evidence: Evidence[]; workspace: string; shell?: ReturnType<typeof useContext>["shell"]; select: () => void }) {
  return <article className={active ? `${s.eventCard} ${s.eventCardActive}` : s.eventCard}>
    <button type="button" className={s.eventCardSelect} onClick={select}>
      <span className={s.eventMeta}><Badge tone="neutral">{kindLabels[record.kind]}</Badge><span className={s.muted}>{authorLabel(record.updated_by, shell)} · {dateLabel(record.updated_at)}</span></span>
      <strong className={s.eventTitle}>{record.name}</strong>
      {record.description ? <span className={s.body}>{record.description}</span> : null}
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
  const body: WriteResearchRecord = { kind, name, description, observation_ids: observationIds };
  const save = useResearchWrite(() => record ? updateResearchRecordAction(workspace, record.record_id, body) : createResearchRecordAction(workspace, body), [keys.records.all(workspace)], saved);

  if (!mayWrite) return record ? <RecordDetail record={record} evidence={evidence} workspace={workspace} shell={shell} error={evidenceError} /> : <Text size="sm" tone="tertiary">This investigation is read-only. Existing records remain visible, but new records require write access.</Text>;

  return <form className={s.eventEditor} onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
    {promotion ? <Text size="sm" tone="accent">{promotion.fromRecordId ? "The first record is saved. Review the second record before a proposed connection is opened." : `This is a reviewable ${connectionKindLabels[promotion.relationship.kind].toLowerCase()} hypothesis. Verify both records before creating any connection.`}{initialObservationIds.length ? <> Using {initialObservationIds.length} supporting observation{initialObservationIds.length === 1 ? "" : "s"}.</> : null}</Text> : initialObservationIds.length || initialCandidate ? <Text size="sm" tone="accent">Started from a review candidate{initialObservationIds.length ? <> using {initialObservationIds.length} supporting observation{initialObservationIds.length === 1 ? "" : "s"}</> : null}. Verify the suggested fields and citation before saving.</Text> : null}
    <Field label="Record type" required>{(aria) => <select {...aria} className={s.select} value={kind} onChange={(event) => setKind(event.target.value as ResearchRecordKind)}>{Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}</Field>
    <Field label="Name" hint="Use the wording currently supported by the investigation; do not imply a resolved identity." required>{(aria) => <Input {...aria} value={name} onChange={(event) => setName(event.target.value)} placeholder="A working name or handle" />}</Field>
    <Field label="Description" hint="Explain what this record refers to and what remains uncertain.">{(aria) => <Textarea {...aria} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="A qualified description grounded in the cited observations." />}</Field>
    <CitationPicker workspace={workspace} label="Cited observations" selected={observationIds} evidence={evidence} setSelected={setObservationIds} error={evidenceError} max={12} hasNext={evidenceHasNext} fetchingNext={evidenceFetchingNext} fetchMore={fetchMoreEvidence} returnTo={investigationPath(workspace, "records")} />
    <Failure error={save.error} />
    {save.isSuccess ? <Text size="sm" tone="accent" role="status">Record saved.</Text> : null}
    <div className={s.row}><Button type="submit" intent="primary" loading={save.isPending}>{record ? "Update record" : "Save record"}</Button>{record ? <Text size="xs" tone="tertiary">Last updated by {authorLabel(record.updated_by, shell)}</Text> : null}</div>
  </form>;
}

function RecordDetail({ record, evidence, workspace, shell, error }: { record: ResearchRecord; evidence: Evidence[]; workspace: string; shell?: ReturnType<typeof useContext>["shell"]; error: Error | null }) {
  return <div className={s.stack}>
    <div className={s.eventMeta}><Badge tone="neutral">{kindLabels[record.kind]}</Badge><span className={s.muted}>Updated by {authorLabel(record.updated_by, shell)} · {dateLabel(record.updated_at)}</span></div>
    <Text size="sm" className={s.eventTitle}>{record.name}</Text>
    {record.description ? <Text size="sm" tone="tertiary">{record.description}</Text> : <Text size="sm" tone="tertiary">No description recorded.</Text>}
    <CitationLinks ids={record.observation_ids} evidence={evidence} workspace={workspace} error={error} returnTo={recordHref(workspace, record.record_id)} />
  </div>;
}

function CitationLinks({ ids, evidence, workspace, error, returnTo }: { ids: string[]; evidence: Evidence[]; workspace: string; error: Error | null; returnTo?: string }) {
  if (!ids.length) return <Text size="sm" tone="tertiary">No cited observations attached.</Text>;
  return <div className={s.stack}><Text size="xs" tone="tertiary">Cited observations</Text>{error ? <Failure error={error} /> : ids.map((id) => {
    const found = evidence.find((one) => one.observation_id === id);
    return found ? <Link key={id} className={s.inlineLink} href={sourceHref(workspace, found.source_id, found.capture_id, found.observation_id, returnTo)}>{found.source_title}: {found.statement}</Link> : <Text key={id} size="xs" tone="tertiary">Citation {id}</Text>;
  })}</div>;
}
