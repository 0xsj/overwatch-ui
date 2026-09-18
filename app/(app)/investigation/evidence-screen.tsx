"use client";

import Link from "next/link";
import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Badge, Panel } from "@/components/display";
import { Button, Field, Input, Textarea } from "@/components/forms";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import { filterLoadedRows } from "@/lib/query/filter";
import type { Evidence, EvidenceRelation, EvidenceSynthesis, RelationKind, SynthesisCandidate } from "@/lib/services/review";
import { researchRecordCandidates, synthesisText, type ResearchRecordCandidate } from "@/lib/services/research-records/candidates";
import { recordHref } from "@/lib/services/research-records/navigation";
import { mayWriteResearch } from "../_route-context";
import { PageHead } from "../_components/page-head";
import { Query, useContext } from "../_hooks";
import { evidenceByIDsQuery, evidenceQuery, evidenceRelationsQuery, evidenceSynthesesQuery } from "../_queries";
import { createEvidenceSynthesisAction, setEvidenceRelationAction } from "./_actions";
import { authorLabel, dateLabel, Failure, MoreButton, investigationPath, sourceHref, useResearchWrite } from "./_shared";
import s from "./investigation.module.css";

const relationLabels: Record<RelationKind, string> = {
  supports: "Supports",
  contradicts: "Contradicts",
  repeats: "Repeats",
  unresolved: "Unresolved",
};

export function EvidenceScreen({ workspace }: { workspace: string }) {
  const { shell } = useContext();
  const mayWrite = mayWriteResearch(shell?.context?.workspace);
  const evidence = useInfiniteQuery({
    queryKey: keys.evidence.list(workspace),
    queryFn: ({ pageParam }) => evidenceQuery(workspace, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });
  const relations = useInfiniteQuery({
    queryKey: keys.evidence.relations(workspace),
    queryFn: ({ pageParam }) => evidenceRelationsQuery(workspace, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });
  const syntheses = useInfiniteQuery({
    queryKey: keys.evidence.syntheses(workspace),
    queryFn: ({ pageParam }) => evidenceSynthesesQuery(workspace, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });
  const rows = evidence.data?.pages.flatMap((page) => page.items) ?? [];
  const relationRows = relations.data?.pages.flatMap((page) => page.items) ?? [];
  const synthesisHistory = syntheses.data?.pages.flatMap((page) => page.items) ?? [];
  const [filter, setFilter] = useState("");
  const visibleRows = filterLoadedRows(rows, filter, (row) => [row.observation_id, row.source_id, row.source_title, row.statement, row.quote, row.capture_id]);
  const [selected, setSelected] = useState<string[]>([]);
  const [synthesisSelected, setSynthesisSelected] = useState<string[]>([]);
  const selectedRows = selected.map((id) => rows.find((row) => row.observation_id === id)).filter((row): row is Evidence => Boolean(row));
  const synthesisRows = synthesisSelected.map((id) => rows.find((row) => row.observation_id === id)).filter((row): row is Evidence => Boolean(row));
  const selectedRelation = selectedRows.length === 2
    ? relationRows.find((relation) => samePair(relation, selectedRows[0].observation_id, selectedRows[1].observation_id))
    : undefined;

  function toggle(id: string) {
    setSelected((current) => current.includes(id)
      ? current.filter((one) => one !== id)
      : current.length >= 2 ? [current[1], id] : [...current, id]);
  }

  return <>
    <PageHead title="Evidence review">Review cited observations together without merging them. Record what the pair supports, contradicts, repeats, or leaves unresolved.</PageHead>
    <div className={s.readerColumns}>
      <Panel title="Cited observations" note={rows.length ? rows.length + " loaded" : undefined}>
        <Query of={evidence} label="cited observations">{() => <div className={s.stack}>
          {!rows.length ? (
            <div className={s.empty}>
              <Text size="sm">No cited observations yet.</Text>
              <Text size="sm" tone="tertiary">Open a captured source and record a precise observation before reviewing relationships.</Text>
              <Button asChild intent="ghost"><Link href={investigationPath(workspace, "sources")}>Open sources</Link></Button>
            </div>
          ) : (
            <div className={s.stack}>
              <Input aria-label="Filter cited observations" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter loaded observations" />
              <Text size="xs" tone="tertiary">Showing {visibleRows.length} of {rows.length} loaded observation{rows.length === 1 ? "" : "s"}.</Text>
              {visibleRows.length ? <div className={s.evidenceList}>
                {visibleRows.map((row) => <EvidenceCard key={row.observation_id} row={row} workspace={workspace} selected={selected.includes(row.observation_id)} select={() => toggle(row.observation_id)} synthesisSelected={synthesisSelected.includes(row.observation_id)} toggleSynthesis={() => setSynthesisSelected((current) => current.includes(row.observation_id) ? current.filter((one) => one !== row.observation_id) : current.length >= 6 ? [...current.slice(1), row.observation_id] : [...current, row.observation_id])} />)}
              </div> : <Text size="sm" tone="tertiary">No loaded observations match. Clear the filter or load more.</Text>}
            </div>
          )}
          <MoreButton available={evidence.hasNextPage} pending={evidence.isFetchingNextPage} load={() => void evidence.fetchNextPage()} />
        </div>}</Query>
      </Panel>
      <div className={s.stack}>
        <Panel title="Compare observations" note="Select two cited observations">
          <Query of={relations} label="review decisions">{() => <ComparisonPanel key={selectedRows.map((row) => row.observation_id).join(":") + ":" + (selectedRelation?.relation_id ?? "new")} workspace={workspace} rows={selectedRows} relation={selectedRelation} relations={relationRows} mayWrite={mayWrite} shell={shell} />}</Query>
        </Panel>
        <Panel title="Assisted synthesis" note="Select up to six observations">
          <SynthesisPanel workspace={workspace} rows={synthesisRows} mayWrite={mayWrite} saved={synthesisHistory} historyError={syntheses.error} moreAvailable={syntheses.hasNextPage} morePending={syntheses.isFetchingNextPage} loadMore={() => void syntheses.fetchNextPage()} />
        </Panel>
      </div>
    </div>
  </>;
}

function EvidenceCard({ row, workspace, selected, select, synthesisSelected, toggleSynthesis }: { row: Evidence; workspace: string; selected: boolean; select: () => void; synthesisSelected: boolean; toggleSynthesis: () => void }) {
  return <article className={selected ? s.evidenceCard + " " + s.evidenceCardSelected : s.evidenceCard}>
    <div className={s.row}>
      <Badge tone="neutral">{row.source_title}</Badge>
      <span className={s.muted}>{dateLabel(row.recorded_at)}</span>
    </div>
    <Text size="sm" className={s.evidenceStatement}>{row.statement}</Text>
    <blockquote className={s.quote}>{row.quote}</blockquote>
    <div className={s.row}>
      <Button type="button" size="sm" intent={selected ? "primary" : "ghost"} onClick={select}>{selected ? "Selected" : "Select for comparison"}</Button>
      <Button type="button" size="sm" intent={synthesisSelected ? "primary" : "ghost"} onClick={toggleSynthesis}>{synthesisSelected ? "In synthesis" : "Add to synthesis"}</Button>
      <Link className={s.inlineLink} href={sourceHref(workspace, row.source_id, row.capture_id, row.observation_id, investigationPath(workspace, "evidence"))}>Open citation</Link>
    </div>
  </article>;
}

const autoSynthesis = "__auto__";

function SynthesisPanel({ workspace, rows, mayWrite, saved, historyError, moreAvailable, morePending, loadMore }: { workspace: string; rows: Evidence[]; mayWrite: boolean; saved: EvidenceSynthesis[]; historyError: Error | null; moreAvailable: boolean; morePending: boolean; loadMore: () => void }) {
  const currentIDs = rows.map((row) => row.observation_id);
  const selectionKey = currentIDs.join(":");
  const [synthesisView, setSynthesisView] = useState({ key: "", id: autoSynthesis });
  const selectedSynthesis = synthesisView.key === selectionKey ? synthesisView.id : autoSynthesis;
  const exactSaved = rows.length ? saved.find((one) => sameIDs(one.observation_ids, rows.map((row) => row.observation_id))) : undefined;
  const automatic = exactSaved ?? (!rows.length ? saved[0] : undefined);
  const selected = selectedSynthesis === autoSynthesis ? automatic : saved.find((one) => one.synthesis_id === selectedSynthesis);
  const selectedMatches = Boolean(selected && sameIDs(selected.observation_ids, currentIDs));
  const candidates = selected?.candidates ?? researchRecordCandidates(rows);
  const citationIDs = selected?.observation_ids ?? currentIDs;
  const visibleCitations = citationIDs.map((id) => rows.find((row) => row.observation_id === id)).filter((row): row is Evidence => Boolean(row));
  const needsCitationHydration = Boolean(selected && visibleCitations.length < citationIDs.length);
  const citationQuery = useQuery({
    queryKey: keys.evidence.synthesisEvidence(workspace, selected?.synthesis_id ?? "preview"),
    queryFn: () => evidenceByIDsQuery(workspace, citationIDs),
    enabled: needsCitationHydration,
  });
  const citations = citationQuery.data ?? visibleCitations;
  const save = useResearchWrite(
    () => createEvidenceSynthesisAction(workspace, rows.map((row) => row.observation_id)),
    [keys.evidence.syntheses(workspace)],
  );
  if (!rows.length && !selected) return <div className={s.empty}><Failure error={historyError} /><Text size="sm">Choose observations to synthesize.</Text><Text size="sm" tone="tertiary">This review-only pass keeps the selected statements and exact identifiers visible; it does not create records or conclusions.</Text></div>;
  return <div className={s.stack}>
    <Failure error={historyError} />
    {saved.length ? <label className={s.row}><Text as="span" size="sm">Saved run</Text><select aria-label="Saved synthesis run" className={s.select} value={selectedSynthesis} onChange={(event) => setSynthesisView({ key: selectionKey, id: event.target.value })}><option value={autoSynthesis}>{exactSaved ? "Current selection · saved" : rows.length ? "Current selection · preview" : "Latest saved run"}</option>{saved.map((one) => <option key={one.synthesis_id} value={one.synthesis_id}>{dateLabel(one.created_at)} · {one.observation_ids.length} observation{one.observation_ids.length === 1 ? "" : "s"}{one.synthesis_id === exactSaved?.synthesis_id ? " · current" : ""}</option>)}</select></label> : null}
    <MoreButton available={moreAvailable} pending={morePending} load={loadMore} />
    <Text size="sm" tone="tertiary">{selected ? `Saved ${selected.provider} review pass (${selected.method}) from ${dateLabel(selected.created_at)}${selectedMatches ? "." : ` over ${selected.observation_ids.length} other selected observation${selected.observation_ids.length === 1 ? "" : "s"}.`}` : `Local review pass over ${rows.length} selected observation${rows.length === 1 ? "" : "s"}. The text below is a working aid, not an asserted conclusion.`}</Text>
    {!selectedMatches && selected && rows.length ? <Text size="xs" tone="tertiary">This is a historical run. Choose its observations above to align the current selection, or save a new synthesis for the observations currently selected.</Text> : null}
    <pre className={s.quote}>{selected?.output ?? synthesisText(rows)}</pre>
    <SynthesisCitations workspace={workspace} ids={citationIDs} rows={citations} error={citationQuery.error} />
    <Text size="sm">Candidate records</Text>
    {candidates.length ? <div className={s.stack}>{candidates.map((candidate) => <CandidateCard key={`${candidate.kind}:${candidate.name}`} workspace={workspace} candidate={candidate} evidence={citations} mayWrite={mayWrite} />)}</div> : <Text size="sm" tone="tertiary">No exact account-shaped identifiers were found. Create a record manually when the material supports one.</Text>}
    {mayWrite && rows.length ? <form onSubmit={(event) => { event.preventDefault(); save.mutate(); }}><Failure error={save.error} /><Button type="submit" intent="primary" loading={save.isPending}>{selected ? "Save another synthesis" : "Save synthesis"}</Button></form> : null}
    {!mayWrite ? <Text size="xs" tone="tertiary">This investigation is read-only. Saved synthesis runs remain visible, but new runs require write access.</Text> : null}
  </div>;
}

function SynthesisCitations({ workspace, ids, rows, error }: { workspace: string; ids: string[]; rows: Evidence[]; error: Error | null }) {
  if (!ids.length) return null;
  const byID = new Map(rows.map((row) => [row.observation_id, row]));
  return <div className={s.details}><Text size="sm">Exact supporting observations</Text><Text size="xs" tone="tertiary">These retained citations are the evidence set supplied to this synthesis run.</Text>{error ? <Failure error={error} /> : null}<div className={s.stack}>{ids.map((id) => {
    const row = byID.get(id);
    if (!row) return <Text key={id} size="xs" tone="tertiary">Observation {id} could not be resolved.</Text>;
    return <article key={id} className={s.observation}><div className={s.eventMeta}><Link href={sourceHref(workspace, row.source_id, row.capture_id, row.observation_id, investigationPath(workspace, "evidence"))} className={s.inlineLink}>{row.source_title}</Link><span className={s.muted}>Observation {row.observation_id}</span></div><Text size="sm" className={s.evidenceStatement}>{row.statement}</Text><blockquote className={s.quote}>{row.quote}</blockquote><Text size="xs" tone="tertiary">Capture {row.capture_id} · recorded {dateLabel(row.recorded_at)}</Text></article>;
  })}</div></div>;
}

function CandidateCard({ workspace, candidate, evidence, mayWrite }: { workspace: string; candidate: ResearchRecordCandidate | SynthesisCandidate; evidence: Evidence[]; mayWrite: boolean }) {
  return <article className={s.observation}><div className={s.eventMeta}><Badge tone="warn">candidate</Badge><Text size="sm">{candidate.name}</Text></div><Text size="xs" tone="tertiary">{candidate.rationale}</Text><Text size="xs" tone="tertiary">Supported by {candidate.observation_ids.length} selected observation{candidate.observation_ids.length === 1 ? "" : "s"}.</Text><CandidateSupport workspace={workspace} ids={candidate.observation_ids} evidence={evidence} />{mayWrite ? <Link className={s.inlineLink} href={recordHref(workspace, candidate.observation_ids, { kind: candidate.kind, name: candidate.name, description: candidate.rationale }, undefined, investigationPath(workspace, "evidence"))}>Review as research record</Link> : null}</article>;
}

function CandidateSupport({ workspace, ids, evidence }: { workspace: string; ids: string[]; evidence: Evidence[] }) {
  const byID = new Map(evidence.map((row) => [row.observation_id, row]));
  return <div className={s.details}><Text size="xs" tone="tertiary">Supporting citations</Text><div className={s.questionLinks}>{ids.map((id) => {
    const row = byID.get(id);
    return row
      ? <Link key={id} className={s.inlineLink} href={sourceHref(workspace, row.source_id, row.capture_id, row.observation_id, investigationPath(workspace, "evidence"))}>{row.source_title}: {row.statement}</Link>
      : <Text key={id} size="xs" tone="tertiary">Observation {id} could not be resolved.</Text>;
  })}</div></div>;
}

function sameIDs(left: string[], right: string[]) {
  return left.length === right.length && left.every((one, index) => one === right[index]);
}

function ComparisonPanel({ workspace, rows, relation, relations, mayWrite, shell }: {
  workspace: string;
  rows: Evidence[];
  relation?: EvidenceRelation;
  relations: EvidenceRelation[];
  mayWrite: boolean;
  shell?: ReturnType<typeof useContext>["shell"];
}) {
  const [kind, setKind] = useState<RelationKind>(relation?.kind ?? "unresolved");
  const [rationale, setRationale] = useState(relation?.rationale ?? "");
  const save = useResearchWrite(
    () => setEvidenceRelationAction(workspace, {
      left_observation_id: rows[0]?.observation_id ?? "",
      right_observation_id: rows[1]?.observation_id ?? "",
      kind,
      rationale,
    }),
    [keys.evidence.all(workspace), keys.evidence.relations(workspace)],
  );

  if (rows.length < 2) {
    return <div className={s.empty}><Text size="sm">Choose two observations.</Text><Text size="sm" tone="tertiary">The comparison is deliberately human-led: select a pair, then explain the relationship in your own words.</Text></div>;
  }
  return <div className={s.stack}>
    <div className={s.comparisonPair}>
      {rows.map((row) => <div key={row.observation_id} className={s.comparisonItem}><span className={s.muted}>{row.source_title}</span><Text size="sm">{row.statement}</Text></div>)}
    </div>
    {relation ? <Text size="xs" tone="tertiary">Last reviewed by {authorLabel(relation.author, shell)} · {dateLabel(relation.updated_at)}</Text> : null}
    {mayWrite ? <form className={s.stack} onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
      <Field label="Decision" required>{(aria) => <select {...aria} className={s.select} value={kind} onChange={(event) => setKind(event.target.value as RelationKind)}>
        {Object.entries(relationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>}</Field>
      <Field label="Rationale" hint="Keep the comparison specific to these two citations." required>{(aria) => <Textarea {...aria} value={rationale} onChange={(event) => setRationale(event.target.value)} placeholder="What does this pair show, and what does it not show?" />}</Field>
      <Failure error={save.error} />
      {save.isSuccess ? <Text size="sm" tone="accent" role="status">Review decision saved.</Text> : null}
      <Button type="submit" intent="primary" loading={save.isPending}>{relation ? "Update decision" : "Save decision"}</Button>
    </form> : <Text size="sm" tone="tertiary">This investigation is read-only. Existing decisions remain visible, but new review decisions require write access.</Text>}
    {relations.length ? <div className={s.details}><Text size="xs" tone="tertiary">{relations.length} decision{relations.length === 1 ? "" : "s"} recorded in this investigation.</Text></div> : null}
  </div>;
}

function samePair(relation: EvidenceRelation, left: string, right: string) {
  return (relation.left_observation_id === left && relation.right_observation_id === right)
    || (relation.left_observation_id === right && relation.right_observation_id === left);
}
