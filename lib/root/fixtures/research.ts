import { AppError } from "@/lib/kernel";
import { bearerOf, type MemoryRequest, type MemoryRoute } from "@/lib/http";
import type { AddObservation, AddSource, ArtifactCleanupCandidate, ArtifactCleanupReview, ArtifactCleanupReviewSummary, ArtifactCleanupSweepRun, ArtifactLifecycleStatus, Capture, CitationContext, CitationShare, ConfigureSourceWatch, CreateSourceIntake, ManualObservation, MediaType, RetentionQueueState, ReviewSourceIntake, SetSourceDuplicatePolicy, SetSourcePrivacy, SetSourcePublication, SetSourceRetention, SourceAlert, SourceAlertDelivery, SourceAlertDeliveryInput, SourceExtraction, SourceIntakeCandidate, SourceRetentionReview, SourceSearchResult, SourceSummary, SourceWatch, SourceWatchRunResult, TextCapture } from "@/lib/services/sources";
import type { NoteContext, WorkingNote, WorkingNotePage } from "@/lib/services/notes";
import type { BoardReviewState, Evidence, EvidenceBoardItem, EvidenceCluster, EvidenceClusterCoverage, EvidenceComparison, EvidenceComparisonFinding, EvidenceQuestionSuggestionGap, EvidenceQuestionSuggestions, EvidenceRelation, EvidenceSourceLink, EvidenceSynthesis, QuestionSuggestionGapKind, RelationKind, SetEvidenceRelation, SetEvidenceSourceLink, WriteEvidenceCluster } from "@/lib/services/review";
import type { InvestigationQuestion, QuestionState, WriteQuestion } from "@/lib/services/questions";
import type { AssistanceDetail, AssistanceProposal, AssistanceProviderPolicy, AssistanceProviderRun } from "@/lib/services/assistance";
import type { EventAccount, EventAccountPage, EventCluster, EventClusterPage, EventParticipantLink, EventParticipantRole, EventRecordSnapshot, EventRelationship, EventRelationshipPage, EventReconciliation, TimelineEvent, TimelineEventRevision, EventTimePrecision, WriteEvent } from "@/lib/services/events";
import { renderBriefRecipientHandoffMarkdown } from "@/lib/services/brief/export";
import type { BriefDraft, BriefDraftChange, BriefHandoffExport, BriefHandoffShare, BriefRecipientHandoff, BriefSnapshot, BriefSnapshotComment, BriefSnapshotReview, BriefSnapshotReviewDecision, WorkingBrief, WriteBrief } from "@/lib/services/brief";
import type { AuditEntry, AuditPage } from "@/lib/services/ledger";
import type { PlaceGeometry, PlacePrecision, ResearchRecord, ResearchRecordKind, WriteResearchRecord } from "@/lib/services/research-records";
import type { ResearchConnection, ResearchConnectionKind, ResearchConnectionReview, ResearchConnectionRevision, ResearchConnectionReviewFilter, ResearchConnectionReviewFlags, ResearchConnectionState, WriteResearchConnection } from "@/lib/services/research-connections";
import type { ResearchResolution, ResearchResolutionDecision } from "@/lib/services/research-resolutions";
import type { ResearchResolutionSet, ResearchResolutionSetDecision } from "@/lib/services/research-resolution-sets";
import { researchRecordCandidates, synthesisText } from "@/lib/services/research-records/candidates";
import { clusterCoverage, questionGap, recordCoverage } from "@/lib/services/review/coverage";
import { quoteOccurrences } from "@/lib/services/sources/citation";
import { textOccurrences } from "@/lib/services/sources/search";
import { PERSONAS, personaFromToken } from "./personas";
import { ROLE_CEILING, GRANT_LADDER } from "@/lib/services/tenancy";
import { workspacesFor } from "./tenancy";

type Store = {
  sources: Map<string, SourceSummary>;
  watches: Map<string, SourceWatch>;
  alerts: Map<string, SourceAlert>;
  alertSeen: Map<string, string>;
  alertDelivery: Map<string, SourceAlertDelivery>;
  intakeCandidates: Map<string, SourceIntakeCandidate[]>;
  intakeContent: Map<string, { media_type: MediaType; content?: string; content_base64?: string }>;
  captures: Map<string, Capture[]>;
  extractions: Map<string, SourceExtraction[]>;
  observations: Map<string, ManualObservation[]>;
  citationShares: Map<string, CitationShare[]>;
  notes: Map<string, WorkingNote[]>;
  relations: Map<string, EvidenceRelation[]>;
  sourceLinks: Map<string, EvidenceSourceLink[]>;
  clusters: Map<string, EvidenceCluster[]>;
  syntheses: Map<string, EvidenceSynthesis[]>;
  comparisons: Map<string, EvidenceComparison[]>;
  questionSuggestions: Map<string, EvidenceQuestionSuggestions[]>;
  questions: Map<string, InvestigationQuestion[]>;
  assistance: Map<string, AssistanceDetail>;
  assistancePolicies: Map<string, AssistanceProviderPolicy>;
  events: Map<string, TimelineEvent[]>;
  eventRevisions: Map<string, TimelineEventRevision[]>;
  eventAccounts: Map<string, EventAccount[]>;
  eventReconciliations: Map<string, EventReconciliation>;
  eventClusters: Map<string, EventCluster[]>;
  eventRelationships: Map<string, EventRelationship[]>;
  briefs: Map<string, WorkingBrief | null>;
  briefDrafts: Map<string, BriefDraft[]>;
  snapshots: Map<string, BriefSnapshot[]>;
  handoffShares: Map<string, BriefHandoffShare[]>;
  handoffActivity: Map<string, AuditEntry[]>;
  snapshotReviews: Map<string, BriefSnapshotReview>;
  snapshotComments: Map<string, BriefSnapshotComment[]>;
  records: Map<string, ResearchRecord[]>;
  connections: Map<string, ResearchConnection[]>;
  connectionReviews: Map<string, ResearchConnectionReview[]>;
  revisions: Map<string, ResearchConnectionRevision[]>;
  resolutions: Map<string, ResearchResolution[]>;
  resolutionSets: Map<string, ResearchResolutionSet[]>;
  cleanedRefs: Set<string>;
  cleanupRuns: Map<string, ArtifactCleanupSweepRun[]>;
  cleanupReviews: Map<string, ArtifactCleanupReview>;
  cleanupReviewHistory: Map<string, ArtifactCleanupReview[]>;
  sequence: number;
};
const fixtureGlobal = globalThis as typeof globalThis & { __owFixtureResearch?: Store };
const store: Store = fixtureGlobal.__owFixtureResearch ??= {
  sources: new Map(), watches: new Map(), alerts: new Map(), alertSeen: new Map(), alertDelivery: new Map(), intakeCandidates: new Map(), intakeContent: new Map(), captures: new Map(), extractions: new Map(), observations: new Map(), citationShares: new Map(), notes: new Map(), relations: new Map(), sourceLinks: new Map(), clusters: new Map(), syntheses: new Map(), comparisons: new Map(), questionSuggestions: new Map(), questions: new Map(), assistance: new Map(), assistancePolicies: new Map(), events: new Map(), eventRevisions: new Map(), eventAccounts: new Map(), eventReconciliations: new Map(), eventClusters: new Map(), eventRelationships: new Map(), briefs: new Map(), briefDrafts: new Map(), snapshots: new Map(), handoffShares: new Map(), handoffActivity: new Map(), snapshotReviews: new Map(), snapshotComments: new Map(), records: new Map(), connections: new Map(), connectionReviews: new Map(), revisions: new Map(), resolutions: new Map(), resolutionSets: new Map(), cleanedRefs: new Set(), cleanupRuns: new Map(), cleanupReviews: new Map(), cleanupReviewHistory: new Map(), sequence: 0,
};
store.watches ??= new Map();
store.alerts ??= new Map();
store.alertSeen ??= new Map();
store.alertDelivery ??= new Map();
store.intakeCandidates ??= new Map();
store.intakeContent ??= new Map();
store.extractions ??= new Map();
store.citationShares ??= new Map();
store.relations ??= new Map();
store.sourceLinks ??= new Map();
store.clusters ??= new Map();
store.syntheses ??= new Map();
store.comparisons ??= new Map();
store.questionSuggestions ??= new Map();
store.questions ??= new Map();
store.assistance ??= new Map();
store.assistancePolicies ??= new Map();
store.events ??= new Map();
store.eventRevisions ??= new Map();
store.eventAccounts ??= new Map();
store.eventReconciliations ??= new Map();
store.eventClusters ??= new Map();
store.eventRelationships ??= new Map();
store.briefs ??= new Map();
store.briefDrafts ??= new Map();
store.snapshots ??= new Map();
store.handoffShares ??= new Map();
store.handoffActivity ??= new Map();
store.snapshotReviews ??= new Map();
store.snapshotComments ??= new Map();
store.records ??= new Map();
store.connections ??= new Map();
store.connectionReviews ??= new Map();
store.revisions ??= new Map();
store.resolutions ??= new Map();
store.resolutionSets ??= new Map();
store.cleanedRefs ??= new Set();
store.cleanupRuns ??= new Map();
store.cleanupReviews ??= new Map();
store.cleanupReviewHistory ??= new Map();
const invalid = (message: string) => new AppError({ kind: "invalid", status: 400, message });
const missing = () => new AppError({ kind: "not_found", status: 404, message: "not found" });
const bytes = (value: string) => new TextEncoder().encode(value).length;
const isTextCapture = (capture: Capture): capture is TextCapture => capture.content !== undefined;
function decodeBase64(value: unknown) {
  if (typeof value !== "string" || !value) throw invalid("Add binary content before saving.");
  try {
    const decoded = atob(value);
    return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
  } catch {
    throw invalid("Binary content must be valid base64.");
  }
}
const nextId = () => {
  const time = Date.now().toString(16).padStart(12, "0");
  return `${time.slice(0, 8)}-${time.slice(8)}-7000-8000-${(++store.sequence).toString(16).padStart(12, "0")}`;
};

function recordHandoffActivity(snapshotId: string, workspace: string, action: string, actor: string, detail: Record<string, unknown> = {}) {
  const entry: AuditEntry = {
    id: nextId(),
    scope: "workspace",
    action,
    subject: `workspace:${workspace}`,
    actor: `user:${actor}`,
    correlation_id: nextId(),
    detail: { snapshot_id: snapshotId, ...detail },
    occurred_at: new Date().toISOString(),
  };
  store.handoffActivity.set(snapshotId, [entry, ...(store.handoffActivity.get(snapshotId) ?? [])]);
}

function resolutionImpact(workspace: string, resolutionId: string) {
  const resolution = (store.resolutions.get(workspace) ?? []).find((one) => one.resolution_id === resolutionId);
  if (!resolution) throw missing();
  const recordIDs = new Set([resolution.alias_record_id, resolution.canonical_record_id]);
  const records = store.records.get(workspace) ?? [];
  const recordName = (id: string) => records.find((one) => one.record_id === id)?.name ?? id;
  const connections = (store.connections.get(workspace) ?? []).filter((one) => recordIDs.has(one.from_record_id) || recordIDs.has(one.to_record_id));
  const events = (store.events.get(workspace) ?? []).filter((one) => one.participant_record_ids.some((id) => recordIDs.has(id)) || (one.location_record_id ? recordIDs.has(one.location_record_id) : false));
  const connectionIDs = new Set(connections.map((one) => one.connection_id));
  const eventIDs = new Set(events.map((one) => one.event_id));
  const brief = store.briefs.get(workspace);
  const briefs = brief && (brief.connection_ids.some((id) => connectionIDs.has(id)) || brief.event_ids.some((id) => eventIDs.has(id))) ? [{ brief_id: brief.brief_id, title: brief.title, updated_at: brief.updated_at }] : [];
  const snapshots = (store.snapshots.get(workspace) ?? []).filter((snapshot) => snapshot.connections.some((one) => recordIDs.has(one.from_record_id) || recordIDs.has(one.to_record_id)) || snapshot.events.some((one) => one.participant_records.some((record) => recordIDs.has(record.record_id)) || (one.location_record ? recordIDs.has(one.location_record.record_id) : false)));
  return {
    connections: connections.map((one) => ({ connection_id: one.connection_id, from_record_id: one.from_record_id, from_record_name: recordName(one.from_record_id), to_record_id: one.to_record_id, to_record_name: recordName(one.to_record_id), kind: one.kind, state: one.state })),
    events: events.map((one) => ({ event_id: one.event_id, title: one.title, ...(one.sort_date ? { sort_date: one.sort_date } : {}) })),
    briefs,
    snapshots: snapshots.map((one) => ({ snapshot_id: one.snapshot_id, brief_id: one.brief_id, title: one.title, frozen_at: one.frozen_at })),
  };
}

function resolutionSetImpact(workspace: string, resolutionSetId: string) {
  const resolution = (store.resolutionSets.get(workspace) ?? []).find((one) => one.resolution_set_id === resolutionSetId);
  if (!resolution) throw missing();
  const recordIDs = new Set([...resolution.alias_record_ids, resolution.canonical_record_id]);
  const records = store.records.get(workspace) ?? [];
  const recordName = (id: string) => records.find((one) => one.record_id === id)?.name ?? id;
  const connections = (store.connections.get(workspace) ?? []).filter((one) => recordIDs.has(one.from_record_id) || recordIDs.has(one.to_record_id));
  const events = (store.events.get(workspace) ?? []).filter((one) => one.participant_record_ids.some((id) => recordIDs.has(id)) || (one.location_record_id ? recordIDs.has(one.location_record_id) : false));
  const connectionIDs = new Set(connections.map((one) => one.connection_id));
  const eventIDs = new Set(events.map((one) => one.event_id));
  const brief = store.briefs.get(workspace);
  const briefs = brief && (brief.connection_ids.some((id) => connectionIDs.has(id)) || brief.event_ids.some((id) => eventIDs.has(id))) ? [{ brief_id: brief.brief_id, title: brief.title, updated_at: brief.updated_at }] : [];
  const snapshots = (store.snapshots.get(workspace) ?? []).filter((snapshot) => snapshot.connections.some((one) => recordIDs.has(one.from_record_id) || recordIDs.has(one.to_record_id)) || snapshot.events.some((one) => one.participant_records.some((record) => recordIDs.has(record.record_id)) || (one.location_record ? recordIDs.has(one.location_record.record_id) : false)));
  return {
    connections: connections.map((one) => ({ connection_id: one.connection_id, from_record_id: one.from_record_id, from_record_name: recordName(one.from_record_id), to_record_id: one.to_record_id, to_record_name: recordName(one.to_record_id), kind: one.kind, state: one.state })),
    events: events.map((one) => ({ event_id: one.event_id, title: one.title, ...(one.sort_date ? { sort_date: one.sort_date } : {}) })),
    briefs,
    snapshots: snapshots.map((one) => ({ snapshot_id: one.snapshot_id, brief_id: one.brief_id, title: one.title, frozen_at: one.frozen_at })),
  };
}

function handoffActivityPage(snapshotId: string, facet?: string): AuditPage {
  const all = store.handoffActivity.get(snapshotId) ?? [];
  const entries = facet ? all.filter((entry) => entry.action.startsWith(`${facet}.`)) : all;
  const counts = new Map<string, number>();
  for (const entry of all) {
    const prefix = entry.action.split(".")[0] ?? entry.action;
    counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
  }
  return { entries, facets: counts.size ? [...counts].map(([facetName, total]) => ({ facet: facetName, total })) : undefined };
}

function cleanupCandidates(workspace: string) {
  const candidates: ArtifactCleanupCandidate[] = [];
  for (const source of [...store.sources.values()].filter((one) => one.workspace_id === workspace && one.purged_at)) {
    for (const capture of store.captures.get(source.source_id) ?? []) {
      const ref = `sha256:${capture.sha256}`;
      if (!store.cleanedRefs.has(ref)) candidates.push({ ref, kind: "source_capture", workspace_id: workspace, source_id: source.source_id, capture_id: capture.capture_id, bytes: capture.bytes, purged_at: source.purged_at!, created_at: capture.captured_at });
    }
    for (const extraction of store.extractions.get(source.source_id) ?? []) {
      if (!extraction.output_sha256) continue;
      const ref = `sha256:${extraction.output_sha256}`;
      if (!store.cleanedRefs.has(ref)) candidates.push({ ref, kind: "source_extraction", workspace_id: workspace, source_id: source.source_id, capture_id: extraction.capture_id, extraction_id: extraction.extraction_id, bytes: extraction.output_bytes, purged_at: source.purged_at!, created_at: extraction.created_at });
    }
  }
  return [...new Map(candidates.map((candidate) => [candidate.ref, candidate])).values()].sort((a, b) => a.purged_at.localeCompare(b.purged_at) || a.ref.localeCompare(b.ref));
}

function rememberCleanupReview(workspace: string, review: ArtifactCleanupReview) {
  const history = store.cleanupReviewHistory.get(workspace) ?? [];
  store.cleanupReviewHistory.set(workspace, [review, ...history.filter((item) => item.review_id !== review.review_id)].slice(0, 50));
}

function cleanupReviewSummary(review: ArtifactCleanupReview): ArtifactCleanupReviewSummary {
  return {
    review_id: review.review_id,
    workspace_id: review.workspace_id,
    created_by: review.created_by,
    updated_by: review.updated_by,
    status: review.status === "none" ? "open" : review.status,
    item_count: review.items.length,
    item_bytes: review.items.reduce((sum, item) => sum + item.bytes, 0),
    created_at: review.created_at,
    updated_at: review.updated_at,
    ...(review.completed_at ? { completed_at: review.completed_at } : {}),
    ...(review.sweep_id ? { sweep_id: review.sweep_id } : {}),
    ...(review.discarded_by ? { discarded_by: review.discarded_by } : {}),
    ...(review.discarded_at ? { discarded_at: review.discarded_at } : {}),
    ...(review.discard_reason ? { discard_reason: review.discard_reason } : {}),
  };
}

function caller(req: MemoryRequest, workspace: string) {
  const persona = personaFromToken(bearerOf(req));
  if (!persona) throw new AppError({ kind: "unauthenticated", status: 401, message: "not signed in" });
  const me = PERSONAS[persona].me;
  const own = me.orgs.flatMap((org) => workspacesFor(persona, org.org_id) ?? []).find((one) => one.workspace_id === workspace);
  if (!own || me.orgs.find((org) => org.org_id === own.org_id)?.role === "client") throw missing();
  if (req.method !== "GET") {
    if (own.closed) throw new AppError({ kind: "conflict", status: 409, message: "This investigation is closed. Reopen it before making changes." });
    if (own.access !== "write" && own.access !== "admin") throw new AppError({ kind: "forbidden", status: 403, message: "Write access is required." });
  }
  return me.account_id;
}

function recipientCaller(req: MemoryRequest, workspace: string) {
  const persona = personaFromToken(bearerOf(req));
  if (!persona) throw new AppError({ kind: "unauthenticated", status: 401, message: "not signed in" });
  const me = PERSONAS[persona].me;
  const own = me.orgs.flatMap((org) => workspacesFor(persona, org.org_id) ?? []).find((one) => one.workspace_id === workspace);
  if (!own || own.access === "none") throw missing();
  if (req.method !== "GET") throw new AppError({ kind: "not_found", status: 404, message: "not found" });
  return me.account_id;
}

function sourceIn(workspace: string, id: string) {
  const source = store.sources.get(id);
  if (!source || source.workspace_id !== workspace) throw missing();
  source.duplicate_policy ??= "warn";
  return source;
}

function watchIn(workspace: string, source: string): SourceWatch {
  const existing = store.watches.get(source);
  if (existing && existing.workspace_id === workspace) return existing;
  return { workspace_id: workspace, source_id: source, enabled: false, interval_seconds: 3600, last_status: "never" };
}

function intakeIn(workspace: string) {
  return store.intakeCandidates.get(workspace) ?? [];
}

function contentInput(content: unknown, media: unknown): { content: string; media: MediaType } {
  if (typeof content !== "string" || !content) throw invalid("Add the source text before saving.");
  if (bytes(content) > 262144) throw invalid("Source text must be 256 KiB or smaller.");
  if (media !== "text/plain" && media !== "text/html" && media !== "application/json") throw invalid("Choose plain text, HTML, or JSON.");
  if (media === "application/json") {
    try { JSON.parse(content); } catch { throw invalid("The imported text is not valid JSON."); }
  }
  return { content, media };
}

async function captureFor(source: SourceSummary, content: string, media_type: MediaType, author: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
  const all = store.captures.get(source.source_id) ?? [];
  const sha256 = Array.from(new Uint8Array(digest), (x) => x.toString(16).padStart(2, "0")).join("");
  if (source.duplicate_policy === "block" && all.some((one) => one.sha256 === sha256)) throw new AppError({ kind: "conflict", status: 409, message: "Capture bytes already exist for this source." });
  const capture: Capture = {
    capture_id: nextId(), source_id: source.source_id, version: all.length + 1,
    media_type, sha256,
    bytes: bytes(content), captured_by: author, captured_at: new Date().toISOString(), content,
  };
  store.captures.set(source.source_id, [capture, ...all]);
  const { content: _content, ...summary } = capture;
  source.latest_capture = summary;
  return summary;
}

function createSourceAlert(workspace: string, source: SourceSummary, author: string, kind: SourceAlert["kind"], capture?: Pick<Capture, "capture_id">) {
  const now = new Date().toISOString();
  if (kind === "capture_changed" && !capture) throw invalid("A changed source alert requires a capture.");
  const alertId = nextId();
  const alert: SourceAlert = {
    alert_id: alertId,
    workspace_id: workspace,
    source_id: source.source_id,
    ...(capture ? { capture_id: capture.capture_id } : {}),
    kind,
    title: kind === "capture_changed" ? "New monitored capture retained" : "Source monitoring failed",
    detail: kind === "capture_changed"
      ? "A monitored URL returned changed bytes and a new immutable capture was retained."
      : "The monitored URL could not be checked.",
    source_title: source.title,
    dedupe_key: `${kind}:${alertId}`,
    active: true,
    created_by: author,
    created_at: now,
  };
  store.alerts.set(alert.alert_id, alert);
  return alert;
}

function syncDerivedGapFixtureAlerts(workspace: string, author: string) {
  const relations = store.relations.get(workspace) ?? [];
  const questionGaps = (store.questions.get(workspace) ?? [])
    .filter((question) => question.state === "open")
    .map((question) => ({ question, gap: questionGap(question, relations) }))
    .filter(({ gap }) => gap.is_gap);
  for (const alert of store.alerts.values()) {
    if (alert.workspace_id === workspace && (alert.kind === "question_gap" || alert.kind === "record_gap" || alert.kind === "cluster_gap")) alert.active = false;
  }
  const gaps: Array<{ kind: SourceAlert["kind"]; target_id: string; dedupe_key: string; title: string; detail: string; question_id?: string; record_id?: string; cluster_id?: string }> = [];
  for (const { question, gap } of questionGaps) {
    gaps.push({
      kind: "question_gap",
      target_id: question.question_id,
      dedupe_key: `question-gap:${question.question_id}:${gap.status}`,
      title: gap.status === "no_evidence" ? "Open question has no cited evidence" : gap.status === "not_compared" ? "Open question has not been compared" : gap.status === "conflicted" ? "Open question has conflicting evidence" : "Open question needs evidence review",
      detail: `${question.question} · ${gap.cited_observation_count} cited observation(s), ${gap.compared_observation_count} compared, ${gap.unresolved_relation_count} unresolved relation(s), ${gap.contradicting_relation_count} contradiction(s).`,
      question_id: question.question_id,
    });
  }
  for (const record of store.records.get(workspace) ?? []) {
    const gap = recordCoverage(record, relations);
    if (gap.status === "covered") continue;
    gaps.push({
      kind: "record_gap",
      target_id: record.record_id,
      dedupe_key: `record-gap:${record.record_id}:${gap.status}`,
      title: gap.status === "no_evidence" ? "Record has no cited evidence" : gap.status === "needs_corroboration" ? "Record needs corroboration" : gap.status === "contradiction_found" ? "Record has conflicting evidence" : gap.status === "unresolved" ? "Record has unresolved evidence" : "Record review is incomplete",
      detail: `${record.name} · ${gap.observation_count} cited observation(s), ${gap.reviewed_observation_count} reviewed, ${gap.internal_reviewed_pairs} internal comparison(s) of ${gap.possible_internal_pairs}, ${gap.unresolved_count} unresolved relation(s), ${gap.contradicting_count} contradiction(s).`,
      record_id: record.record_id,
    });
  }
  const coverageByID = new Map((store.clusters.get(workspace) ?? []).map((cluster) => [cluster.cluster_id, clusterCoverage(cluster, relations)]));
  for (const cluster of store.clusters.get(workspace) ?? []) {
    const gap = coverageByID.get(cluster.cluster_id);
    if (!gap || gap.status === "covered") continue;
    gaps.push({
      kind: "cluster_gap",
      target_id: cluster.cluster_id,
      dedupe_key: `cluster-gap:${cluster.cluster_id}:${gap.status}`,
      title: gap.status === "no_evidence" ? "Evidence cluster has no cited evidence" : gap.status === "needs_corroboration" ? "Evidence cluster needs corroboration" : gap.status === "contradiction_found" ? "Evidence cluster has conflicting evidence" : gap.status === "unresolved" ? "Evidence cluster has unresolved evidence" : "Evidence cluster review is incomplete",
      detail: `${cluster.title} · ${gap.observation_count} cited observation(s), ${gap.reviewed_observation_count} reviewed, ${gap.internal_reviewed_pairs} internal comparison(s) of ${gap.possible_internal_pairs}, ${gap.unresolved_count} unresolved relation(s), ${gap.contradicting_count} contradiction(s).`,
      cluster_id: cluster.cluster_id,
    });
  }
  for (const gap of gaps) {
    const existing = [...store.alerts.values()].find((alert) => alert.workspace_id === workspace && alert.kind === gap.kind && alert.dedupe_key === gap.dedupe_key);
    const now = new Date().toISOString();
    const next: SourceAlert = {
      ...(existing ?? { alert_id: nextId(), workspace_id: workspace, kind: gap.kind, title: "", detail: "", created_by: author, created_at: now }),
      ...(gap.question_id ? { question_id: gap.question_id } : {}),
      ...(gap.record_id ? { record_id: gap.record_id } : {}),
      ...(gap.cluster_id ? { cluster_id: gap.cluster_id } : {}),
      title: gap.title,
      detail: gap.detail,
      dedupe_key: gap.dedupe_key,
      active: true,
      created_by: author,
      created_at: now,
    };
    store.alerts.set(next.alert_id, next);
  }
  return gaps.length;
}

function assertBinaryCapture(content: Uint8Array, media_type: unknown): asserts media_type is MediaType {
  if (!(["application/pdf", "image/png", "image/jpeg", "image/webp"] as unknown[]).includes(media_type)) throw invalid("Choose a PDF or image capture.");
  const typed = media_type as MediaType;
  const signature = typed === "application/pdf" ? new TextDecoder().decode(content.slice(0, 5)) === "%PDF-"
    : typed === "image/png" ? Array.from(content.slice(0, 8)).join(",") === "137,80,78,71,13,10,26,10"
      : typed === "image/jpeg" ? content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff
        : typed === "image/webp" ? new TextDecoder().decode(content.slice(0, 4)) === "RIFF" && new TextDecoder().decode(content.slice(8, 12)) === "WEBP"
          : false;
  if (!content.length || content.length > 8388608 || !signature) throw invalid("Choose a valid PDF or image capture up to 8 MiB.");
}

async function captureBinaryFor(source: SourceSummary, content: Uint8Array, media_type: MediaType, author: string) {
  assertBinaryCapture(content, media_type);
  const digest = await crypto.subtle.digest("SHA-256", content.slice().buffer as ArrayBuffer);
  const all = store.captures.get(source.source_id) ?? [];
  const sha256 = Array.from(new Uint8Array(digest), (x) => x.toString(16).padStart(2, "0")).join("");
  if (source.duplicate_policy === "block" && all.some((one) => one.sha256 === sha256)) throw new AppError({ kind: "conflict", status: 409, message: "Capture bytes already exist for this source." });
  const capture: Capture = {
    capture_id: nextId(), source_id: source.source_id, version: all.length + 1,
    media_type, sha256,
    bytes: content.length, captured_by: author, captured_at: new Date().toISOString(),
  };
  store.captures.set(source.source_id, [capture, ...all]);
  const { content: _content, ...summary } = capture;
  source.latest_capture = summary;
  return summary;
}

async function extractFixture(source: SourceSummary, capture: Capture, author: string) {
  const all = store.extractions.get(source.source_id) ?? [];
  const now = new Date().toISOString();
  const text = capture.media_type === "application/pdf" ? `Fixture extracted text from capture ${capture.capture_id}.` : undefined;
  const status = text ? "succeeded" as const : "unsupported" as const;
  const method = capture.media_type === "application/pdf" ? "pdf-text-v1" : capture.media_type.startsWith("image/") ? "ocr-v1" : "unsupported-v1";
  const message = text ? undefined : capture.media_type.startsWith("image/") ? "image OCR is not configured in this runtime" : "No text extraction adapter is available for this binary format.";
  const digest = text ? await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)) : undefined;
  const extraction: SourceExtraction = {
    extraction_id: nextId(), workspace_id: source.workspace_id, source_id: source.source_id, capture_id: capture.capture_id,
    method, status, ...(digest ? { output_sha256: Array.from(new Uint8Array(digest), (x) => x.toString(16).padStart(2, "0")).join(""), output_bytes: bytes(text!) } : { output_bytes: 0 }),
    ...(message ? { message } : {}), created_by: author, created_at: now, ...(text ? { text } : {}),
  };
  store.extractions.set(source.source_id, [extraction, ...all]);
  const { text: _text, ...summary } = extraction;
  return summary;
}

function page<T>(rows: T[], req: MemoryRequest, id: (row: T) => string) {
  const before = req.params.before ? String(req.params.before) : undefined;
  if (before && !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(before)) throw invalid("Invalid page cursor.");
  const limit = Math.min(100, Math.max(1, Number(req.params.limit) || 50));
  const sorted = rows.slice().sort((a, b) => id(b).localeCompare(id(a))).filter((one) => !before || id(one) < before);
  const items = sorted.slice(0, limit);
  return { items, next_cursor: sorted.length > limit ? id(items[items.length - 1]) : null };
}

function sourceMatches(source: SourceSummary, rawQuery: string) {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;
  return [source.source_id, source.title, source.url ?? "", source.filename ?? "", source.origin, source.sensitivity].some((field) => field.toLowerCase().includes(query));
}

function sourceSearchResult(source: SourceSummary, capture: Capture, query: string, extraction?: SourceExtraction): SourceSearchResult | null {
  const content = extraction?.text ?? (isTextCapture(capture) ? capture.content : "");
  if (!content || extraction && extraction.status !== "succeeded") return null;
  const start = textOccurrences(content, query)[0];
  if (start === undefined) return null;
  const points = Array.from(content);
  const end = start + Array.from(query.trim()).length;
  const from = Math.max(0, start - 96);
  const to = Math.min(points.length, end + 96);
  return {
    source_id: source.source_id, source_title: source.title, capture_id: capture.capture_id,
    capture_version: capture.version, media_type: extraction ? "text/plain" : capture.media_type,
    ...(extraction ? { extraction_id: extraction.extraction_id, extraction_method: extraction.method } : {}),
    excerpt: points.slice(from, to).join(""), match: points.slice(start, end).join(""), match_start: start, match_end: end,
  };
}

function sourceSearchResultId(result: SourceSearchResult) {
  return result.extraction_id ?? result.capture_id;
}

const relationKinds: RelationKind[] = ["supports", "contradicts", "repeats", "unresolved"];
const clusterKinds = ["claim", "account"] as const;
const questionStates: QuestionState[] = ["open", "answered", "dismissed", "deferred"];
const observationsIn = (workspace: string) => [...store.observations.values()].flat().filter((one) => one.workspace_id === workspace);
const questionsIn = (workspace: string) => store.questions.get(workspace) ?? [];
const sourceTitle = (sourceId: string) => store.sources.get(sourceId)?.title ?? "Untitled source";
function citationContextFor(observation: ManualObservation): CitationContext {
  const source = sourceIn(observation.workspace_id, observation.source_id);
  const capture = (store.captures.get(observation.source_id) ?? []).find((one) => one.capture_id === observation.capture_id);
  if (!capture) throw missing();
  return {
    visibility: "recipient",
    redactions: ["internal_identifiers", "raw_source_bytes", "capture_hash", "author_identity"],
    source_title: source.title,
    source_origin: source.origin,
    ...(source.url ? { source_url: source.url } : {}),
    capture_version: capture.version,
    captured_at: capture.captured_at,
    media_type: observation.extraction_id ? "text/plain" : capture.media_type,
    derived: Boolean(observation.extraction_id),
    statement: observation.statement,
    quote: observation.quote,
    ...(observation.locator ? { locator: observation.locator } : {}),
  };
}
function safeCitationShare(share: CitationShare, includeToken = false): CitationShare {
  return includeToken ? { ...share } : { ...share, token: undefined };
}
function evidenceForObservation(observation: ManualObservation): Evidence {
  return {
    observation_id: observation.observation_id, workspace_id: observation.workspace_id, source_id: observation.source_id,
    source_title: sourceTitle(observation.source_id), capture_id: observation.capture_id,
    ...(observation.extraction_id ? { extraction_id: observation.extraction_id } : {}), statement: observation.statement,
    quote: observation.quote, quote_start: observation.quote_start, quote_end: observation.quote_end,
    ...(observation.locator ? { locator: observation.locator } : {}), author: observation.author, recorded_at: observation.recorded_at,
  };
}
function evidenceBoardItem(observation: ManualObservation): EvidenceBoardItem {
  const evidence = evidenceForObservation(observation);
  const relations = (store.relations.get(observation.workspace_id) ?? []).filter((relation) => relation.left_observation_id === observation.observation_id || relation.right_observation_id === observation.observation_id);
  const counts = relationKinds.reduce<Record<RelationKind, number>>((out, kind) => {
    out[kind] = relations.filter((relation) => relation.kind === kind).length;
    return out;
  }, { supports: 0, contradicts: 0, repeats: 0, unresolved: 0 });
  const clusterCount = (store.clusters.get(observation.workspace_id) ?? []).filter((cluster) => cluster.observation_ids.includes(observation.observation_id)).length;
  const review_state: BoardReviewState = counts.unresolved ? "unresolved" : counts.contradicts ? "contradiction" : relations.length ? "reviewed" : "unreviewed";
  return { ...evidence, review_state, supports: counts.supports, contradicts: counts.contradicts, repeats: counts.repeats, unresolved: counts.unresolved, cluster_count: clusterCount };
}
function fixtureBoardDate(raw: string, exclusiveEnd: boolean) {
  if (!raw) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw invalid("Board dates must use YYYY-MM-DD.");
  const value = Date.parse(`${raw}T00:00:00.000Z`);
  if (!Number.isFinite(value)) throw invalid("Board dates must use YYYY-MM-DD.");
  return value + (exclusiveEnd ? 24 * 60 * 60 * 1000 : 0);
}
function evidenceClusterCoverage(cluster: EvidenceCluster): EvidenceClusterCoverage {
  const ids = new Set(cluster.observation_ids);
  const observations = observationsIn(cluster.workspace_id).filter((observation) => ids.has(observation.observation_id));
  const distinctSourceCount = new Set(observations.map((observation) => observation.source_id)).size;
  const internal = (store.relations.get(cluster.workspace_id) ?? []).filter((relation) => ids.has(relation.left_observation_id) && ids.has(relation.right_observation_id));
  const reviewed = new Set(internal.flatMap((relation) => [relation.left_observation_id, relation.right_observation_id]));
  const possible = cluster.observation_ids.length * Math.max(0, cluster.observation_ids.length - 1) / 2;
  const supporting = internal.filter((relation) => relation.kind === "supports").length;
  const contradicting = internal.filter((relation) => relation.kind === "contradicts").length;
  const repeating = internal.filter((relation) => relation.kind === "repeats").length;
  const unresolved = internal.filter((relation) => relation.kind === "unresolved").length;
  const unreviewed = Math.max(0, possible - internal.length);
  const status: EvidenceClusterCoverage["status"] = !cluster.observation_ids.length ? "no_evidence" : contradicting ? "contradiction_found" : unresolved ? "unresolved" : cluster.observation_ids.length < 2 || distinctSourceCount < 2 || (!supporting && repeating > 0) ? "needs_corroboration" : unreviewed ? "review_incomplete" : "covered";
  return { cluster_id: cluster.cluster_id, observation_count: cluster.observation_ids.length, distinct_source_count: distinctSourceCount, reviewed_observation_count: reviewed.size, supporting_count: supporting, contradicting_count: contradicting, repeating_count: repeating, unresolved_count: unresolved, internal_reviewed_pairs: internal.length, possible_internal_pairs: possible, unreviewed_internal_pairs: unreviewed, status };
}
function evidenceSourceLinkItems(workspace: string): EvidenceSourceLink[] {
  const links = store.sourceLinks.get(workspace) ?? [];
  const observations = observationsIn(workspace);
  const reaches = (from: string, target: string, visited = new Set<string>()): boolean => {
    if (from === target) return true;
    if (visited.has(from)) return false;
    visited.add(from);
    return links.filter((link) => link.upstream_observation_id === from).some((link) => reaches(link.downstream_observation_id, target, visited));
  };
  return links.map((link) => {
    const downstream = observations.find((one) => one.observation_id === link.downstream_observation_id);
    const upstream = observations.find((one) => one.observation_id === link.upstream_observation_id);
    return {
      ...link,
      downstream_source_id: downstream?.source_id ?? "",
      downstream_source_title: sourceTitle(downstream?.source_id ?? ""),
      downstream_capture_id: downstream?.capture_id ?? "",
      downstream_statement: downstream?.statement ?? "Observation unavailable",
      upstream_source_id: upstream?.source_id ?? "",
      upstream_source_title: sourceTitle(upstream?.source_id ?? ""),
      upstream_capture_id: upstream?.capture_id ?? "",
      upstream_statement: upstream?.statement ?? "Observation unavailable",
      cycle_detected: reaches(link.downstream_observation_id, link.upstream_observation_id),
    };
  });
}
function fixtureCluster(workspace: string, body: Partial<WriteEvidenceCluster>, author: string, existing?: EvidenceCluster): EvidenceCluster {
  if (typeof body.kind !== "string" || !clusterKinds.includes(body.kind as typeof clusterKinds[number])) throw invalid("Choose a cluster kind.");
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const ids = Array.isArray(body.observation_ids) ? body.observation_ids : [];
  if (!title || new TextEncoder().encode(title).length > 200) throw invalid("Write a cluster title of up to 200 bytes.");
  if (new TextEncoder().encode(description).length > 4000) throw invalid("Write a cluster description of up to 4,000 bytes.");
  if (!ids.length || ids.length > 24 || ids.some((id) => typeof id !== "string") || new Set(ids).size !== ids.length) throw invalid("Choose between 1 and 24 unique observations.");
  const known = observationsIn(workspace);
  if (ids.some((id) => !known.some((observation) => observation.observation_id === id))) throw missing();
  const now = new Date().toISOString();
  return existing ? {
    ...existing, kind: body.kind as EvidenceCluster["kind"], title, description,
    observation_ids: ids.slice() as string[], updated_by: author, updated_at: now,
  } : {
    cluster_id: nextId(), workspace_id: workspace, kind: body.kind as EvidenceCluster["kind"], title, description,
    observation_ids: ids.slice() as string[], author, updated_by: author, created_at: now, updated_at: now,
  };
}
function createFixtureSynthesis(workspace: string, observationIds: unknown, author: string): EvidenceSynthesis {
  if (!Array.isArray(observationIds) || observationIds.length === 0) throw invalid("Choose at least one observation.");
  if (observationIds.length > 6 || observationIds.some((one) => typeof one !== "string")) throw invalid("Choose up to six observations.");
  const ids = observationIds as string[];
  if (new Set(ids).size !== ids.length) throw invalid("An observation can only be selected once.");
  const known = observationsIn(workspace);
  const observations = ids.map((observationId) => {
    const found = known.find((one) => one.observation_id === observationId);
    if (!found) throw missing();
    return found;
  });
  const rows = observations.map(evidenceForObservation);
  const output = synthesisText(rows);
  if (bytes(output) > 24000) throw invalid("The synthesis output is too large.");
  return {
    synthesis_id: nextId(), workspace_id: workspace, observation_ids: ids.slice(), provider: "local", method: "selected-observations-v1", status: "completed" as const,
    output, candidates: researchRecordCandidates(rows).map((candidate) => ({ ...candidate, kind: "account" as const })), created_by: author, created_at: new Date().toISOString(),
  };
}

function createFixtureComparison(workspace: string, observationIds: unknown, author: string): EvidenceComparison {
  if (!Array.isArray(observationIds) || observationIds.length < 2) throw invalid("Choose between two and six observations.");
  if (observationIds.length > 6 || observationIds.some((one) => typeof one !== "string")) throw invalid("Choose between two and six observations.");
  const ids = observationIds as string[];
  if (new Set(ids).size !== ids.length) throw invalid("An observation can only be selected once.");
  const known = observationsIn(workspace);
  const observations = ids.map((observationId) => {
    const found = known.find((observation) => observation.observation_id === observationId);
    if (!found) throw missing();
    return evidenceForObservation(found);
  });
  const terms = observations.map((observation) => comparisonTerms(observation.statement + "\n" + observation.quote));
  const decisions = store.relations.get(workspace) ?? [];
  const findings: EvidenceComparisonFinding[] = [];
  for (let left = 0; left < observations.length; left++) {
    for (let right = left + 1; right < observations.length; right++) {
      const pair = [observations[left].observation_id, observations[right].observation_id];
      const shared = comparisonIntersection(terms[left], terms[right]);
      if (shared.length >= 2) findings.push({ kind: "agreement", summary: `The selected passages share textual details: ${shared.join(", ")}. Review the exact citations before treating this as agreement.`, observation_ids: pair });
      const decision = decisions.find((relation) => relation.left_observation_id === pair[0] && relation.right_observation_id === pair[1] || relation.left_observation_id === pair[1] && relation.right_observation_id === pair[0]);
      if (decision?.kind === "supports") findings.push({ kind: "agreement", summary: `Human review marked this pair as supporting: ${decision.rationale}`, observation_ids: pair });
      else if (decision?.kind === "contradicts") findings.push({ kind: "contradiction", summary: `Human review marked this pair as contradicting: ${decision.rationale}`, observation_ids: pair });
      else if (decision?.kind === "repeats") findings.push({ kind: "possible_repetition", summary: `Human review marked this pair as repeating: ${decision.rationale}`, observation_ids: pair });
      else if (decision?.kind === "unresolved") findings.push({ kind: "coverage_gap", summary: `Human review leaves this pair unresolved: ${decision.rationale}`, observation_ids: pair });
      else findings.push({ kind: "coverage_gap", summary: "No human pair decision is saved for these selected observations.", observation_ids: pair });
    }
  }
  for (let index = 0; index < observations.length; index++) {
    const unique = [...terms[index]].filter((term) => terms.every((other, otherIndex) => otherIndex === index || !other.has(term))).sort().slice(0, 5);
    if (unique.length) findings.push({ kind: "unique_detail", summary: `Only this selected observation contains these distinctive terms: ${unique.join(", ")}. Verify whether they are material details or incidental wording.`, observation_ids: [observations[index].observation_id] });
  }
  const output = ["Assisted comparison proposal", "", `Selected observations: ${observations.length}`, "", ...findings.map((finding) => `- ${finding.kind.replaceAll("_", " ")}: ${finding.summary}`)].join("\n");
  if (bytes(output) > 24000) throw invalid("The comparison output is too large.");
  return { comparison_id: nextId(), workspace_id: workspace, observation_ids: ids.slice(), provider: "local", method: "selected-observations-comparison-v1", template_version: "comparison-v1", status: findings.length ? "completed" : "empty", output, findings, created_by: author, created_at: new Date().toISOString() };
}

const questionSuggestionKinds: QuestionSuggestionGapKind[] = ["unresolved_relation", "contradiction", "corroboration_gap", "review_incomplete", "open_question"];
function createFixtureQuestionSuggestions(workspace: string, rawGaps: unknown, author: string): EvidenceQuestionSuggestions {
  if (!Array.isArray(rawGaps) || rawGaps.length === 0) throw invalid("Select at least one unresolved evidence gap.");
  if (rawGaps.length > 8) throw invalid("Select up to eight unresolved evidence gaps.");
  const known = observationsIn(workspace);
  const gaps: EvidenceQuestionSuggestionGap[] = [];
  const selected = new Set<string>();
  for (const raw of rawGaps) {
    const gap = raw as Partial<EvidenceQuestionSuggestionGap>;
    if (typeof gap.kind !== "string" || !questionSuggestionKinds.includes(gap.kind as QuestionSuggestionGapKind)) throw invalid("Choose a supported evidence gap kind.");
    const label = typeof gap.label === "string" ? gap.label.trim() : "";
    const detail = typeof gap.detail === "string" ? gap.detail.trim() : "";
    const ids = Array.isArray(gap.observation_ids) ? gap.observation_ids : [];
    if (!label || bytes(label) > 400 || bytes(detail) > 4000 || !ids.length || ids.length > 12 || ids.some((one) => typeof one !== "string") || new Set(ids as string[]).size !== ids.length) throw invalid("Each gap needs a label and up to twelve unique cited observations.");
    for (const observationId of ids as string[]) {
      if (!known.some((one) => one.observation_id === observationId)) throw missing();
      selected.add(observationId);
    }
    gaps.push({ kind: gap.kind as QuestionSuggestionGapKind, label, detail, observation_ids: (ids as string[]).slice() });
  }
  if (selected.size > 24) throw invalid("Suggestions can use up to twenty-four unique observations.");
  const questionFor = (gap: EvidenceQuestionSuggestionGap) => {
    switch (gap.kind) {
      case "contradiction": return [`What independent evidence would resolve the conflicting accounts about ${gap.label}?`, "The selected evidence is in tension. Identify a source or observation that can distinguish the competing accounts."];
      case "corroboration_gap": return [`What independent source or observation would corroborate the working account about ${gap.label}?`, "The selected material does not yet provide enough corroboration. Specify what an independent source would need to show."];
      case "review_incomplete": return [`Which unresolved comparison about ${gap.label} should be reviewed next, and what would settle it?`, "Some cited observations have not been compared or are only partly reviewed. Narrow the next review to a discriminating detail."];
      case "open_question": return [`What evidence would answer the open question: ${gap.label}?`, "This prompt keeps the existing investigation question explicit while identifying the evidence needed to move it forward."];
      default: return [`What evidence would resolve the unresolved relationship around ${gap.label}?`, "The selected evidence contains an unresolved relationship. Look for a source that can distinguish the competing interpretations."];
    }
  };
  const suggestions = gaps.map((gap) => {
    const [prompt, prefix] = questionFor(gap);
    return { kind: gap.kind, prompt, context: `${prefix}${gap.detail ? ` Current gap context: ${gap.detail}` : ""}`, observation_ids: gap.observation_ids.slice() };
  });
  const output = ["Assisted next-question proposal", "", "The following prompts are grounded in selected unresolved evidence gaps. They remain drafts until an analyst saves one as a question.", "", ...suggestions.map((one) => `- ${one.prompt}`)].join("\n");
  if (bytes(output) > 24000) throw invalid("The question suggestion output is too large.");
  return { question_suggestions_id: nextId(), workspace_id: workspace, gaps, provider: "local", method: "unresolved-evidence-gaps-v1", template_version: "question-suggestions-v1", status: suggestions.length ? "completed" : "empty", output, suggestions, created_by: author, created_at: new Date().toISOString() };
}

const comparisonStops = new Set(["about", "after", "again", "also", "among", "because", "before", "being", "between", "could", "from", "have", "into", "more", "other", "same", "than", "that", "their", "there", "these", "they", "this", "through", "under", "were", "which", "with", "would", "your"]);
function comparisonTerms(text: string) {
  return new Set(text.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}@._'’-]{1,63}/gu)?.map((term) => term.replace(/^[-_.’']+|[-_.’']+$/g, "")).filter((term) => term.length >= 3 && !comparisonStops.has(term)) ?? []);
}
function comparisonIntersection(left: Set<string>, right: Set<string>) {
  return [...left].filter((term) => right.has(term)).sort().slice(0, 5);
}

function sourceRetentionReview(source: SourceSummary): SourceRetentionReview {
  const observations = store.observations.get(source.source_id) ?? [];
  const extractions = store.extractions.get(source.source_id) ?? [];
  const assistance = [...store.assistance.values()].filter((one) => one.operation.source_id === source.source_id);
  const dependencies = {
    capture_count: (store.captures.get(source.source_id) ?? []).length,
    observation_count: observations.length,
    extraction_count: extractions.length,
    assistance_operation_count: assistance.length,
    assistance_proposal_count: assistance.reduce((count, one) => count + one.proposals.length, 0),
  };
  const blockers: string[] = [];
  let state: SourceRetentionReview["state"] = "unscheduled";
  if (source.purged_at) {
    state = "purged";
    blockers.push("already_purged");
  } else if (source.legal_hold) {
    state = "held";
  } else if (!source.retention_until) {
    state = "unscheduled";
  } else if (new Date(source.retention_until).getTime() > Date.now()) {
    state = "scheduled";
  } else {
    state = "due";
  }
  if (!source.purged_at) {
    if (source.legal_hold) blockers.push("legal_hold");
    if (!source.retention_until || new Date(source.retention_until).getTime() > Date.now()) blockers.push("retention_not_due");
    if (dependencies.observation_count) blockers.push("observations_present");
    if (dependencies.extraction_count) blockers.push("extractions_present");
    if (dependencies.assistance_operation_count || dependencies.assistance_proposal_count) blockers.push("assistance_present");
  }
  return { source_id: source.source_id, state, ...(source.retention_until ? { retention_until: source.retention_until } : {}), sensitivity: source.sensitivity, legal_hold: source.legal_hold, ...(source.legal_hold_reason ? { legal_hold_reason: source.legal_hold_reason } : {}), dependencies, eligible: blockers.length === 0, blockers };
}

function briefDraft(workspace: string, body: Partial<WriteBrief>) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const current_account = typeof body.current_account === "string" ? body.current_account.trim() : "";
  const alternatives = typeof body.alternatives === "string" ? body.alternatives.trim() : "";
  const limitations = typeof body.limitations === "string" ? body.limitations.trim() : "";
  const next_steps = typeof body.next_steps === "string" ? body.next_steps.trim() : "";
  if (!title || bytes(title) > 400) throw invalid("Write a brief title of up to 400 bytes.");
  if (!question || bytes(question) > 4000) throw invalid("Write an investigation question of up to 4,000 bytes.");
  if (bytes(current_account) > 8000 || bytes(alternatives) > 8000 || bytes(limitations) > 4000 || bytes(next_steps) > 4000) throw invalid("One brief section is too long.");
  const observationIds = body.observation_ids ?? [];
  const clusterIds = body.cluster_ids ?? [];
  const questionIds = body.question_ids ?? [];
  const connectionIds = body.connection_ids ?? [];
  const eventIds = body.event_ids ?? [];
  if (!Array.isArray(observationIds) || observationIds.length > 12 || observationIds.some((one) => typeof one !== "string")) throw invalid("Link up to twelve cited observations.");
  if (!Array.isArray(clusterIds) || clusterIds.length > 8 || clusterIds.some((one) => typeof one !== "string")) throw invalid("Link up to eight evidence clusters.");
  if (!Array.isArray(questionIds) || questionIds.length > 8 || questionIds.some((one) => typeof one !== "string")) throw invalid("Link up to eight investigation questions.");
  if (!Array.isArray(connectionIds) || connectionIds.length > 8 || connectionIds.some((one) => typeof one !== "string")) throw invalid("Link up to eight qualified connections.");
  if (!Array.isArray(eventIds) || eventIds.length > 8 || eventIds.some((one) => typeof one !== "string")) throw invalid("Link up to eight reported events.");
  const observations = [...new Set(observationIds as string[])].sort();
  const clusters = [...new Set(clusterIds as string[])].sort();
  const questions = [...new Set(questionIds as string[])].sort();
  const connections = [...new Set(connectionIds as string[])].sort();
  const events = [...new Set(eventIds as string[])].sort();
  if (observations.length !== observationIds.length || observations.some((id) => !observationsIn(workspace).some((one) => one.observation_id === id))) throw missing();
  if (clusters.length !== clusterIds.length || clusters.some((id) => !(store.clusters.get(workspace) ?? []).some((one) => one.cluster_id === id))) throw missing();
  if (questions.length !== questionIds.length || questions.some((id) => !questionsIn(workspace).some((one) => one.question_id === id))) throw missing();
  if (connections.length !== connectionIds.length || connections.some((id) => !(store.connections.get(workspace) ?? []).some((one) => one.connection_id === id))) throw missing();
  if (events.length !== eventIds.length || events.some((id) => !(store.events.get(workspace) ?? []).some((one) => one.event_id === id))) throw missing();
  return { title, question, current_account, alternatives, limitations, next_steps, observation_ids: observations, cluster_ids: clusters, question_ids: questions, connection_ids: connections, event_ids: events };
}

function createFixtureBriefDraft(workspace: string, rawObservationIDs: unknown, author: string): BriefDraft {
  const brief = store.briefs.get(workspace);
  if (!brief) throw missing();
  if (!Array.isArray(rawObservationIDs) || rawObservationIDs.length === 0 || rawObservationIDs.length > 12 || rawObservationIDs.some((one) => typeof one !== "string")) throw invalid("Choose between one and twelve observations.");
  const observationIDs = rawObservationIDs as string[];
  if (new Set(observationIDs).size !== observationIDs.length) throw invalid("An observation can only be selected once.");
  const observations = observationIDs.map((observationID) => {
    const found = observationsIn(workspace).find((one) => one.observation_id === observationID);
    if (!found) throw missing();
    return evidenceForObservation(found);
  });
  const lines = observations.map((observation) => `- ${observation.source_title}: ${(observation.statement || observation.quote).slice(0, 500)}`);
  const evidenceNotes = `Proposed evidence notes (review before saving):\n${lines.join("\n")}`;
  const append = (before: string | undefined, addition: string) => before?.trim() ? `${before.trim()}\n\n${addition}` : addition;
  const citations = observationIDs.slice();
  const changes: BriefDraftChange[] = [
    { section: "current_account", before: brief.current_account ?? "", after: append(brief.current_account, evidenceNotes), rationale: "Keep the selected evidence visible beside the authored account without asserting that it proves the account.", observation_ids: citations },
    { section: "limitations", before: brief.limitations ?? "", after: append(brief.limitations, "Proposed limitation: the selected citations are preserved here for review but have not been independently adjudicated by this assistant."), rationale: "Make the review boundary explicit while the selected evidence is being assessed.", observation_ids: citations },
    { section: "next_steps", before: brief.next_steps ?? "", after: append(brief.next_steps, "Proposed next step: compare the selected citations together, record an analyst rationale, and update the authored brief only after review."), rationale: "Turn the selected citations into a concrete analyst review step without saving it automatically.", observation_ids: citations },
  ];
  const output = ["Assisted working-brief draft", "", "This is a proposed diff over the authored brief. It preserves selected evidence as review notes and does not establish a conclusion.", "", ...changes.flatMap((change) => [`## ${change.section}`, `Before:\n${change.before}`, `After:\n${change.after}`])].join("\n\n");
  if (bytes(output) > 24000) throw invalid("The brief draft output is too large.");
  return { brief_draft_id: nextId(), workspace_id: workspace, input: { brief_id: brief.brief_id, title: brief.title, question: brief.question, current_account: brief.current_account, alternatives: brief.alternatives, limitations: brief.limitations, next_steps: brief.next_steps, observation_ids: observationIDs.slice() }, provider: "local", method: "working-brief-diff-v1", template_version: "brief-draft-v1", status: "completed", output, changes, created_by: author, created_at: new Date().toISOString() };
}

function workspaceCanReceiveReview(name: keyof typeof PERSONAS, workspace: string, accountId: string) {
  const persona = PERSONAS[name];
  const member = persona.members.find((one) => one.account_id === accountId && one.status === "active");
  if (!member) return false;
  if (member.role === "owner") return true;
  const grant = persona.grants.find((one) => one.workspace_id === workspace && one.account_id === accountId);
  if (!grant || member.role === "client") return false;
  return GRANT_LADDER.indexOf(grant.level) >= GRANT_LADDER.indexOf("write") && GRANT_LADDER.indexOf(grant.level) <= GRANT_LADDER.indexOf(ROLE_CEILING[member.role]);
}

function reviewFor(workspace: string, snapshotId: string, frozenAt: string): BriefSnapshotReview {
  const existing = store.snapshotReviews.get(snapshotId);
  if (existing) return existing;
  const review: BriefSnapshotReview = { workspace_id: workspace, snapshot_id: snapshotId, state: "pending", updated_at: frozenAt, decisions: [] };
  store.snapshotReviews.set(snapshotId, review);
  return review;
}

function recipientHandoffFor(snapshot: BriefSnapshot): BriefRecipientHandoff {
  return {
    snapshot_id: snapshot.snapshot_id,
    workspace_id: snapshot.workspace_id,
    visibility: "recipient",
    redactions: ["citations", "source_and_capture_details", "internal_identifiers", "review_comments"],
    title: snapshot.title,
    question: snapshot.question,
    current_account: snapshot.current_account,
    alternatives: snapshot.alternatives,
    limitations: snapshot.limitations,
    next_steps: snapshot.next_steps,
    clusters: (snapshot.clusters ?? []).map((cluster) => ({ kind: cluster.kind, title: cluster.title, ...(cluster.description ? { description: cluster.description } : {}) })),
    questions: snapshot.questions.map((question) => ({ question: question.question, state: question.state, ...(question.resolution ? { resolution: question.resolution } : {}) })),
    connections: snapshot.connections.map((connection) => ({ from_name: connection.from_record_name, to_name: connection.to_record_name, kind: connection.kind, state: connection.state, rationale: connection.rationale })),
    events: snapshot.events.map((event) => ({ title: event.title, ...(event.description ? { description: event.description } : {}), ...(event.reported_time ? { reported_time: event.reported_time } : {}), time_precision: event.time_precision, ...(event.sort_date ? { sort_date: event.sort_date } : {}), ...(event.location ? { location: event.location } : {}) })),
    event_relationships: snapshot.event_relationships.map((relationship) => {
      const from = snapshot.events.find((event) => event.event_id === relationship.from_event_id);
      const to = snapshot.events.find((event) => event.event_id === relationship.to_event_id);
      return { from_title: from?.title ?? relationship.from_event_id, to_title: to?.title ?? relationship.to_event_id, kind: relationship.kind, state: relationship.state, rationale: relationship.rationale };
    }),
    source_updated_at: snapshot.source_updated_at,
    frozen_at: snapshot.frozen_at,
  };
}

function safeHandoffShare(share: BriefHandoffShare): BriefHandoffShare {
  const { token: _token, ...safe } = share;
  return safe;
}

const recordKinds: ResearchRecordKind[] = ["person", "account", "organisation", "place"];

function recordDraft(workspace: string, body: Partial<WriteResearchRecord>) {
  const kind = body.kind as ResearchRecordKind;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!recordKinds.includes(kind)) throw invalid("Choose a record type.");
  if (!name || bytes(name) > 400) throw invalid("Write a record name of up to 400 bytes.");
  if (bytes(description) > 4000) throw invalid("Record description must be 4,000 bytes or smaller.");
  const ids = body.observation_ids ?? [];
  if (!Array.isArray(ids) || ids.length > 12 || ids.some((one) => typeof one !== "string")) throw invalid("Link up to twelve cited observations.");
  const unique = [...new Set(ids as string[])].sort();
  if (unique.length !== ids.length) throw invalid("A record cannot cite the same observation twice.");
  const known = observationsIn(workspace);
  if (unique.some((id) => !known.some((one) => one.observation_id === id))) throw missing();
  let place_geometry: PlaceGeometry | undefined;
  if (body.place_geometry !== undefined) {
    if (kind !== "place" || !body.place_geometry || typeof body.place_geometry !== "object") throw invalid("Map context can only be attached to a place record.");
    const geometry = body.place_geometry as PlaceGeometry;
    if (!Number.isFinite(geometry.latitude) || geometry.latitude < -90 || geometry.latitude > 90 || !Number.isFinite(geometry.longitude) || geometry.longitude < -180 || geometry.longitude > 180) throw invalid("Coordinates must be finite latitude and longitude values.");
    if (!["exact", "approximate", "region"].includes(geometry.precision)) throw invalid("Choose a spatial precision.");
    if (!Array.isArray(geometry.observation_ids) || geometry.observation_ids.length < 1 || geometry.observation_ids.length > 8 || geometry.observation_ids.some((id) => !unique.includes(id))) throw invalid("Map context needs up to eight cited observations already attached to the record.");
    const geometryObservationIDs = [...new Set(geometry.observation_ids)];
    if (geometryObservationIDs.length !== geometry.observation_ids.length) throw invalid("Map context cannot cite the same observation twice.");
    place_geometry = { latitude: geometry.latitude, longitude: geometry.longitude, precision: geometry.precision as PlacePrecision, observation_ids: geometryObservationIDs.sort() };
  }
  return { kind, name, description, observation_ids: unique, ...(place_geometry ? { place_geometry } : {}) };
}

  const connectionKinds: ResearchConnectionKind[] = ["associated_with", "may_belong_to", "mentions", "concerns_same_event", "located_at", "possible_same_subject"];
const connectionStates: ResearchConnectionState[] = ["proposed", "accepted", "rejected", "deferred"];

function connectionDraft(workspace: string, body: Partial<WriteResearchConnection>) {
  const from_record_id = typeof body.from_record_id === "string" ? body.from_record_id : "";
  const to_record_id = typeof body.to_record_id === "string" ? body.to_record_id : "";
  const kind = body.kind as ResearchConnectionKind;
  const state = body.state as ResearchConnectionState;
  const rationale = typeof body.rationale === "string" ? body.rationale.trim() : "";
  if (!from_record_id || !to_record_id || from_record_id === to_record_id) throw invalid("Choose two different research records.");
  if (!connectionKinds.includes(kind)) throw invalid("Choose a connection type.");
  if (!connectionStates.includes(state)) throw invalid("Choose a connection state.");
  if (!rationale || bytes(rationale) > 4000) throw invalid("Write a rationale of up to 4,000 bytes.");
  const records = store.records.get(workspace) ?? [];
  if (!records.some((one) => one.record_id === from_record_id) || !records.some((one) => one.record_id === to_record_id)) throw missing();
  const supporting = body.supporting_observation_ids ?? [];
  const opposing = body.opposing_observation_ids ?? [];
  if (!Array.isArray(supporting) || !Array.isArray(opposing) || supporting.length > 12 || opposing.length > 12 || supporting.some((one) => typeof one !== "string") || opposing.some((one) => typeof one !== "string")) throw invalid("Link at most twelve supporting and twelve opposing observations.");
  const support = [...new Set(supporting as string[])].sort();
  const oppose = [...new Set(opposing as string[])].sort();
  if (support.length !== supporting.length || oppose.length !== opposing.length) throw invalid("A connection cannot cite the same observation twice.");
  if (support.some((id) => oppose.includes(id))) throw invalid("An observation cannot support and oppose the same connection.");
  const known = observationsIn(workspace);
  if (support.concat(oppose).some((id) => !known.some((one) => one.observation_id === id))) throw missing();
  return { from_record_id, to_record_id, kind, state, rationale, supporting_observation_ids: support, opposing_observation_ids: oppose };
}

function connectionReviewFlags(connection: Pick<ResearchConnection, "state" | "supporting_observation_ids" | "opposing_observation_ids">): ResearchConnectionReviewFlags {
  const supporting = connection.supporting_observation_ids.length > 0;
  const opposing = connection.opposing_observation_ids.length > 0;
  return { open: connection.state === "proposed" || connection.state === "deferred", conflicted: supporting && opposing, uncited: !supporting && !opposing };
}

function withConnectionReviewFlags(connection: Omit<ResearchConnection, "review_flags">): ResearchConnection {
  return { ...connection, review_flags: connectionReviewFlags(connection) };
}

function connectionReviewKey(workspace: string, connection: string) {
  return workspace + ":" + connection;
}

function createFixtureConnectionReview(workspace: string, connectionId: string, author: string): ResearchConnectionReview {
  const connection = (store.connections.get(workspace) ?? []).find((one) => one.connection_id === connectionId);
  if (!connection) throw missing();
  const selected = [...connection.supporting_observation_ids, ...connection.opposing_observation_ids];
  if (!selected.length) throw invalid("Attach at least one supporting or opposing observation before running assisted review.");
  const now = new Date().toISOString();
  const findings: ResearchConnectionReview["findings"] = [];
  if (connection.supporting_observation_ids.length) findings.push({ kind: "support", summary: "The authored assessment labels these citations as supporting. Review the exact passages and their source chain before treating the relationship as strengthened.", observation_ids: [...connection.supporting_observation_ids] });
  if (connection.opposing_observation_ids.length) findings.push({ kind: "opposition", summary: "The authored assessment labels these citations as opposing. Keep the relationship qualified until the tension is explained or resolved by further review.", observation_ids: [...connection.opposing_observation_ids] });
  findings.push({ kind: "alternative", summary: "Alternative possibility to test: the two records may be related through a shared event, source, location, or reporting chain without establishing the authored relationship as the only explanation.", observation_ids: [...selected] });
  findings.push({ kind: "discriminating_evidence", summary: "Discriminating evidence to seek: an independent observation that directly tests the authored rationale and can explain both the supporting and opposing citations. The current citations are a review basis, not proof that the relationship is true.", observation_ids: [...selected] });
  const output = ["Assisted connection review proposal", "", `Authored relationship: ${connection.kind} (${connection.state})`, "", "Review findings:", ...findings.map((finding) => `- ${finding.kind.replaceAll("_", " ")}: ${finding.summary}`)].join("\n");
  if (bytes(output) > 24000) throw invalid("The connection review output is too large.");
  return {
    connection_review_id: nextId(), workspace_id: workspace, connection_id: connection.connection_id, from_record_id: connection.from_record_id, to_record_id: connection.to_record_id,
    connection_kind: connection.kind, connection_state: connection.state, connection_rationale: connection.rationale,
    supporting_observation_ids: [...connection.supporting_observation_ids], opposing_observation_ids: [...connection.opposing_observation_ids],
    provider: "local", method: "authored-connection-review-v1", template_version: "connection-review-v1", status: "completed", output, findings, created_by: author, created_at: now,
  };
}

function eventDraft(workspace: string, body: Partial<WriteEvent>) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const reported_time = typeof body.reported_time === "string" ? body.reported_time.trim() : "";
  const time_precision = body.time_precision as EventTimePrecision;
  const sort_date = typeof body.sort_date === "string" ? body.sort_date.trim() : "";
  const location = typeof body.location === "string" ? body.location.trim() : "";
  if (!title || bytes(title) > 400) throw invalid("Write an event title of up to 400 bytes.");
  if (bytes(description) > 4000) throw invalid("Event description must be 4,000 bytes or smaller.");
  if (bytes(reported_time) > 200) throw invalid("Reported time must be 200 bytes or smaller.");
  if (!(["unknown", "exact", "approximate", "range"] as string[]).includes(time_precision)) throw invalid("Choose an event time precision.");
  if (time_precision === "unknown" && (reported_time || sort_date)) throw invalid("Unknown time cannot include an ordering date or reported wording.");
  if (time_precision !== "unknown" && !reported_time) throw invalid("Add reported time wording or choose unknown.");
  if (sort_date && !/^\d{4}-\d{2}-\d{2}$/.test(sort_date)) throw invalid("Ordering date must be YYYY-MM-DD.");
  if (bytes(location) > 400) throw invalid("Event location must be 400 bytes or smaller.");
  const participantIds = body.participant_record_ids ?? [];
  const suppliedLinks = body.participant_links ?? (Array.isArray(participantIds) ? participantIds.map((record_id) => ({ record_id, role: "associated" as const })) : []);
  const roles: EventParticipantRole[] = ["associated", "actor", "subject", "target", "witness", "affected", "reporter"];
  if (!Array.isArray(suppliedLinks) || suppliedLinks.length > 8 || suppliedLinks.some((one) => !one || typeof one !== "object" || typeof one.record_id !== "string" || !roles.includes(one.role))) throw invalid("Link up to eight participant records with a known role.");
  const participants = [...(suppliedLinks as EventParticipantLink[])].sort((a, b) => a.record_id.localeCompare(b.record_id));
  if (new Set(participants.map((one) => one.record_id)).size !== participants.length) throw invalid("An event cannot name the same participant record twice.");
  const records = store.records.get(workspace) ?? [];
  if (participants.some((one) => !records.some((record) => record.record_id === one.record_id))) throw missing();
  let location_record_id: string | undefined;
  if (body.location_record_id !== undefined) {
    if (typeof body.location_record_id !== "string") throw invalid("Choose a valid location record.");
    location_record_id = body.location_record_id.trim() || undefined;
    if (location_record_id && !records.some((record) => record.record_id === location_record_id)) throw missing();
  }
  const ids = body.observation_ids ?? [];
  if (!Array.isArray(ids) || ids.length > 8 || ids.some((one) => typeof one !== "string")) throw invalid("Link up to eight cited observations.");
  const unique = [...new Set(ids as string[])].sort();
  if (unique.length !== ids.length) throw invalid("An event cannot cite the same observation twice.");
  const known = observationsIn(workspace);
  if (unique.some((id) => !known.some((one) => one.observation_id === id))) throw missing();
  return { title, description, reported_time, time_precision, sort_date, location, observation_ids: unique, participant_record_ids: participants.map((one) => one.record_id), participant_links: participants, ...(location_record_id ? { location_record_id } : {}) };
}

function eventRevisionSnapshot(event: TimelineEvent, records: ResearchRecord[], author: string, revisionID: string, revision: number, changedAt: string): TimelineEventRevision {
  const recordSnapshot = (record: ResearchRecord) => ({ record_id: record.record_id, kind: record.kind, name: record.name, ...(record.description ? { description: record.description } : {}), observation_ids: [...record.observation_ids], ...(record.place_geometry ? { place_geometry: { ...record.place_geometry, observation_ids: [...record.place_geometry.observation_ids] } } : {}) });
  const participantLinks = event.participant_links ?? event.participant_record_ids.map((record_id) => ({ record_id, role: "associated" as const }));
  const participantRecords: EventRecordSnapshot[] = participantLinks.flatMap((link) => {
    const record = records.find((one) => one.record_id === link.record_id);
    return record ? [{ ...recordSnapshot(record), role: link.role }] : [];
  });
  const locationRecord = event.location_record_id ? records.find((record) => record.record_id === event.location_record_id) : undefined;
  return {
    revision_id: revisionID, workspace_id: event.workspace_id, event_id: event.event_id, revision,
    title: event.title, ...(event.description ? { description: event.description } : {}), ...(event.reported_time ? { reported_time: event.reported_time } : {}), time_precision: event.time_precision,
    ...(event.sort_date ? { sort_date: event.sort_date } : {}), ...(event.location ? { location: event.location } : {}), observation_ids: [...event.observation_ids], participant_record_ids: [...event.participant_record_ids], participant_links: participantLinks, participant_records: participantRecords,
    ...(event.location_record_id ? { location_record_id: event.location_record_id } : {}), ...(locationRecord ? { location_record: recordSnapshot(locationRecord) } : {}), changed_by: author, changed_at: changedAt,
  };
}

function assistanceDetail(workspace: string, sourceId: string, capture: Capture, author: string, extractionId?: string): AssistanceDetail {
  let content: string;
  if (extractionId) {
    const extraction = (store.extractions.get(sourceId) ?? []).find((one) => one.extraction_id === extractionId && one.capture_id === capture.capture_id);
    if (!extraction || extraction.status !== "succeeded" || !extraction.text) throw invalid("Choose a successful extraction from this capture.");
    content = extraction.text;
  } else {
    if (!isTextCapture(capture)) throw invalid("Binary captures cannot generate text assistance.");
    content = capture.content;
  }
  const chars = Array.from(content);
  const proposals: AssistanceProposal[] = [];
  let start = 0;
  const add = (end: number) => {
    while (start < end && /\s/u.test(chars[start])) start++;
    while (end > start && /\s/u.test(chars[end - 1])) end--;
    if (end - start < 12 || proposals.length >= 12) return;
    const quote = chars.slice(start, end).join("");
    if (proposals.some((one) => one.generated_quote === quote)) return;
    proposals.push({
      proposal_id: nextId(), operation_id: "", workspace_id: workspace, source_id: sourceId, capture_id: capture.capture_id, ...(extractionId ? { extraction_id: extractionId } : {}),
      generated_statement: quote, generated_quote: quote, generated_quote_start: start, generated_quote_end: end,
      state: "proposed", created_at: new Date().toISOString(),
    });
  };
  for (let index = 0; index < chars.length && proposals.length < 12; index++) {
    if ([".", "!", "?", "\n"].includes(chars[index])) { add(index + 1); start = index + 1; }
  }
  if (proposals.length < 12 && start < chars.length) add(chars.length);
  const operationId = nextId();
  const operation = { operation_id: operationId, workspace_id: workspace, source_id: sourceId, capture_id: capture.capture_id, ...(extractionId ? { extraction_id: extractionId } : {}), status: proposals.length ? "completed" as const : "empty" as const, provider: "local", method: "sentence-passages-v1", template_version: "sentence-passages-v1", created_by: author, created_at: new Date().toISOString(), completed_at: new Date().toISOString(), proposal_count: proposals.length, input_bytes: bytes(content), output_bytes: bytes(JSON.stringify(proposals)), duration_ms: 0, timed_out: false };
  return { operation, proposals: proposals.map((one) => ({ ...one, operation_id: operationId })) };
}

function assistanceProviderPolicy(workspace: string): AssistanceProviderPolicy {
  return store.assistancePolicies.get(workspace) ?? { workspace_id: workspace, allow_external: false };
}

function questionDraft(workspace: string, body: Partial<WriteQuestion>) {
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const context = typeof body.context === "string" ? body.context.trim() : "";
  const state = body.state as QuestionState;
  const resolution = typeof body.resolution === "string" ? body.resolution.trim() : "";
  if (!question || bytes(question) > 400) throw invalid("Write a question of up to 400 bytes.");
  if (bytes(context) > 4000) throw invalid("Question context must be 4,000 bytes or smaller.");
  if (!questionStates.includes(state)) throw invalid("Choose open, answered, dismissed, or deferred.");
  if (state !== "open" && !resolution) throw invalid("An answered, dismissed, or deferred question needs a resolution.");
  if (state === "open" && resolution) throw invalid("An open question cannot carry a resolution.");
  if (bytes(resolution) > 4000) throw invalid("Resolution must be 4,000 bytes or smaller.");
  const ids = body.observation_ids ?? [];
  if (!Array.isArray(ids) || ids.length > 8 || ids.some((one) => typeof one !== "string")) throw invalid("Link up to eight cited observations.");
  const unique = [...new Set(ids as string[])].sort();
  if (unique.length !== ids.length) throw invalid("A question cannot cite the same observation twice.");
  const known = observationsIn(workspace);
  if (unique.some((id) => !known.some((one) => one.observation_id === id))) throw missing();
  return { question, context, state, resolution, observation_ids: unique };
}

export const researchRoutes: MemoryRoute[] = [(req) => {
  const healthMatch = /^\/workspaces\/([^/]+)\/health$/.exec(req.path);
  if (healthMatch) {
    const [, workspace] = healthMatch;
    caller(req, workspace);
    if (req.method !== "GET") return undefined;
    const kinds = ["tool_unavailable", "tool_no_signature", "event_buried", "check_unrunnable", "tool_unread", "field_unmapped"];
    return {
      at: new Date().toISOString(),
      trustworthy: true,
      probes: kinds.map((kind) => ({ kind, measured: true, looked: 0, found: 0 })),
      symptoms: [],
    };
  }

  const connectionReviewMatch = /^\/workspaces\/([^/]+)\/connections\/([^/]+)\/reviews(?:\/([^/]+))?$/.exec(req.path);
  if (connectionReviewMatch) {
    const [, workspace, connectionId, reviewId] = connectionReviewMatch;
    const author = caller(req, workspace);
    if (!(store.connections.get(workspace) ?? []).some((one) => one.connection_id === connectionId)) throw missing();
    const key = connectionReviewKey(workspace, connectionId);
    const reviews = store.connectionReviews.get(key) ?? [];
    if (req.method === "GET" && reviewId) {
      const found = reviews.find((one) => one.connection_review_id === reviewId);
      if (!found) throw missing();
      return found;
    }
    if (req.method === "GET") return page(reviews, req, (one) => one.connection_review_id);
    if (req.method === "POST" && !reviewId) {
      const fresh = createFixtureConnectionReview(workspace, connectionId, author);
      store.connectionReviews.set(key, [fresh, ...reviews]);
      return fresh;
    }
    return undefined;
  }

  const revisionMatch = /^\/workspaces\/([^/]+)\/connections\/([^/]+)\/revisions$/.exec(req.path);
  if (revisionMatch) {
    const [, workspace, connectionId] = revisionMatch;
    caller(req, workspace);
    if (req.method !== "GET") return undefined;
    if (!(store.connections.get(workspace) ?? []).some((one) => one.connection_id === connectionId)) throw missing();
    return { items: (store.revisions.get(connectionId) ?? []).slice() };
  }

  const connectionSummaryMatch = /^\/workspaces\/([^/]+)\/connections\/summary$/.exec(req.path);
  if (connectionSummaryMatch) {
    const [, workspace] = connectionSummaryMatch;
    caller(req, workspace);
    if (req.method !== "GET") return undefined;
    const connections = store.connections.get(workspace) ?? [];
    const stateCounts: Record<ResearchConnectionState, number> = { proposed: 0, accepted: 0, rejected: 0, deferred: 0 };
    let conflicted = 0;
    let uncited = 0;
    for (const connection of connections) {
      stateCounts[connection.state] += 1;
      const supporting = connection.supporting_observation_ids.length > 0;
      const opposing = connection.opposing_observation_ids.length > 0;
      if (connection.state === "proposed" || connection.state === "deferred") {
        // Open is derived by the client from the server summary below.
      }
      if (supporting && opposing) conflicted += 1;
      if (!supporting && !opposing) uncited += 1;
    }
    return {
      connection_count: connections.length,
      state_counts: stateCounts,
      open_count: stateCounts.proposed + stateCounts.deferred,
      conflicted_count: conflicted,
      uncited_count: uncited,
    };
  }

  const connectionMatch = /^\/workspaces\/([^/]+)\/connections(?:\/([^/]+))?$/.exec(req.path);
  if (connectionMatch) {
    const [, workspace, connectionId] = connectionMatch;
    const author = caller(req, workspace);
    const connections = store.connections.get(workspace) ?? [];
    if (req.method === "GET" && connectionId) {
      const found = connections.find((one) => one.connection_id === connectionId);
      if (!found) throw missing();
      return withConnectionReviewFlags(found);
    }
    if (req.method === "GET") {
      const rawState = String(req.params.state ?? "");
      const rawReview = String(req.params.review ?? "");
      const validStates: ResearchConnectionState[] = ["proposed", "accepted", "rejected", "deferred"];
      const validReviews: ResearchConnectionReviewFilter[] = ["", "open", "conflicted", "uncited"];
      if (rawState && !validStates.includes(rawState as ResearchConnectionState)) throw invalid("Choose a valid connection state.");
      if (!validReviews.includes(rawReview as ResearchConnectionReviewFilter)) throw invalid("Choose open, conflicted, or uncited.");
      const filtered = connections.filter((connection) => {
        if (rawState && connection.state !== rawState) return false;
        if (rawReview === "open" && connection.state !== "proposed" && connection.state !== "deferred") return false;
        if (rawReview === "conflicted" && !(connection.supporting_observation_ids.length > 0 && connection.opposing_observation_ids.length > 0)) return false;
        if (rawReview === "uncited" && (connection.supporting_observation_ids.length > 0 || connection.opposing_observation_ids.length > 0)) return false;
        return true;
      });
      return page(filtered.map(withConnectionReviewFlags), req, (one) => one.connection_id);
    }
    const draft = connectionDraft(workspace, (req.body ?? {}) as Partial<WriteResearchConnection>);
    if (req.method === "POST" && !connectionId) {
      const now = new Date().toISOString();
      const fresh: ResearchConnection = withConnectionReviewFlags({ connection_id: nextId(), workspace_id: workspace, ...draft, author, updated_by: author, created_at: now, updated_at: now });
      store.connections.set(workspace, [fresh, ...connections]);
      store.revisions.set(fresh.connection_id, [connectionRevision(fresh, 1, author, now, store.records.get(workspace) ?? [])]);
      return fresh;
    }
    if (req.method === "PUT" && connectionId) {
      const existing = connections.find((one) => one.connection_id === connectionId);
      if (!existing) throw missing();
      const updated: ResearchConnection = withConnectionReviewFlags({ ...existing, ...draft, updated_by: author, updated_at: new Date().toISOString() });
      store.connections.set(workspace, [updated, ...connections.filter((one) => one.connection_id !== connectionId)]);
      const history = store.revisions.get(connectionId) ?? [];
      store.revisions.set(connectionId, [...history, connectionRevision(updated, history.length + 1, author, updated.updated_at, store.records.get(workspace) ?? [])]);
      return updated;
    }
    return undefined;
  }

  const resolutionSetMatch = /^\/workspaces\/([^/]+)\/resolution-sets(?:\/([^/]+)(?:\/(reverse|impact))?)?$/.exec(req.path);
  if (resolutionSetMatch) {
    const [, workspace, resolutionSetId, action] = resolutionSetMatch;
    const author = caller(req, workspace);
    const sets = store.resolutionSets.get(workspace) ?? [];
    if (req.method === "GET" && !resolutionSetId) return page(sets, req, (one) => one.resolution_set_id);
    if (req.method === "POST" && !resolutionSetId) {
      const body = (req.body ?? {}) as { canonical_record_id?: string; alias_record_ids?: string[]; rationale?: string };
      const canonicalRecordId = typeof body.canonical_record_id === "string" ? body.canonical_record_id : "";
      const aliases = Array.isArray(body.alias_record_ids) ? [...new Set(body.alias_record_ids.filter((one): one is string => typeof one === "string"))] : [];
      const rationale = typeof body.rationale === "string" ? body.rationale.trim() : "";
      if (aliases.length < 1 || aliases.length > 3 || aliases.includes(canonicalRecordId)) throw invalid("Choose one canonical record and one to three distinct aliases.");
      if (!rationale || bytes(rationale) > 4000) throw invalid("Write a rationale of up to 4,000 bytes.");
      const records = store.records.get(workspace) ?? [];
      const members = new Set([...aliases, canonicalRecordId]);
      if (!canonicalRecordId || [...members].some((id) => !records.some((one) => one.record_id === id))) throw missing();
      if (sets.some((one) => one.state === "proposed" || one.state === "accepted" ? [...one.alias_record_ids, one.canonical_record_id].some((id) => members.has(id)) : false)) throw new AppError({ kind: "conflict", status: 409, message: "One of these records already has an active resolution." });
      const canonical = records.find((one) => one.record_id === canonicalRecordId)!;
      const added = [...new Set(aliases.flatMap((aliasID) => (records.find((one) => one.record_id === aliasID)?.observation_ids ?? []).filter((id) => !canonical.observation_ids.includes(id))))].sort();
      const after = [...new Set([...canonical.observation_ids, ...added])].sort();
      if (after.length > 12) throw invalid("The canonical record would have too many observations.");
      const now = new Date().toISOString();
      const fresh: ResearchResolutionSet = { resolution_set_id: nextId(), workspace_id: workspace, alias_record_ids: [...aliases].sort(), canonical_record_id: canonicalRecordId, state: "proposed", rationale, proposed_by: author, proposed_at: now, canonical_observation_ids_before: [...canonical.observation_ids], added_observation_ids: added, canonical_observation_ids_after: after };
      store.resolutionSets.set(workspace, [fresh, ...sets]);
      return fresh;
    }
    const existing = resolutionSetId ? sets.find((one) => one.resolution_set_id === resolutionSetId) : undefined;
    if (!existing) throw missing();
    if (req.method === "GET" && action === "impact") return resolutionSetImpact(workspace, resolutionSetId!);
    if (req.method === "GET") return existing;
    if (req.method === "POST" && action === "reverse") {
      if (existing.state !== "accepted") throw new AppError({ kind: "conflict", status: 409, message: "Only an accepted resolution set can be reversed." });
      const records = store.records.get(workspace) ?? [];
      const canonical = records.find((one) => one.record_id === existing.canonical_record_id);
      if (!canonical) throw missing();
      const removed = new Set(existing.added_observation_ids);
      const updatedCanonical: ResearchRecord = { ...canonical, observation_ids: canonical.observation_ids.filter((id) => !removed.has(id)), updated_by: author, updated_at: new Date().toISOString() };
      store.records.set(workspace, [updatedCanonical, ...records.filter((one) => one.record_id !== canonical.record_id)]);
      const updated: ResearchResolutionSet = { ...existing, state: "reversed", reversed_by: author, reversed_at: updatedCanonical.updated_at };
      store.resolutionSets.set(workspace, [updated, ...sets.filter((one) => one.resolution_set_id !== resolutionSetId)]);
      return updated;
    }
    if (req.method === "PUT" && !action) {
      const decision = (req.body as { decision?: ResearchResolutionSetDecision } | undefined)?.decision;
      if (existing.state !== "proposed") throw new AppError({ kind: "conflict", status: 409, message: "This resolution set is no longer awaiting review." });
      if (decision === "reject") {
        const updated: ResearchResolutionSet = { ...existing, state: "rejected", reviewed_by: author, reviewed_at: new Date().toISOString() };
        store.resolutionSets.set(workspace, [updated, ...sets.filter((one) => one.resolution_set_id !== resolutionSetId)]);
        return updated;
      }
      if (decision !== "accept") throw invalid("Choose accept or reject.");
      const records = store.records.get(workspace) ?? [];
      const canonical = records.find((one) => one.record_id === existing.canonical_record_id);
      if (!canonical || existing.alias_record_ids.some((aliasID) => !records.some((one) => one.record_id === aliasID))) throw missing();
      const added = [...new Set(existing.alias_record_ids.flatMap((aliasID) => (records.find((one) => one.record_id === aliasID)?.observation_ids ?? []).filter((id) => !canonical.observation_ids.includes(id))))].sort();
      const merged = [...new Set([...canonical.observation_ids, ...added])].sort();
      if (merged.length > 12) throw invalid("The canonical record would have too many observations.");
      const now = new Date().toISOString();
      const updatedCanonical: ResearchRecord = { ...canonical, observation_ids: merged, updated_by: author, updated_at: now };
      store.records.set(workspace, [updatedCanonical, ...records.filter((one) => one.record_id !== canonical.record_id)]);
      const updated: ResearchResolutionSet = { ...existing, state: "accepted", reviewed_by: author, reviewed_at: now, canonical_observation_ids_before: [...canonical.observation_ids], added_observation_ids: added, canonical_observation_ids_after: merged };
      store.resolutionSets.set(workspace, [updated, ...sets.filter((one) => one.resolution_set_id !== resolutionSetId)]);
      return updated;
    }
    return undefined;
  }

  const recordResolutionMatch = /^\/workspaces\/([^/]+)\/records\/([^/]+)\/resolutions$/.exec(req.path);
  if (recordResolutionMatch) {
    const [, workspace, aliasRecordId] = recordResolutionMatch;
    const author = caller(req, workspace);
    if (req.method !== "POST") return undefined;
    const body = (req.body ?? {}) as { canonical_record_id?: string; rationale?: string };
    const canonicalRecordId = typeof body.canonical_record_id === "string" ? body.canonical_record_id : "";
    const rationale = typeof body.rationale === "string" ? body.rationale.trim() : "";
    if (!canonicalRecordId || canonicalRecordId === aliasRecordId) throw invalid("Choose a different canonical record.");
    if (!rationale || bytes(rationale) > 4000) throw invalid("Write a rationale of up to 4,000 bytes.");
    const records = store.records.get(workspace) ?? [];
    if (!records.some((one) => one.record_id === aliasRecordId) || !records.some((one) => one.record_id === canonicalRecordId)) throw missing();
    const resolutions = store.resolutions.get(workspace) ?? [];
    if (resolutions.some((one) => one.alias_record_id === aliasRecordId && (one.state === "proposed" || one.state === "accepted"))) throw new AppError({ kind: "conflict", status: 409, message: "This record already has an active resolution." });
    const now = new Date().toISOString();
    const alias = records.find((one) => one.record_id === aliasRecordId)!;
    const canonical = records.find((one) => one.record_id === canonicalRecordId)!;
    const added = [...new Set(alias.observation_ids.filter((id) => !canonical.observation_ids.includes(id)))].sort();
    const fresh: ResearchResolution = { resolution_id: nextId(), workspace_id: workspace, alias_record_id: aliasRecordId, canonical_record_id: canonicalRecordId, state: "proposed", rationale, proposed_by: author, proposed_at: now, canonical_observation_ids_before: [...canonical.observation_ids], added_observation_ids: added, canonical_observation_ids_after: [...new Set([...canonical.observation_ids, ...added])].sort() };
    store.resolutions.set(workspace, [fresh, ...resolutions]);
    return fresh;
  }

  const resolutionMatch = /^\/workspaces\/([^/]+)\/resolutions(?:\/([^/]+)(?:\/(reverse))?)?$/.exec(req.path);
  if (resolutionMatch) {
    const [, workspace, resolutionId, action] = resolutionMatch;
    const author = caller(req, workspace);
    const resolutions = store.resolutions.get(workspace) ?? [];
    if (req.method === "GET" && !resolutionId) return page(resolutions, req, (one) => one.resolution_id);
    const existing = resolutionId ? resolutions.find((one) => one.resolution_id === resolutionId) : undefined;
    if (!existing) throw missing();
    if (req.method === "GET" && action === "impact") return resolutionImpact(workspace, resolutionId!);
    if (req.method === "GET") return existing;
    if (req.method === "POST" && action === "reverse") {
      if (existing.state !== "accepted") throw new AppError({ kind: "conflict", status: 409, message: "Only an accepted resolution can be reversed." });
      const records = store.records.get(workspace) ?? [];
      const canonical = records.find((one) => one.record_id === existing.canonical_record_id);
      if (!canonical) throw missing();
      const removed = new Set(existing.added_observation_ids);
      const updatedCanonical: ResearchRecord = { ...canonical, observation_ids: canonical.observation_ids.filter((id) => !removed.has(id)), updated_by: author, updated_at: new Date().toISOString() };
      store.records.set(workspace, [updatedCanonical, ...records.filter((one) => one.record_id !== canonical.record_id)]);
      const updated: ResearchResolution = { ...existing, state: "reversed", reversed_by: author, reversed_at: updatedCanonical.updated_at };
      store.resolutions.set(workspace, [updated, ...resolutions.filter((one) => one.resolution_id !== resolutionId)]);
      return updated;
    }
    if (req.method === "PUT" && !action) {
      const decision = (req.body as { decision?: ResearchResolutionDecision } | undefined)?.decision;
      if (existing.state !== "proposed") throw new AppError({ kind: "conflict", status: 409, message: "This resolution is no longer awaiting review." });
      if (decision === "reject") {
        const updated: ResearchResolution = { ...existing, state: "rejected", reviewed_by: author, reviewed_at: new Date().toISOString() };
        store.resolutions.set(workspace, [updated, ...resolutions.filter((one) => one.resolution_id !== resolutionId)]);
        return updated;
      }
      if (decision !== "accept") throw invalid("Choose accept or reject.");
      const records = store.records.get(workspace) ?? [];
      const alias = records.find((one) => one.record_id === existing.alias_record_id);
      const canonical = records.find((one) => one.record_id === existing.canonical_record_id);
      if (!alias || !canonical) throw missing();
      const added = [...new Set(alias.observation_ids.filter((id) => !canonical.observation_ids.includes(id)))].sort();
      const merged = [...new Set([...canonical.observation_ids, ...added])].sort();
      if (merged.length > 12) throw invalid("The canonical record would have too many observations.");
      const now = new Date().toISOString();
      const updatedCanonical: ResearchRecord = { ...canonical, observation_ids: merged, updated_by: author, updated_at: now };
      store.records.set(workspace, [updatedCanonical, ...records.filter((one) => one.record_id !== canonical.record_id)]);
      const updated: ResearchResolution = { ...existing, state: "accepted", reviewed_by: author, reviewed_at: now, canonical_observation_ids_before: [...canonical.observation_ids], added_observation_ids: added, canonical_observation_ids_after: merged };
      store.resolutions.set(workspace, [updated, ...resolutions.filter((one) => one.resolution_id !== resolutionId)]);
      return updated;
    }
    return undefined;
  }

  const neighborhoodMatch = /^\/workspaces\/([^/]+)\/records\/([^/]+)\/neighborhood$/.exec(req.path);
  if (neighborhoodMatch) {
    const [, workspace, recordId] = neighborhoodMatch;
    caller(req, workspace);
    if (req.method !== "GET") return undefined;
    const records = store.records.get(workspace) ?? [];
    const record = records.find((one) => one.record_id === recordId);
    if (!record) throw missing();
    const depth = String(req.params.depth ?? "") ? Number(req.params.depth) : 1;
    const limit = String(req.params.limit ?? "") ? Number(req.params.limit) : 50;
    if (!Number.isInteger(depth) || depth < 1 || depth > 2) throw invalid("Neighborhood depth must be 1 or 2.");
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw invalid("Neighborhood limit must be between 1 and 50.");
    const allConnections = store.connections.get(workspace) ?? [];
    const allEvents = store.events.get(workspace) ?? [];
    const maxRecords = limit + 1;
    const recordIDs = [recordId];
    const seenRecords = new Set([recordId]);
    let truncated = false;
    const addRecord = (id: string) => {
      if (!id || seenRecords.has(id)) return true;
      if (recordIDs.length >= maxRecords) {
        truncated = true;
        return false;
      }
      seenRecords.add(id);
      recordIDs.push(id);
      return true;
    };
    const connections: ResearchConnection[] = [];
    const seenConnections = new Set<string>();
    const events: TimelineEvent[] = [];
    const seenEvents = new Set<string>();
    let frontier = [recordId];
    for (let level = 1; level <= depth && frontier.length; level += 1) {
      const next: string[] = [];
      const seenNext = new Set<string>();
      const queueNext = (id: string) => {
        if (!id || id === recordId || seenNext.has(id)) return;
        seenNext.add(id);
        next.push(id);
      };
      for (const current of frontier) {
        for (const connection of allConnections.filter((one) => one.from_record_id === current || one.to_record_id === current)) {
          const fromVisible = addRecord(connection.from_record_id);
          const toVisible = addRecord(connection.to_record_id);
          if (!fromVisible || !toVisible) continue;
          if (!seenConnections.has(connection.connection_id)) {
            seenConnections.add(connection.connection_id);
            connections.push(connection);
          }
          if (level < depth) {
            queueNext(connection.from_record_id);
            queueNext(connection.to_record_id);
          }
        }
        for (const event of allEvents.filter((one) => one.participant_record_ids.includes(current) || one.location_record_id === current)) {
          const linked = [...event.participant_record_ids, ...(event.location_record_id ? [event.location_record_id] : [])];
          if (!linked.every(addRecord)) continue;
          if (!seenEvents.has(event.event_id)) {
            seenEvents.add(event.event_id);
            events.push(event);
          }
          if (level < depth) linked.forEach(queueNext);
        }
      }
      frontier = next;
    }
    const relatedRecords = recordIDs.map((id) => records.find((one) => one.record_id === id)).filter((one): one is ResearchRecord => one !== undefined && one.record_id !== recordId);
    const observationIDs: string[] = [];
    const seenObservations = new Set<string>();
    const addObservation = (id: string) => {
      if (!id || seenObservations.has(id)) return;
      if (observationIDs.length >= 100) {
        truncated = true;
        return;
      }
      seenObservations.add(id);
      observationIDs.push(id);
    };
    for (const id of recordIDs) {
      for (const observation of records.find((one) => one.record_id === id)?.observation_ids ?? []) addObservation(observation);
    }
    for (const connection of connections) [...connection.supporting_observation_ids, ...connection.opposing_observation_ids].forEach(addObservation);
    for (const event of events) event.observation_ids.forEach(addObservation);
    const citations = observationsIn(workspace).filter((one) => observationIDs.includes(one.observation_id)).map(evidenceForObservation);
    return {
      meta: { depth, max_depth: 2, record_limit: limit, truncated, record_count: relatedRecords.length + 1, connection_count: connections.length, event_count: events.length, citation_count: citations.length },
      record, records: relatedRecords, connections: connections.map(withConnectionReviewFlags), events, citations,
    };
  }

  const recordMatch = /^\/workspaces\/([^/]+)\/records(?:\/([^/]+))?$/.exec(req.path);
  if (recordMatch) {
    const [, workspace, recordId] = recordMatch;
    const author = caller(req, workspace);
    if (req.method === "GET" && recordId === "summary") {
      const records = store.records.get(workspace) ?? [];
      const resolutions = store.resolutions.get(workspace) ?? [];
      const cited = records.filter((one) => one.observation_ids.length > 0);
      const open = new Set(resolutions.filter((one) => one.state === "proposed").flatMap((one) => [one.alias_record_id, one.canonical_record_id]));
      const accepted = new Set(resolutions.filter((one) => one.state === "accepted").flatMap((one) => [one.alias_record_id, one.canonical_record_id]));
      return {
        record_count: records.length,
        kind_counts: Object.fromEntries(recordKinds.map((kind) => [kind, records.filter((one) => one.kind === kind).length])),
        cited_record_count: cited.length,
        uncited_record_count: records.length - cited.length,
        citation_count: records.reduce((sum, one) => sum + one.observation_ids.length, 0),
        open_resolution_record_count: open.size,
        accepted_resolution_record_count: accepted.size,
      };
    }
    const records = store.records.get(workspace) ?? [];
    if (req.method === "GET" && recordId) {
      const found = records.find((one) => one.record_id === recordId);
      if (!found) throw missing();
      return found;
    }
    if (req.method === "GET") {
      const query = String(req.params.q ?? "").trim().toLowerCase();
      const kind = String(req.params.kind ?? "").trim();
      const citation = String(req.params.citation ?? "").trim();
      const resolution = String(req.params.resolution ?? "").trim();
      if (query.length > 200) throw invalid("Research record search must be 200 characters or fewer.");
      if (kind && !recordKinds.includes(kind as ResearchRecordKind)) throw invalid("Choose a valid research record type.");
      if (citation && !["cited", "uncited"].includes(citation)) throw invalid("Choose cited or uncited records.");
      if (resolution && !["open", "accepted", "none"].includes(resolution)) throw invalid("Choose open, accepted, or no active resolution records.");
      const resolutions = store.resolutions.get(workspace) ?? [];
      const hasResolution = (record: ResearchRecord, state: "proposed" | "accepted") => resolutions.some((one) => one.state === state && (one.alias_record_id === record.record_id || one.canonical_record_id === record.record_id));
      const filtered = records
        .filter((one) => !kind || one.kind === kind)
        .filter((one) => !citation || citation === "cited" && one.observation_ids.length > 0 || citation === "uncited" && one.observation_ids.length === 0)
        .filter((one) => !resolution || resolution === "open" && hasResolution(one, "proposed") || resolution === "accepted" && hasResolution(one, "accepted") || resolution === "none" && !hasResolution(one, "proposed") && !hasResolution(one, "accepted"))
        .filter((one) => !query || [one.record_id, one.name, one.description ?? "", one.kind, ...observationsIn(workspace).filter((observation) => one.observation_ids.includes(observation.observation_id)).flatMap((observation) => [observation.statement, observation.quote, observation.locator ?? ""])].some((field) => field.toLowerCase().includes(query)));
      return page(filtered, req, (one) => one.record_id);
    }
    const draft = recordDraft(workspace, (req.body ?? {}) as Partial<WriteResearchRecord>);
    if (req.method === "POST" && !recordId) {
      const now = new Date().toISOString();
      const fresh: ResearchRecord = { record_id: nextId(), workspace_id: workspace, ...draft, ...(draft.description ? { description: draft.description } : {}), author, updated_by: author, created_at: now, updated_at: now };
      store.records.set(workspace, [fresh, ...records]);
      return fresh;
    }
    if (req.method === "PUT" && recordId) {
      const existing = records.find((one) => one.record_id === recordId);
      if (!existing) throw missing();
      const updated: ResearchRecord = { ...existing, ...draft, ...(draft.description ? { description: draft.description } : { description: undefined }), updated_by: author, updated_at: new Date().toISOString() };
      store.records.set(workspace, [updated, ...records.filter((one) => one.record_id !== recordId)]);
      return updated;
    }
    return undefined;
  }

  const eventClusterMatch = /^\/workspaces\/([^/]+)\/event-clusters(?:\/([^/]+)(?:\/(review))?)?$/.exec(req.path);
  if (eventClusterMatch) {
    const [, workspace, clusterId, action] = eventClusterMatch;
    const author = caller(req, workspace);
    const clusters = store.eventClusters.get(workspace) ?? [];
    if (req.method === "GET" && !clusterId) return page(clusters, req, (one) => one.cluster_id) satisfies EventClusterPage;
    if (req.method === "GET" && clusterId) {
      const found = clusters.find((one) => one.cluster_id === clusterId);
      if (!found) throw missing();
      return found;
    }
    if (action === "review" && clusterId && req.method === "PUT") {
      const found = clusters.find((one) => one.cluster_id === clusterId);
      if (!found) throw missing();
      const body = (req.body ?? {}) as { state?: unknown; note?: unknown };
      const state = String(body.state ?? "");
      const note = typeof body.note === "string" ? body.note.trim() : "";
      if (!["proposed", "accepted", "rejected"].includes(state)) throw invalid("Choose a cluster review state.");
      if (state !== "proposed" && (!note || bytes(note) > 4000)) throw invalid("Accepted or rejected hypotheses need a review note.");
      const now = new Date().toISOString();
      const updated: EventCluster = { ...found, state: state as EventCluster["state"], ...(note ? { review_note: note } : { review_note: undefined }), ...(state === "proposed" ? { reviewed_by: undefined, reviewed_at: undefined } : { reviewed_by: author, reviewed_at: now }), updated_by: author, updated_at: now };
      store.eventClusters.set(workspace, [updated, ...clusters.filter((one) => one.cluster_id !== clusterId)]);
      return updated;
    }
    if (req.method === "POST" && !clusterId) {
      const body = (req.body ?? {}) as { title?: unknown; description?: unknown; event_ids?: unknown };
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const description = typeof body.description === "string" ? body.description.trim() : "";
      const eventIDs = Array.isArray(body.event_ids) ? body.event_ids : [];
      const events = store.events.get(workspace) ?? [];
      if (!title || bytes(title) > 200) throw invalid("Write an event hypothesis title of up to 200 bytes.");
      if (bytes(description) > 4000) throw invalid("Event hypothesis description must be 4,000 bytes or smaller.");
      if (eventIDs.length < 2 || eventIDs.length > 12 || eventIDs.some((one) => typeof one !== "string") || new Set(eventIDs).size !== eventIDs.length) throw invalid("Choose between two and twelve unique events.");
      if ((eventIDs as string[]).some((id) => !events.some((event) => event.event_id === id))) throw missing();
      const now = new Date().toISOString();
      const fresh: EventCluster = { cluster_id: nextId(), workspace_id: workspace, title, description, event_ids: eventIDs as string[], state: "proposed", author, updated_by: author, created_at: now, updated_at: now };
      store.eventClusters.set(workspace, [fresh, ...clusters]);
      return fresh;
    }
    if (req.method === "PUT" && clusterId && !action) {
      const found = clusters.find((one) => one.cluster_id === clusterId);
      if (!found) throw missing();
      const body = (req.body ?? {}) as { title?: unknown; description?: unknown; event_ids?: unknown };
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const description = typeof body.description === "string" ? body.description.trim() : "";
      const eventIDs = Array.isArray(body.event_ids) ? body.event_ids : [];
      const events = store.events.get(workspace) ?? [];
      if (!title || bytes(title) > 200 || bytes(description) > 4000 || eventIDs.length < 2 || eventIDs.length > 12 || eventIDs.some((one) => typeof one !== "string") || new Set(eventIDs).size !== eventIDs.length || (eventIDs as string[]).some((id) => !events.some((event) => event.event_id === id))) throw invalid("Write a valid event hypothesis with two to twelve events.");
      const updated: EventCluster = { ...found, title, description, event_ids: eventIDs as string[], updated_by: author, updated_at: new Date().toISOString() };
      store.eventClusters.set(workspace, [updated, ...clusters.filter((one) => one.cluster_id !== clusterId)]);
      return updated;
    }
    return undefined;
  }

  const eventRelationshipMatch = /^\/workspaces\/([^/]+)\/event-relationships(?:\/([^/]+)(?:\/(review))?)?$/.exec(req.path);
  if (eventRelationshipMatch) {
    const [, workspace, relationshipId, action] = eventRelationshipMatch;
    const author = caller(req, workspace);
    const relationships = store.eventRelationships.get(workspace) ?? [];
    if (req.method === "GET" && !relationshipId) return page(relationships, req, (one) => one.relationship_id) satisfies EventRelationshipPage;
    if (req.method === "GET" && relationshipId) {
      const found = relationships.find((one) => one.relationship_id === relationshipId);
      if (!found) throw missing();
      return found;
    }
    if (action === "review" && relationshipId && req.method === "PUT") {
      const found = relationships.find((one) => one.relationship_id === relationshipId);
      if (!found) throw missing();
      const body = (req.body ?? {}) as { state?: unknown; note?: unknown };
      const state = String(body.state ?? "");
      const note = typeof body.note === "string" ? body.note.trim() : "";
      if (!["proposed", "accepted", "rejected"].includes(state)) throw invalid("Choose a relationship review state.");
      if (state !== "proposed" && (!note || bytes(note) > 4000)) throw invalid("Accepted or rejected relationships need a review note.");
      const now = new Date().toISOString();
      const updated: EventRelationship = { ...found, state: state as EventRelationship["state"], ...(note ? { review_note: note } : { review_note: undefined }), ...(state === "proposed" ? { reviewed_by: undefined, reviewed_at: undefined } : { reviewed_by: author, reviewed_at: now }), updated_by: author, updated_at: now };
      store.eventRelationships.set(workspace, [updated, ...relationships.filter((one) => one.relationship_id !== relationshipId)]);
      return updated;
    }
    if (req.method === "POST" && !relationshipId) {
      const body = (req.body ?? {}) as { from_event_id?: unknown; to_event_id?: unknown; kind?: unknown; rationale?: unknown; supporting_observation_ids?: unknown; opposing_observation_ids?: unknown };
      const from = typeof body.from_event_id === "string" ? body.from_event_id : "";
      const to = typeof body.to_event_id === "string" ? body.to_event_id : "";
      const kind = String(body.kind ?? "");
      const rationale = typeof body.rationale === "string" ? body.rationale.trim() : "";
      const supportingRaw = Array.isArray(body.supporting_observation_ids) ? body.supporting_observation_ids : [];
      const opposingRaw = Array.isArray(body.opposing_observation_ids) ? body.opposing_observation_ids : [];
      const supporting = supportingRaw.filter((one): one is string => typeof one === "string");
      const opposing = opposingRaw.filter((one): one is string => typeof one === "string");
      const events = store.events.get(workspace) ?? [];
      const observations = [...store.observations.values()].flat().filter((observation) => observation.workspace_id === workspace);
      const knownObservationIDs = new Set(observations.map((observation) => observation.observation_id));
      if (!from || !to || from === to || !events.some((event) => event.event_id === from) || !events.some((event) => event.event_id === to)) throw invalid("Choose two different events in this investigation.");
      if (!["related", "precedes", "overlaps", "same_occurrence_candidate", "possibly_causes"].includes(kind)) throw invalid("Choose a valid event relationship type.");
      if (!rationale || bytes(rationale) > 4000) throw invalid("Add a rationale of up to 4,000 bytes.");
      if (supportingRaw.length !== supporting.length || opposingRaw.length !== opposing.length || supporting.length > 8 || opposing.length > 8 || new Set(supporting).size !== supporting.length || new Set(opposing).size !== opposing.length || supporting.some((one) => opposing.includes(one)) || supporting.some((one) => !knownObservationIDs.has(one)) || opposing.some((one) => !knownObservationIDs.has(one))) throw invalid("Choose up to eight known observations per evidence side without overlap.");
      if (relationships.some((one) => one.from_event_id === from && one.to_event_id === to && one.kind === kind)) throw invalid("That event relationship already exists.");
      const now = new Date().toISOString();
      const fresh: EventRelationship = { relationship_id: nextId(), workspace_id: workspace, from_event_id: from, to_event_id: to, kind: kind as EventRelationship["kind"], rationale, state: "proposed", supporting_observation_ids: [...supporting].sort(), opposing_observation_ids: [...opposing].sort(), author, updated_by: author, created_at: now, updated_at: now };
      store.eventRelationships.set(workspace, [fresh, ...relationships]);
      return fresh;
    }
    return undefined;
  }

  const eventAccountMatch = /^\/workspaces\/([^/]+)\/events\/([^/]+)\/accounts(?:\/(reconciliation))?$/.exec(req.path);
  if (eventAccountMatch) {
    const [, workspace, eventId, action] = eventAccountMatch;
    const author = caller(req, workspace);
    const event = (store.events.get(workspace) ?? []).find((one) => one.event_id === eventId);
    if (!event) throw missing();
    const accounts = store.eventAccounts.get(eventId) ?? [];
    if (req.method === "GET") return { items: accounts, ...(store.eventReconciliations.get(eventId) ? { reconciliation: store.eventReconciliations.get(eventId) } : {}) } satisfies EventAccountPage;
    if (action === "reconciliation" && req.method === "PUT") {
      const body = (req.body ?? {}) as { decision?: unknown; selected_account_id?: unknown; rationale?: unknown };
      const decision = String(body.decision ?? "");
      const rationale = typeof body.rationale === "string" ? body.rationale.trim() : "";
      const selected = body.selected_account_id === undefined || body.selected_account_id === null || body.selected_account_id === "" ? undefined : String(body.selected_account_id);
      if (!["unresolved", "retain_event", "prefer_account"].includes(decision)) throw invalid("Choose an event reconciliation decision.");
      if (!rationale || bytes(rationale) > 4000) throw invalid("Add a rationale of up to 4,000 bytes.");
      if (decision === "prefer_account" && (!selected || !accounts.some((one) => one.account_id === selected))) throw invalid("Choose one of the recorded source accounts.");
      if (decision !== "prefer_account" && selected) throw invalid("Only a preferred account decision can select an account.");
      const saved: EventReconciliation = { reconciliation_id: nextId(), workspace_id: workspace, event_id: eventId, decision: decision as EventReconciliation["decision"], ...(selected ? { selected_account_id: selected } : {}), rationale, reviewed_by: author, reviewed_at: new Date().toISOString() };
      store.eventReconciliations.set(eventId, saved);
      return saved;
    }
    if (req.method === "POST" && !action) {
      const draft = eventDraft(workspace, (req.body ?? {}) as Partial<WriteEvent>);
      const now = new Date().toISOString();
      const fresh: EventAccount = { account_id: nextId(), workspace_id: workspace, event_id: eventId, ...draft, author, created_at: now, updated_at: now };
      store.eventAccounts.set(eventId, [ ...(store.eventAccounts.get(eventId) ?? []), fresh ]);
      return fresh;
    }
    return undefined;
  }

  const eventRevisionMatch = /^\/workspaces\/([^/]+)\/events\/([^/]+)\/revisions(?:\/([^/]+))?$/.exec(req.path);
  if (eventRevisionMatch) {
    const [, workspace, eventId, revisionId] = eventRevisionMatch;
    caller(req, workspace);
    const event = (store.events.get(workspace) ?? []).find((one) => one.event_id === eventId);
    if (!event) throw missing();
    let revisions = store.eventRevisions.get(eventId) ?? [];
    if (!revisions.length) {
      revisions = [eventRevisionSnapshot(event, store.records.get(workspace) ?? [], event.author, nextId(), 1, event.created_at)];
      store.eventRevisions.set(eventId, revisions);
    }
    if (req.method !== "GET") return undefined;
    if (revisionId) {
      const found = revisions.find((one) => one.revision_id === revisionId);
      if (!found) throw missing();
      return found;
    }
    return { items: revisions };
  }

  const eventMatch = /^\/workspaces\/([^/]+)\/events(?:\/([^/]+))?$/.exec(req.path);
  if (eventMatch) {
    const [, workspace, eventId] = eventMatch;
    const author = caller(req, workspace);
    const events = store.events.get(workspace) ?? [];
    if (req.method === "GET" && eventId) {
      const found = events.find((one) => one.event_id === eventId);
      if (!found) throw missing();
      return found;
    }
    if (req.method === "GET") return page(events, req, (one) => one.event_id);
    const body = (req.body ?? {}) as Partial<WriteEvent>;
    const draft = eventDraft(workspace, body);
    if (req.method === "POST" && !eventId) {
      const now = new Date().toISOString();
      const fresh: TimelineEvent = { event_id: nextId(), workspace_id: workspace, ...draft, author, updated_by: author, created_at: now, updated_at: now };
      store.events.set(workspace, [fresh, ...events]);
      store.eventRevisions.set(fresh.event_id, [eventRevisionSnapshot(fresh, store.records.get(workspace) ?? [], author, nextId(), 1, now)]);
      return fresh;
    }
    if (req.method === "PUT" && eventId) {
      const existing = events.find((one) => one.event_id === eventId);
      if (!existing) throw missing();
      const updated: TimelineEvent = { ...existing, ...draft, updated_by: author, updated_at: new Date().toISOString() };
      store.events.set(workspace, [updated, ...events.filter((one) => one.event_id !== eventId)]);
      const history = store.eventRevisions.get(eventId) ?? [];
      store.eventRevisions.set(eventId, [...history, eventRevisionSnapshot(updated, store.records.get(workspace) ?? [], author, nextId(), history.length + 1, updated.updated_at)]);
      return updated;
    }
    return undefined;
  }

  const briefDraftMatch = /^\/workspaces\/([^/]+)\/brief\/drafts(?:\/([^/]+))?$/.exec(req.path);
  if (briefDraftMatch) {
    const [, workspace, draftID] = briefDraftMatch;
    const author = caller(req, workspace);
    const drafts = store.briefDrafts.get(workspace) ?? [];
    if (req.method === "GET" && draftID) {
      const found = drafts.find((one) => one.brief_draft_id === draftID);
      if (!found) throw missing();
      return found;
    }
    if (req.method === "GET") return page(drafts, req, (one) => one.brief_draft_id);
    if (req.method === "POST" && !draftID) {
      const fresh = createFixtureBriefDraft(workspace, (req.body as { observation_ids?: unknown } | undefined)?.observation_ids, author);
      store.briefDrafts.set(workspace, [fresh, ...drafts]);
      return fresh;
    }
    return undefined;
  }

  const briefMatch = /^\/workspaces\/([^/]+)\/brief$/.exec(req.path);
  if (briefMatch) {
    const [, workspace] = briefMatch;
    const author = caller(req, workspace);
    if (req.method === "GET") return store.briefs.get(workspace) ?? null;
    if (req.method !== "PUT") return undefined;
    const draft = briefDraft(workspace, (req.body ?? {}) as Partial<WriteBrief>);
    const existing = store.briefs.get(workspace) ?? null;
    const now = new Date().toISOString();
    const saved: WorkingBrief = existing ? { ...existing, ...draft, updated_by: author, updated_at: now } : { brief_id: nextId(), workspace_id: workspace, ...draft, author, updated_by: author, created_at: now, updated_at: now };
    store.briefs.set(workspace, saved);
    return saved;
  }

  const sharedHandoffMatch = /^\/workspaces\/([^/]+)\/brief\/shared\/([^/]+)$/.exec(req.path);
  if (sharedHandoffMatch) {
    const [, workspace, token] = sharedHandoffMatch;
    recipientCaller(req, workspace);
    for (const shares of store.handoffShares.values()) {
      const share = shares.find((one) => one.workspace_id === workspace && one.token === token && !one.revoked_at);
      if (!share) continue;
      const snapshot = (store.snapshots.get(workspace) ?? []).find((one) => one.snapshot_id === share.snapshot_id);
      if (!snapshot) throw missing();
      recordHandoffActivity(snapshot.snapshot_id, workspace, "brief.snapshot.handoff.accessed", caller(req, workspace), { access_mode: "shared" });
      return recipientHandoffFor(snapshot);
    }
    throw missing();
  }

  const sharedHandoffExportMatch = /^\/workspaces\/([^/]+)\/brief\/shared\/([^/]+)\/export$/.exec(req.path);
  if (sharedHandoffExportMatch) {
    const [, workspace, token] = sharedHandoffExportMatch;
    recipientCaller(req, workspace);
    for (const shares of store.handoffShares.values()) {
      const share = shares.find((one) => one.workspace_id === workspace && one.token === token && !one.revoked_at);
      if (!share) continue;
      const snapshot = (store.snapshots.get(workspace) ?? []).find((one) => one.snapshot_id === share.snapshot_id);
      if (!snapshot) throw missing();
      recordHandoffActivity(snapshot.snapshot_id, workspace, "brief.snapshot.handoff.exported", caller(req, workspace), { access_mode: "shared" });
      const handoff = recipientHandoffFor(snapshot);
      const exported: BriefHandoffExport = { filename: "recipient-handoff.md", content_type: "text/markdown", content: renderBriefRecipientHandoffMarkdown(handoff) };
      return exported;
    }
    throw missing();
  }

  const shareRevokeMatch = /^\/workspaces\/([^/]+)\/brief\/shares\/([^/]+)\/revoke$/.exec(req.path);
  if (shareRevokeMatch) {
    const [, workspace, shareId] = shareRevokeMatch;
    const author = caller(req, workspace);
    for (const [snapshotId, shares] of store.handoffShares) {
      const share = shares.find((one) => one.share_id === shareId && one.workspace_id === workspace);
      if (!share) continue;
      if (share.revoked_at) throw missing();
      share.revoked_at = new Date().toISOString();
      share.revoked_by = author;
      store.handoffShares.set(snapshotId, shares);
      recordHandoffActivity(snapshotId, workspace, "brief.snapshot.share.revoked", author, { share_id: shareId });
      return safeHandoffShare(share);
    }
    throw missing();
  }

  const snapshotSharesMatch = /^\/workspaces\/([^/]+)\/brief\/snapshots\/([^/]+)\/shares$/.exec(req.path);
  if (snapshotSharesMatch) {
    const [, workspace, snapshotId] = snapshotSharesMatch;
    const author = caller(req, workspace);
    const snapshot = (store.snapshots.get(workspace) ?? []).find((one) => one.snapshot_id === snapshotId);
    if (!snapshot) throw missing();
    const shares = store.handoffShares.get(snapshotId) ?? [];
    if (req.method === "GET") return shares.map(safeHandoffShare);
    if (req.method !== "POST") return undefined;
    const share: BriefHandoffShare = { share_id: nextId(), workspace_id: workspace, snapshot_id: snapshotId, created_by: author, created_at: new Date().toISOString(), token: nextId() };
    store.handoffShares.set(snapshotId, [share, ...shares]);
    recordHandoffActivity(snapshotId, workspace, "brief.snapshot.share.created", author, { share_id: share.share_id });
    return share;
  }

  const recipientHandoffExportMatch = /^\/workspaces\/([^/]+)\/brief\/handoffs\/([^/]+)\/export$/.exec(req.path);
  if (recipientHandoffExportMatch) {
    const [, workspace, snapshotId] = recipientHandoffExportMatch;
    recipientCaller(req, workspace);
    const snapshot = (store.snapshots.get(workspace) ?? []).find((one) => one.snapshot_id === snapshotId);
    if (!snapshot) throw missing();
    recordHandoffActivity(snapshot.snapshot_id, workspace, "brief.snapshot.handoff.exported", caller(req, workspace), { access_mode: "direct" });
    const handoff = recipientHandoffFor(snapshot);
    const exported: BriefHandoffExport = { filename: "recipient-handoff.md", content_type: "text/markdown", content: renderBriefRecipientHandoffMarkdown(handoff) };
    return exported;
  }

  const recipientHandoffMatch = /^\/workspaces\/([^/]+)\/brief\/handoffs(?:\/([^/]+))?$/.exec(req.path);
  if (recipientHandoffMatch) {
    const [, workspace, snapshotId] = recipientHandoffMatch;
    recipientCaller(req, workspace);
    const snapshots = store.snapshots.get(workspace) ?? [];
    if (req.method !== "GET") return undefined;
    if (snapshotId) {
      const found = snapshots.find((one) => one.snapshot_id === snapshotId);
      if (!found) throw missing();
      recordHandoffActivity(found.snapshot_id, workspace, "brief.snapshot.handoff.accessed", caller(req, workspace), { access_mode: "direct" });
      return recipientHandoffFor(found);
    }
    const response = page(snapshots, req, (one) => one.snapshot_id);
    return { ...response, items: response.items.map(recipientHandoffFor) };
  }

  const snapshotActivityMatch = /^\/workspaces\/([^/]+)\/brief\/snapshots\/([^/]+)\/activity$/.exec(req.path);
  if (snapshotActivityMatch) {
    const [, workspace, snapshotId] = snapshotActivityMatch;
    caller(req, workspace);
    if (!(store.snapshots.get(workspace) ?? []).some((one) => one.snapshot_id === snapshotId)) throw missing();
    return handoffActivityPage(snapshotId, typeof req.params.facet === "string" ? req.params.facet : undefined);
  }

  const snapshotMatch = /^\/workspaces\/([^/]+)\/brief\/snapshots(?:\/([^/]+))?$/.exec(req.path);
  if (snapshotMatch) {
    const [, workspace, snapshotId] = snapshotMatch;
    const author = caller(req, workspace);
    const snapshots = store.snapshots.get(workspace) ?? [];
    if (req.method === "GET" && snapshotId) {
      const found = snapshots.find((one) => one.snapshot_id === snapshotId);
      if (!found) throw missing();
      return found;
    }
    if (req.method === "GET") return page(snapshots, req, (one) => one.snapshot_id);
    if (req.method !== "POST" || snapshotId) return undefined;
    const brief = store.briefs.get(workspace) ?? null;
    if (!brief) throw missing();
    const linkedQuestions = brief.question_ids.map((id) => questionsIn(workspace).find((one) => one.question_id === id));
    const linkedConnections = brief.connection_ids.map((id) => (store.connections.get(workspace) ?? []).find((one) => one.connection_id === id));
    const linkedEvents = brief.event_ids.map((id) => (store.events.get(workspace) ?? []).find((one) => one.event_id === id));
    const records = store.records.get(workspace) ?? [];
    if (linkedQuestions.some((one) => !one) || linkedConnections.some((one) => !one) || linkedEvents.some((one) => !one)) throw missing();
    const now = new Date().toISOString();
    const frozen: BriefSnapshot = {
      snapshot_id: nextId(), workspace_id: workspace, brief_id: brief.brief_id, title: brief.title, question: brief.question,
      current_account: brief.current_account, alternatives: brief.alternatives, limitations: brief.limitations, next_steps: brief.next_steps,
      observation_ids: [...brief.observation_ids],
      clusters: (brief.cluster_ids ?? []).map((id) => {
        const cluster = (store.clusters.get(workspace) ?? []).find((one) => one.cluster_id === id);
        if (!cluster) throw missing();
        return { cluster_id: cluster.cluster_id, kind: cluster.kind, title: cluster.title, description: cluster.description, observation_ids: [...cluster.observation_ids] };
      }),
      questions: linkedQuestions.map((one) => ({ question_id: one!.question_id, question: one!.question, state: one!.state, resolution: one!.resolution, observation_ids: [...one!.observation_ids] })),
      connections: linkedConnections.map((one) => {
        const from = records.find((record) => record.record_id === one!.from_record_id);
        const to = records.find((record) => record.record_id === one!.to_record_id);
        return { connection_id: one!.connection_id, from_record_id: one!.from_record_id, from_record_kind: from?.kind ?? "", from_record_name: from?.name ?? one!.from_record_id, from_record_description: from?.description ?? "", from_record_observation_ids: [...(from?.observation_ids ?? [])], to_record_id: one!.to_record_id, to_record_kind: to?.kind ?? "", to_record_name: to?.name ?? one!.to_record_id, to_record_description: to?.description ?? "", to_record_observation_ids: [...(to?.observation_ids ?? [])], kind: one!.kind, state: one!.state, rationale: one!.rationale, supporting_observation_ids: [...one!.supporting_observation_ids], opposing_observation_ids: [...one!.opposing_observation_ids] };
      }),
      events: linkedEvents.map((one) => {
        const participantRecords = one!.participant_record_ids.map((id) => records.find((record) => record.record_id === id)).filter((record): record is ResearchRecord => Boolean(record));
        const locationRecord = one!.location_record_id ? records.find((record) => record.record_id === one!.location_record_id) : undefined;
        const recordSnapshot = (record: ResearchRecord) => ({ record_id: record.record_id, kind: record.kind, name: record.name, description: record.description ?? "", observation_ids: [...record.observation_ids], ...(record.place_geometry ? { place_geometry: { ...record.place_geometry, observation_ids: [...record.place_geometry.observation_ids] } } : {}) });
        const latestRevision = (store.eventRevisions.get(one!.event_id) ?? []).at(-1);
        return { event_id: one!.event_id, ...(latestRevision ? { event_revision_id: latestRevision.revision_id, event_revision: latestRevision.revision } : {}), title: one!.title, description: one!.description ?? "", reported_time: one!.reported_time ?? "", time_precision: one!.time_precision, sort_date: one!.sort_date ?? "", location: one!.location ?? "", observation_ids: [...one!.observation_ids], participant_records: participantRecords.map(recordSnapshot), ...(locationRecord ? { location_record: recordSnapshot(locationRecord) } : {}) };
      }),
      event_relationships: (store.eventRelationships.get(workspace) ?? []).filter((relationship) => brief.event_ids.includes(relationship.from_event_id) && brief.event_ids.includes(relationship.to_event_id)).map((relationship) => ({ relationship_id: relationship.relationship_id, from_event_id: relationship.from_event_id, to_event_id: relationship.to_event_id, kind: relationship.kind, rationale: relationship.rationale, state: relationship.state, ...(relationship.review_note ? { review_note: relationship.review_note } : {}), supporting_observation_ids: [...(relationship.supporting_observation_ids ?? [])], opposing_observation_ids: [...(relationship.opposing_observation_ids ?? [])] })),
      author: brief.author, updated_by: brief.updated_by, frozen_by: author, source_updated_at: brief.updated_at, frozen_at: now,
    };
    store.snapshots.set(workspace, [frozen, ...snapshots]);
    store.handoffShares.set(frozen.snapshot_id, []);
    recordHandoffActivity(frozen.snapshot_id, workspace, "brief.snapshot.created", author);
    reviewFor(workspace, frozen.snapshot_id, now);
    store.snapshotComments.set(frozen.snapshot_id, []);
    return frozen;
  }

  const snapshotReviewMatch = /^\/workspaces\/([^/]+)\/brief\/snapshots\/([^/]+)\/review(?:\/(assignment|decisions))?$/.exec(req.path);
  if (snapshotReviewMatch) {
    const [, workspace, snapshotId, action] = snapshotReviewMatch;
    const author = caller(req, workspace);
    const snapshot = (store.snapshots.get(workspace) ?? []).find((one) => one.snapshot_id === snapshotId);
    if (!snapshot) throw missing();
    const review = reviewFor(workspace, snapshotId, snapshot.frozen_at);
    if (req.method === "GET" && !action) return review;
    if (action === "assignment" && req.method === "PUT") {
      const body = (req.body ?? {}) as { assignee_id?: unknown };
      const assigneeId = body.assignee_id === null || body.assignee_id === undefined ? null : String(body.assignee_id);
      if (assigneeId && !workspaceCanReceiveReview(personaFromToken(bearerOf(req))!, workspace, assigneeId)) throw invalid("The reviewer must be a member of this investigation.");
      const now = new Date().toISOString();
      if (assigneeId) review.assignee_id = assigneeId;
      else delete review.assignee_id;
      review.assigned_by = author;
      review.assigned_at = now;
      review.updated_at = now;
      recordHandoffActivity(snapshotId, workspace, "brief.snapshot.review.assigned", author, { assignee_id: assigneeId });
      return review;
    }
    if (action === "decisions" && req.method === "POST") {
      const body = (req.body ?? {}) as { state?: unknown; note?: unknown };
      const state = String(body.state ?? "");
      const note = typeof body.note === "string" ? body.note.trim() : "";
      if (state !== "approved" && state !== "changes_requested") throw invalid("Choose approve or request changes.");
      if (state === "changes_requested" && !note) throw invalid("A note is required when requesting changes.");
      if (bytes(note) > 4000) throw invalid("That review note is too long.");
      const decision: BriefSnapshotReviewDecision = { decision_id: nextId(), reviewer_id: author, state, ...(note ? { note } : {}), created_at: new Date().toISOString() };
      review.decisions = [decision, ...review.decisions].slice(0, 50);
      review.state = state;
      review.updated_at = decision.created_at;
      recordHandoffActivity(snapshotId, workspace, "brief.snapshot.review.decided", author, { state });
      return review;
    }
    return undefined;
  }

  const snapshotCommentsMatch = /^\/workspaces\/([^/]+)\/brief\/snapshots\/([^/]+)\/comments$/.exec(req.path);
  if (snapshotCommentsMatch) {
    const [, workspace, snapshotId] = snapshotCommentsMatch;
    const author = caller(req, workspace);
    const snapshot = (store.snapshots.get(workspace) ?? []).find((one) => one.snapshot_id === snapshotId);
    if (!snapshot) throw missing();
    const comments = store.snapshotComments.get(snapshotId) ?? [];
    if (req.method === "GET") return comments;
    if (req.method !== "POST") return undefined;
    const body = (req.body ?? {}) as { body?: unknown };
    const text = typeof body.body === "string" ? body.body.trim() : "";
    if (!text) throw invalid("A handoff comment is required.");
    if (bytes(text) > 4000) throw invalid("That handoff comment is too long.");
    const comment: BriefSnapshotComment = { comment_id: nextId(), workspace_id: workspace, snapshot_id: snapshotId, author, body: text, created_at: new Date().toISOString() };
    store.snapshotComments.set(snapshotId, [comment, ...comments].slice(0, 100));
    recordHandoffActivity(snapshotId, workspace, "brief.snapshot.comment.created", author, { comment_id: comment.comment_id });
    return comment;
  }

  const generateMatch = /^\/workspaces\/([^/]+)\/sources\/([^/]+)\/captures\/([^/]+)\/assistance$/.exec(req.path);
  if (generateMatch) {
    const [, workspace, sourceId, captureId] = generateMatch;
    const author = caller(req, workspace);
    if (req.method === "GET") {
      const extractionId = typeof req.params.extraction_id === "string" ? req.params.extraction_id : "";
      const matches = [...store.assistance.values()]
        .filter((one) => one.operation.workspace_id === workspace && one.operation.source_id === sourceId && one.operation.capture_id === captureId && (one.operation.extraction_id ?? "") === extractionId)
        .sort((left, right) => right.operation.created_at.localeCompare(left.operation.created_at) || right.operation.operation_id.localeCompare(left.operation.operation_id));
      return matches[0] ?? { operation: null, proposals: [] };
    }
    if (req.method !== "POST") return undefined;
    const source = sourceIn(workspace, sourceId);
    if (source.purged_at) throw new AppError({ kind: "conflict", status: 409, message: "Source content has been purged." });
    const capture = (store.captures.get(source.source_id) ?? []).find((one) => one.capture_id === captureId);
    if (!capture) throw missing();
    const body = (req.body ?? {}) as { extraction_id?: string; retry_operation_id?: string };
    let retryOf: string | undefined;
    if (body.retry_operation_id) {
      const previous = store.assistance.get(body.retry_operation_id);
      if (!previous || previous.operation.workspace_id !== workspace || previous.operation.source_id !== sourceId || previous.operation.capture_id !== captureId || !["empty", "partial", "failed", "unsupported"].includes(previous.operation.status)) throw invalid("This assistance run cannot be retried.");
      retryOf = previous.operation.operation_id;
    }
    const detail = assistanceDetail(workspace, sourceId, capture, author, body.extraction_id);
    if (retryOf) detail.operation.retry_of = retryOf;
    store.assistance.set(detail.operation.operation_id, detail);
    return detail;
  }

  const assistancePolicyMatch = /^\/workspaces\/([^/]+)\/assistance\/policy$/.exec(req.path);
  if (assistancePolicyMatch) {
    const [, workspace] = assistancePolicyMatch;
    const author = caller(req, workspace);
    if (req.method === "GET") return assistanceProviderPolicy(workspace);
    if (req.method !== "PUT") return undefined;
    const persona = personaFromToken(bearerOf(req));
    const own = persona ? PERSONAS[persona].me.orgs.flatMap((org) => workspacesFor(persona, org.org_id) ?? []).find((one) => one.workspace_id === workspace) : undefined;
    if (own?.access !== "admin") throw new AppError({ kind: "forbidden", status: 403, message: "Admin access is required." });
    const body = (req.body ?? {}) as { allow_external?: unknown };
    if (typeof body.allow_external !== "boolean") throw invalid("allow_external must be a boolean.");
    const policy: AssistanceProviderPolicy = { workspace_id: workspace, allow_external: body.allow_external, updated_by: author, updated_at: new Date().toISOString() };
    store.assistancePolicies.set(workspace, policy);
    return policy;
  }

  const assistanceRunsMatch = /^\/workspaces\/([^/]+)\/assistance\/runs$/.exec(req.path);
  if (assistanceRunsMatch) {
    const [, workspace] = assistanceRunsMatch;
    caller(req, workspace);
    if (req.method !== "GET") return undefined;
    const items: AssistanceProviderRun[] = [...store.assistance.values()]
      .filter((one) => one.operation.workspace_id === workspace)
      .map((one) => {
        const operation = one.operation;
        return {
          provider_run_id: operation.operation_id,
          workspace_id: operation.workspace_id,
          kind: "extraction" as const,
          result_id: operation.operation_id,
          provider: operation.provider,
          method: operation.method,
          template_version: operation.template_version,
          status: operation.status,
          input_bytes: operation.input_bytes,
          output_bytes: operation.output_bytes,
          duration_ms: operation.duration_ms,
          timed_out: operation.timed_out,
          error: operation.error,
          created_by: operation.created_by,
          created_at: operation.created_at,
          completed_at: operation.completed_at,
        };
      })
      .sort((left, right) => right.created_at.localeCompare(left.created_at) || right.provider_run_id.localeCompare(left.provider_run_id))
      .slice(0, 100);
    return { items };
  }

  const assistanceHistoryMatch = /^\/workspaces\/([^/]+)\/sources\/([^/]+)\/captures\/([^/]+)\/assistance\/history$/.exec(req.path);
  if (assistanceHistoryMatch) {
    const [, workspace, sourceId, captureId] = assistanceHistoryMatch;
    caller(req, workspace);
    if (req.method !== "GET") return undefined;
    const extractionId = typeof req.params.extraction_id === "string" ? req.params.extraction_id : "";
    const items = [...store.assistance.values()]
      .filter((one) => one.operation.workspace_id === workspace && one.operation.source_id === sourceId && one.operation.capture_id === captureId && (one.operation.extraction_id ?? "") === extractionId)
      .sort((left, right) => right.operation.created_at.localeCompare(left.operation.created_at) || right.operation.operation_id.localeCompare(left.operation.operation_id))
      .slice(0, 20);
    return { items };
  }

  const reviewMatch = /^\/workspaces\/([^/]+)\/assistance\/([^/]+)\/proposals\/([^/]+)$/.exec(req.path);
  if (reviewMatch) {
    const [, workspace, operationId, proposalId] = reviewMatch;
    const reviewer = caller(req, workspace);
    const detail = store.assistance.get(operationId);
    if (!detail || detail.operation.workspace_id !== workspace) throw missing();
    const proposal = detail.proposals.find((one) => one.proposal_id === proposalId);
    if (!proposal || proposal.state !== "proposed") throw missing();
    if (req.method !== "PUT") return undefined;
    const body = (req.body ?? {}) as { decision?: string; statement?: string; quote?: string; quote_start?: number; note?: string };
    const note = typeof body.note === "string" ? body.note.trim() : "";
    if (body.decision === "reject") {
      Object.assign(proposal, { state: "rejected" as const, reviewed_by: reviewer, reviewed_at: new Date().toISOString(), review_note: note || undefined });
      return proposal;
    }
    if (body.decision !== "accept") throw invalid("Choose accept or reject.");
    const capture = (store.captures.get(proposal.source_id) ?? []).find((one) => one.capture_id === proposal.capture_id);
    const statement = typeof body.statement === "string" ? body.statement.trim() : proposal.generated_statement;
    const quote = typeof body.quote === "string" && body.quote ? body.quote : proposal.generated_quote;
    const start = body.quote_start ?? proposal.generated_quote_start;
    if (!capture || !isTextCapture(capture) || !statement || bytes(statement) > 4000 || !Number.isInteger(start) || start < 0 || Array.from(capture.content).slice(start, start + Array.from(quote).length).join("") !== quote) throw invalid("The accepted quote must match the retained text exactly.");
    Object.assign(proposal, { state: "accepted" as const, reviewed_statement: statement, reviewed_quote: quote, reviewed_quote_start: start, reviewed_quote_end: start + Array.from(quote).length, reviewed_by: reviewer, reviewed_at: new Date().toISOString(), review_note: note || undefined });
    return proposal;
  }

  const assistanceMatch = /^\/workspaces\/([^/]+)\/assistance\/([^/]+)$/.exec(req.path);
  if (assistanceMatch) {
    const [, workspace, operationId] = assistanceMatch;
    caller(req, workspace);
    const detail = store.assistance.get(operationId);
    if (!detail || detail.operation.workspace_id !== workspace) throw missing();
    if (req.method === "GET") return detail;
    return undefined;
  }

  const questionMatch = /^\/workspaces\/([^/]+)\/questions(?:\/([^/]+))?$/.exec(req.path);
  if (questionMatch) {
    const [, workspace, questionId] = questionMatch;
    const author = caller(req, workspace);
    const questions = store.questions.get(workspace) ?? [];
    if (req.method === "GET" && questionId) {
      const found = questions.find((one) => one.question_id === questionId);
      if (!found) throw missing();
      return found;
    }
    if (req.method === "GET") {
      const state = String(req.params.state ?? "").trim();
      if (state && !questionStates.includes(state as QuestionState)) throw invalid("Choose open, answered, dismissed, or deferred.");
      return page(state ? questions.filter((one) => one.state === state) : questions, req, (one) => one.question_id);
    }
    const body = (req.body ?? {}) as Partial<WriteQuestion>;
    if (req.method === "POST" && !questionId && !body.state) body.state = "open";
    const draft = questionDraft(workspace, body);
    if (req.method === "POST" && !questionId) {
      const now = new Date().toISOString();
      const question: InvestigationQuestion = {
        question_id: nextId(), workspace_id: workspace, question: draft.question,
        ...(draft.context ? { context: draft.context } : {}), state: draft.state,
        ...(draft.resolution ? { resolution: draft.resolution } : {}),
        author, updated_by: author, created_at: now, updated_at: now,
        observation_ids: draft.observation_ids,
      };
      store.questions.set(workspace, [question, ...questions]);
      return question;
    }
    if (req.method === "PUT" && questionId) {
      const existing = questions.find((one) => one.question_id === questionId);
      if (!existing) throw missing();
      const updated: InvestigationQuestion = {
        ...existing, question: draft.question, state: draft.state, updated_by: author,
        updated_at: new Date().toISOString(), observation_ids: draft.observation_ids,
        context: draft.context || undefined,
        resolution: draft.resolution || undefined,
      };
      store.questions.set(workspace, [updated, ...questions.filter((one) => one.question_id !== questionId)]);
      return updated;
    }
    return undefined;
  }

  const clusterCoverageMatch = /^\/workspaces\/([^/]+)\/evidence\/clusters\/coverage$/.exec(req.path);
  if (clusterCoverageMatch) {
    const [, workspace] = clusterCoverageMatch;
    caller(req, workspace);
    if (req.method !== "GET") return undefined;
    return page((store.clusters.get(workspace) ?? []).map(evidenceClusterCoverage), req, (row) => row.cluster_id);
  }

  const clusterMatch = /^\/workspaces\/([^/]+)\/evidence\/clusters(?:\/([^/]+))?$/.exec(req.path);
  if (clusterMatch) {
    const [, workspace, clusterId] = clusterMatch;
    const author = caller(req, workspace);
    const clusters = store.clusters.get(workspace) ?? [];
    if (req.method === "GET" && clusterId) {
      const found = clusters.find((cluster) => cluster.cluster_id === clusterId);
      if (!found) throw missing();
      return found;
    }
    if (req.method === "GET") return page(clusters, req, (one) => one.cluster_id);
    if (req.method !== "POST" && req.method !== "PUT") return undefined;
    const body = (req.body ?? {}) as Partial<WriteEvidenceCluster>;
    const existing = clusterId ? clusters.find((cluster) => cluster.cluster_id === clusterId) : undefined;
    if (clusterId && !existing) throw missing();
    const cluster = fixtureCluster(workspace, body, author, existing);
    store.clusters.set(workspace, [cluster, ...clusters.filter((one) => one.cluster_id !== cluster.cluster_id)]);
    return cluster;
  }

  const relationMatch = /^\/workspaces\/([^/]+)\/evidence\/relations$/.exec(req.path);
  if (relationMatch) {
    const [, workspace] = relationMatch;
    const author = caller(req, workspace);
    const relations = store.relations.get(workspace) ?? [];
    if (req.method === "GET") return page(relations, req, (one) => one.relation_id);
    if (req.method !== "PUT") return undefined;
    const body = (req.body ?? {}) as Partial<SetEvidenceRelation>;
    if (typeof body.left_observation_id !== "string" || typeof body.right_observation_id !== "string" || body.left_observation_id === body.right_observation_id) throw invalid("Choose two different observations.");
    if (typeof body.kind !== "string" || !relationKinds.includes(body.kind as RelationKind)) throw invalid("Choose a review decision.");
    const rationale = typeof body.rationale === "string" ? body.rationale.trim() : "";
    if (!rationale || bytes(rationale) > 4000) throw invalid("Write a rationale of up to 4,000 bytes.");
    const observations = observationsIn(workspace);
    const left = observations.find((one) => one.observation_id === body.left_observation_id);
    const right = observations.find((one) => one.observation_id === body.right_observation_id);
    if (!left || !right) throw missing();
    const [leftId, rightId] = [left.observation_id, right.observation_id].sort();
    const now = new Date().toISOString();
    const existing = relations.find((one) => one.left_observation_id === leftId && one.right_observation_id === rightId);
    const relation: EvidenceRelation = existing ? {
      ...existing, kind: body.kind as RelationKind, rationale, author, updated_at: now,
    } : {
      relation_id: nextId(), workspace_id: workspace, left_observation_id: leftId, right_observation_id: rightId,
      kind: body.kind as RelationKind, rationale, author, created_at: now, updated_at: now,
    };
    store.relations.set(workspace, [relation, ...relations.filter((one) => one.relation_id !== relation.relation_id)]);
    return relation;
  }

  const sourceLinkMatch = /^\/workspaces\/([^/]+)\/evidence\/source-links$/.exec(req.path);
  if (sourceLinkMatch) {
    const [, workspace] = sourceLinkMatch;
    const author = caller(req, workspace);
    const links = store.sourceLinks.get(workspace) ?? [];
    if (req.method === "GET") return page(evidenceSourceLinkItems(workspace), req, (one) => one.source_link_id);
    if (req.method !== "PUT") return undefined;
    const body = (req.body ?? {}) as Partial<SetEvidenceSourceLink>;
    if (typeof body.downstream_observation_id !== "string" || typeof body.upstream_observation_id !== "string" || body.downstream_observation_id === body.upstream_observation_id) throw invalid("Choose two different observations.");
    const rationale = typeof body.rationale === "string" ? body.rationale.trim() : "";
    if (!rationale || bytes(rationale) > 4000) throw invalid("Write a source-link rationale of up to 4,000 bytes.");
    const observations = observationsIn(workspace);
    if (!observations.some((one) => one.observation_id === body.downstream_observation_id) || !observations.some((one) => one.observation_id === body.upstream_observation_id)) throw missing();
    const existing = links.find((one) => one.downstream_observation_id === body.downstream_observation_id && one.upstream_observation_id === body.upstream_observation_id);
    const now = new Date().toISOString();
    const link: EvidenceSourceLink = existing ? { ...existing, rationale, author, updated_at: now } : {
      source_link_id: nextId(), workspace_id: workspace, downstream_observation_id: body.downstream_observation_id, upstream_observation_id: body.upstream_observation_id,
      rationale, author, created_at: now, updated_at: now,
      downstream_source_id: "", downstream_source_title: "", downstream_capture_id: "", downstream_statement: "", upstream_source_id: "", upstream_source_title: "", upstream_capture_id: "", upstream_statement: "", cycle_detected: false,
    };
    store.sourceLinks.set(workspace, [link, ...links.filter((one) => one.source_link_id !== link.source_link_id)]);
    return link;
  }

  const synthesisMatch = /^\/workspaces\/([^/]+)\/evidence\/syntheses(?:\/([^/]+))?$/.exec(req.path);
  if (synthesisMatch) {
    const [, workspace, synthesisId] = synthesisMatch;
    const author = caller(req, workspace);
    const syntheses = store.syntheses.get(workspace) ?? [];
    if (req.method === "GET" && synthesisId) {
      const found = syntheses.find((one) => one.synthesis_id === synthesisId);
      if (!found) throw missing();
      return found;
    }
    if (req.method === "GET") return page(syntheses, req, (one) => one.synthesis_id);
    if (req.method === "POST" && !synthesisId) {
      const fresh = createFixtureSynthesis(workspace, (req.body as { observation_ids?: unknown } | undefined)?.observation_ids, author);
      store.syntheses.set(workspace, [fresh, ...syntheses]);
      return fresh;
    }
    return undefined;
  }

  const comparisonMatch = /^\/workspaces\/([^/]+)\/evidence\/comparisons(?:\/([^/]+))?$/.exec(req.path);
  if (comparisonMatch) {
    const [, workspace, comparisonId] = comparisonMatch;
    const author = caller(req, workspace);
    const comparisons = store.comparisons.get(workspace) ?? [];
    if (req.method === "GET" && comparisonId) {
      const found = comparisons.find((one) => one.comparison_id === comparisonId);
      if (!found) throw missing();
      return found;
    }
    if (req.method === "GET") return page(comparisons, req, (one) => one.comparison_id);
    if (req.method === "POST" && !comparisonId) {
      const fresh = createFixtureComparison(workspace, (req.body as { observation_ids?: unknown } | undefined)?.observation_ids, author);
      store.comparisons.set(workspace, [fresh, ...comparisons]);
      return fresh;
    }
    return undefined;
  }

  const questionSuggestionsMatch = /^\/workspaces\/([^/]+)\/evidence\/question-suggestions(?:\/([^/]+))?$/.exec(req.path);
  if (questionSuggestionsMatch) {
    const [, workspace, suggestionId] = questionSuggestionsMatch;
    const author = caller(req, workspace);
    const suggestions = store.questionSuggestions.get(workspace) ?? [];
    if (req.method === "GET" && suggestionId) {
      const found = suggestions.find((one) => one.question_suggestions_id === suggestionId);
      if (!found) throw missing();
      return found;
    }
    if (req.method === "GET") return page(suggestions, req, (one) => one.question_suggestions_id);
    if (req.method === "POST" && !suggestionId) {
      const fresh = createFixtureQuestionSuggestions(workspace, (req.body as { gaps?: unknown } | undefined)?.gaps, author);
      store.questionSuggestions.set(workspace, [fresh, ...suggestions]);
      return fresh;
    }
    return undefined;
  }

  const evidenceBoardMatch = /^\/workspaces\/([^/]+)\/evidence\/board$/.exec(req.path);
  if (evidenceBoardMatch) {
    const [, workspace] = evidenceBoardMatch;
    caller(req, workspace);
    if (req.method !== "GET") return undefined;
    const query = String(req.params.q ?? "").trim().toLowerCase();
    const source = String(req.params.source ?? "").trim();
    const record = String(req.params.record ?? "").trim();
    const event = String(req.params.event ?? "").trim();
    const state = String(req.params.state ?? "").trim();
    const dateFrom = fixtureBoardDate(String(req.params.date_from ?? "").trim(), false);
    const dateTo = fixtureBoardDate(String(req.params.date_to ?? "").trim(), true);
    const unresolved = String(req.params.unresolved ?? "").trim();
    if (query.length > 200) throw invalid("Text search must be between 1 and 200 characters.");
    if (!["", "unreviewed", "reviewed", "contradiction", "unresolved"].includes(state)) throw invalid("Choose a valid board state.");
    if (unresolved && unresolved !== "true" && unresolved !== "false") throw invalid("Choose whether to show unresolved evidence.");
    if (dateFrom !== undefined && dateTo !== undefined && dateFrom >= dateTo) throw invalid("Board date range must have an earlier start.");
    const records = store.records.get(workspace) ?? [];
    const events = store.events.get(workspace) ?? [];
    const rows = observationsIn(workspace).map(evidenceBoardItem)
      .filter((row) => !source || row.source_id === source)
      .filter((row) => !record || records.some((one) => one.record_id === record && one.observation_ids.includes(row.observation_id)))
      .filter((row) => !event || events.some((one) => one.event_id === event && one.observation_ids.includes(row.observation_id)))
      .filter((row) => dateFrom === undefined || Date.parse(row.recorded_at) >= dateFrom)
      .filter((row) => dateTo === undefined || Date.parse(row.recorded_at) < dateTo)
      .filter((row) => !query || [row.observation_id, row.source_id, row.source_title, row.statement, row.quote, row.locator ?? ""].some((field) => field.toLowerCase().includes(query)))
      .filter((row) => !state || row.review_state === state)
      .filter((row) => unresolved !== "true" || row.unresolved > 0);
    return page(rows, req, (row) => row.observation_id);
  }

  const evidenceByIDMatch = /^\/workspaces\/([^/]+)\/evidence\/([^/]+)$/.exec(req.path);
  if (evidenceByIDMatch) {
    const [, workspace, observationId] = evidenceByIDMatch;
    caller(req, workspace);
    if (req.method !== "GET") return undefined;
    const observation = observationsIn(workspace).find((one) => one.observation_id === observationId);
    if (!observation) throw missing();
    return evidenceForObservation(observation);
  }

  const evidenceMatch = /^\/workspaces\/([^/]+)\/evidence$/.exec(req.path);
  if (evidenceMatch) {
    const [, workspace] = evidenceMatch;
    caller(req, workspace);
    if (req.method !== "GET") return undefined;
    const rows: Evidence[] = observationsIn(workspace).map(evidenceForObservation);
    return page(rows, req, (one) => one.observation_id);
  }

  const textSearchMatch = /^\/workspaces\/([^/]+)\/search$/.exec(req.path);
  if (textSearchMatch) {
    const [, workspace] = textSearchMatch;
    caller(req, workspace);
    if (req.method !== "GET") return undefined;
    const query = String(req.params.q ?? "").trim();
    if (!query || query.length > 200) throw invalid("Text search must be between 1 and 200 characters.");
    const results: SourceSearchResult[] = [];
    for (const source of [...store.sources.values()].filter((one) => one.workspace_id === workspace && !one.purged_at)) {
      for (const capture of store.captures.get(source.source_id) ?? []) {
        const raw = sourceSearchResult(source, capture, query);
        if (raw) results.push(raw);
        for (const extraction of (store.extractions.get(source.source_id) ?? []).filter((one) => one.capture_id === capture.capture_id && one.status === "succeeded")) {
          const derived = sourceSearchResult(source, capture, query, extraction);
          if (derived) results.push(derived);
        }
      }
    }
    return page(results, req, sourceSearchResultId);
  }

  const extractionAction = /^\/workspaces\/([^/]+)\/sources\/([^/]+)\/captures\/([^/]+)\/extract$/.exec(req.path);
  if (extractionAction) {
    const [, workspace, sourceId, captureId] = extractionAction;
    const author = caller(req, workspace);
    if (req.method !== "POST") return undefined;
    const source = sourceIn(workspace, sourceId);
    const capture = (store.captures.get(sourceId) ?? []).find((one) => one.capture_id === captureId);
    if (!capture) throw missing();
    return extractFixture(source, capture, author);
  }
  const extractionRead = /^\/workspaces\/([^/]+)\/sources\/([^/]+)\/captures\/([^/]+)\/extractions(?:\/([^/]+))?$/.exec(req.path);
  if (extractionRead) {
    const [, workspace, sourceId, captureId, extractionId] = extractionRead;
    caller(req, workspace);
    sourceIn(workspace, sourceId);
    const rows = (store.extractions.get(sourceId) ?? []).filter((one) => one.capture_id === captureId);
    if (extractionId) {
      const found = rows.find((one) => one.extraction_id === extractionId);
      if (!found) throw missing();
      return found;
    }
    return page(rows.map(({ text: _text, ...summary }) => summary), req, (one) => one.extraction_id);
  }

  const lifecycle = /^\/workspaces\/([^/]+)\/sources\/([^/]+)\/(privacy|publication|duplicate-policy|retention-review|purge)$/.exec(req.path);
  if (lifecycle) {
    const [, workspace, sourceId, action] = lifecycle;
    const author = caller(req, workspace);
    const source = sourceIn(workspace, sourceId);
    if (action === "privacy" && req.method === "PUT") {
      const body = req.body as SetSourcePrivacy;
      if (!["public", "internal", "restricted"].includes(body.sensitivity)) throw invalid("Choose a valid source sensitivity.");
      const reason = typeof body.legal_hold_reason === "string" ? body.legal_hold_reason.trim() : "";
      if (body.legal_hold && !reason) throw invalid("A legal hold needs a reason.");
      if (!body.legal_hold && reason) throw invalid("Clear the legal hold reason when the hold is removed.");
      source.sensitivity = body.sensitivity;
      source.legal_hold = body.legal_hold;
      if (reason) source.legal_hold_reason = reason;
      else delete source.legal_hold_reason;
      source.privacy_updated_by = author;
      source.privacy_updated_at = new Date().toISOString();
      return { source, captures: (store.captures.get(sourceId) ?? []).map(({ content: _content, ...capture }) => capture) };
    }
    if (action === "publication" && req.method === "PUT") {
      const body = req.body as SetSourcePublication;
      if (body.published_at !== null && typeof body.published_at !== "string") throw invalid("Publication time must be a timestamp or null.");
      if (body.published_at !== null && Number.isNaN(Date.parse(body.published_at))) throw invalid("Publication time must be a valid timestamp.");
      if (body.published_at) source.published_at = new Date(body.published_at).toISOString();
      else delete source.published_at;
      return { source, captures: (store.captures.get(sourceId) ?? []).map(({ content: _content, ...capture }) => capture) };
    }
    if (action === "duplicate-policy" && req.method === "PUT") {
      const body = req.body as SetSourceDuplicatePolicy;
      if (!["allow", "warn", "block"].includes(body.duplicate_policy)) throw invalid("Choose a valid duplicate capture policy.");
      source.duplicate_policy = body.duplicate_policy;
      return { source, captures: (store.captures.get(sourceId) ?? []).map(({ content: _content, ...capture }) => capture) };
    }
    if (action === "retention-review" && req.method === "GET") return sourceRetentionReview(source);
    if (action === "purge" && req.method === "POST") {
      const body = req.body as { confirm?: boolean; reason?: string };
      if (!body.confirm) throw new AppError({ kind: "precondition_required", status: 428, message: "Purge requires explicit confirmation." });
      const review = sourceRetentionReview(source);
      if (!review.eligible) return { purged: false, review };
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";
      if (!reason) throw invalid("A purge requires an audit reason.");
      source.purged_at = new Date().toISOString();
      source.purged_by = author;
      source.purge_reason = reason;
      return { purged: true, review };
    }
    return undefined;
  }

  const retentionQueue = /^\/workspaces\/([^/]+)\/retention-review$/.exec(req.path);
  if (retentionQueue) {
    const [, workspace] = retentionQueue;
    caller(req, workspace);
    if (req.method !== "GET") return undefined;
    const state = String(req.params.state ?? "") as RetentionQueueState;
    const items = [...store.sources.values()].filter((source) => source.workspace_id === workspace).map((source) => ({ source: source as Omit<SourceSummary, "latest_capture">, review: sourceRetentionReview(source) })).filter((item) => !state || item.review.state === state);
    return page(items, req, (item) => item.source.source_id);
  }

  const retentionCleanupStatus = /^\/workspaces\/([^/]+)\/retention-cleanup\/status$/.exec(req.path);
  if (retentionCleanupStatus) {
    const [, workspace] = retentionCleanupStatus;
    caller(req, workspace);
    const persona = personaFromToken(bearerOf(req));
    const own = persona ? PERSONAS[persona].me.orgs.flatMap((org) => workspacesFor(persona, org.org_id) ?? []).find((one) => one.workspace_id === workspace) : undefined;
    if (own?.access !== "admin") throw new AppError({ kind: "forbidden", status: 403, message: "Admin access is required." });
    const statuses = new Map<string, ArtifactLifecycleStatus>();
    for (const source of [...store.sources.values()].filter((one) => one.workspace_id === workspace)) {
      const add = (item: ArtifactLifecycleStatus) => {
        const existing = statuses.get(item.ref);
        if (existing) {
          existing.reference_count += 1;
          if (item.live_source_count) existing.live_source_count += item.live_source_count;
          if (item.live_source_count) {
            existing.state = "protected";
            existing.reason = "Referenced by a live source.";
          }
          return;
        }
        statuses.set(item.ref, item);
      };
      for (const capture of store.captures.get(source.source_id) ?? []) {
        const ref = `sha256:${capture.sha256}`;
        const run = store.cleanupRuns.get(workspace)?.find((one) => one.deleted_count > 0 && one.status === "completed");
        const swept = store.cleanedRefs.has(ref);
        add({ ref, kind: "source_capture", workspace_id: workspace, source_id: source.source_id, capture_id: capture.capture_id, bytes: capture.bytes, purged_at: source.purged_at, created_at: capture.captured_at, reference_count: 1, live_source_count: source.purged_at ? 0 : 1, live_extraction_count: 0, run_referenced: false, report_referenced: false, state: !source.purged_at ? "protected" : swept ? "swept" : "eligible", reason: !source.purged_at ? "Referenced by a live source." : swept ? "Removed by the recorded cleanup sweep." : "Verified bytes have no live durable reference.", ...(swept && run ? { last_sweep_id: run.sweep_id, last_sweep_outcome: "deleted", last_sweep_at: run.finished_at } : {}) });
      }
      for (const extraction of store.extractions.get(source.source_id) ?? []) {
        if (!extraction.output_sha256) continue;
        const ref = `sha256:${extraction.output_sha256}`;
        const swept = store.cleanedRefs.has(ref);
        add({ ref, kind: "source_extraction", workspace_id: workspace, source_id: source.source_id, capture_id: extraction.capture_id, extraction_id: extraction.extraction_id, bytes: extraction.output_bytes, purged_at: source.purged_at, created_at: extraction.created_at, reference_count: 1, live_source_count: source.purged_at ? 0 : 1, live_extraction_count: 0, run_referenced: false, report_referenced: false, state: !source.purged_at ? "protected" : swept ? "swept" : "eligible", reason: !source.purged_at ? "Referenced by a live source." : swept ? "Removed by the recorded cleanup sweep." : "Verified bytes have no live durable reference.", ...(swept ? { last_sweep_id: store.cleanupRuns.get(workspace)?.find((one) => one.deleted_count > 0 && one.status === "completed")?.sweep_id, last_sweep_outcome: "deleted" as const, last_sweep_at: store.cleanupRuns.get(workspace)?.find((one) => one.deleted_count > 0 && one.status === "completed")?.finished_at } : {}) });
      }
    }
    const state = String(req.params.state ?? "");
    const exactRef = String(req.params.ref ?? "");
    const before = String(req.params.before ?? "");
    const limit = Math.min(100, Math.max(1, Number(req.params.limit) || 50));
    const filtered = [...statuses.values()].sort((a, b) => a.ref.localeCompare(b.ref)).filter((item) => (!state || item.state === state) && (!exactRef || item.ref === exactRef) && (!before || item.ref > before));
    const items = filtered.slice(0, limit);
    const state_counts = items.reduce<Record<string, number>>((counts, item) => { counts[item.state] = (counts[item.state] ?? 0) + 1; return counts; }, {});
    return { items, count: items.length, state_counts, next_cursor: filtered.length > limit ? items[items.length - 1]?.ref ?? null : null };
  }

  const retentionCleanupReviews = /^\/workspaces\/([^/]+)\/retention-cleanup\/reviews$/.exec(req.path);
  if (retentionCleanupReviews) {
    const [, workspace] = retentionCleanupReviews;
    caller(req, workspace);
    const persona = personaFromToken(bearerOf(req));
    const own = persona ? PERSONAS[persona].me.orgs.flatMap((org) => workspacesFor(persona, org.org_id) ?? []).find((one) => one.workspace_id === workspace) : undefined;
    if (own?.access !== "admin") throw new AppError({ kind: "forbidden", status: 403, message: "Admin access is required." });
    const limit = Math.min(50, Math.max(1, Number(req.params.limit) || 50));
    const items = (store.cleanupReviewHistory.get(workspace) ?? []).slice(0, limit).map(cleanupReviewSummary);
    return { items, count: items.length };
  }

  const retentionCleanupDiscard = /^\/workspaces\/([^/]+)\/retention-cleanup\/review\/discard$/.exec(req.path);
  if (retentionCleanupDiscard) {
    const [, workspace] = retentionCleanupDiscard;
    caller(req, workspace);
    const persona = personaFromToken(bearerOf(req));
    const own = persona ? PERSONAS[persona].me.orgs.flatMap((org) => workspacesFor(persona, org.org_id) ?? []).find((one) => one.workspace_id === workspace) : undefined;
    if (own?.access !== "admin") throw new AppError({ kind: "forbidden", status: 403, message: "Admin access is required." });
    const body = (req.body ?? {}) as { review_id?: unknown; reason?: unknown };
    const reviewID = typeof body.review_id === "string" ? body.review_id.trim() : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!reviewID) throw invalid("A cleanup review is required.");
    if (!reason) throw invalid("Explain why this cleanup review is being discarded.");
    if (bytes(reason) > 4000) throw invalid("The discard reason is too long.");
    const review = store.cleanupReviews.get(workspace);
    if (!review || review.review_id !== reviewID || review.status !== "open") throw new AppError({ kind: "precondition_required", status: 428, message: "Only the open cleanup review can be discarded." });
    const now = new Date().toISOString();
    const discarded: ArtifactCleanupReview = { ...review, status: "discarded", updated_by: caller(req, workspace), updated_at: now, discarded_by: caller(req, workspace), discarded_at: now, discard_reason: reason };
    store.cleanupReviews.set(workspace, discarded);
    rememberCleanupReview(workspace, discarded);
    return discarded;
  }

  const retentionCleanupReview = /^\/workspaces\/([^/]+)\/retention-cleanup\/review$/.exec(req.path);
  if (retentionCleanupReview) {
    const [, workspace] = retentionCleanupReview;
    const author = caller(req, workspace);
    const persona = personaFromToken(bearerOf(req));
    const own = persona ? PERSONAS[persona].me.orgs.flatMap((org) => workspacesFor(persona, org.org_id) ?? []).find((one) => one.workspace_id === workspace) : undefined;
    if (own?.access !== "admin") throw new AppError({ kind: "forbidden", status: 403, message: "Admin access is required." });
    if (req.method === "GET") {
      return store.cleanupReviews.get(workspace) ?? { review_id: "", workspace_id: workspace, created_by: "", updated_by: "", status: "none", items: [], selected_refs: [], created_at: new Date(0).toISOString(), updated_at: new Date(0).toISOString() };
    }
    if (req.method !== "PUT") return undefined;
    const body = (req.body ?? {}) as { selected_refs?: unknown };
    const selectedRefs = body.selected_refs;
    if (!Array.isArray(selectedRefs) || selectedRefs.some((ref) => typeof ref !== "string")) throw invalid("Selected artifacts must be content references.");
    if (selectedRefs.length === 0) throw new AppError({ kind: "precondition_required", status: 428, message: "Select at least one artifact before saving a cleanup review." });
    if (selectedRefs.length > 100) throw invalid("At most 100 artifacts may be selected for cleanup.");
    const selected = new Set<string>();
    for (const ref of selectedRefs) {
      const canonical = ref.trim();
      if (!/^sha256:[\da-f]{64}$/.test(canonical)) throw invalid("Selected artifacts must use valid sha256 content references.");
      if (selected.has(canonical)) throw invalid("Selected artifacts must not contain duplicates.");
      selected.add(canonical);
    }
    const candidates = cleanupCandidates(workspace);
    if ([...selected].some((ref) => !candidates.some((item) => item.ref === ref))) throw new AppError({ kind: "precondition_required", status: 428, message: "One or more selected artifacts are no longer eligible for cleanup." });
    const now = new Date().toISOString();
    const previous = store.cleanupReviews.get(workspace);
    const review: ArtifactCleanupReview = {
      review_id: previous?.status === "open" ? previous.review_id : nextId(),
      workspace_id: workspace,
      created_by: previous?.status === "open" ? previous.created_by : author,
      updated_by: author,
      status: "open",
      items: candidates.filter((item) => selected.has(item.ref)),
      selected_refs: candidates.filter((item) => selected.has(item.ref)).map((item) => item.ref),
      created_at: previous?.status === "open" ? previous.created_at : now,
      updated_at: now,
    };
    store.cleanupReviews.set(workspace, review);
    rememberCleanupReview(workspace, review);
    return review;
  }

  const retentionCleanup = /^\/workspaces\/([^/]+)\/retention-cleanup$/.exec(req.path);
  if (retentionCleanup) {
    const [, workspace] = retentionCleanup;
    const author = caller(req, workspace);
    const persona = personaFromToken(bearerOf(req));
    const own = persona ? PERSONAS[persona].me.orgs.flatMap((org) => workspacesFor(persona, org.org_id) ?? []).find((one) => one.workspace_id === workspace) : undefined;
    if (own?.access !== "admin") throw new AppError({ kind: "forbidden", status: 403, message: "Admin access is required." });
    const unique = cleanupCandidates(workspace);
    const body = (req.body ?? {}) as { confirm?: boolean; limit?: number; selected_refs?: unknown; review_id?: unknown };
    const limit = Math.min(100, Math.max(1, Number(body?.limit || req.params.limit) || 100));
    let items = unique.slice(0, limit);
    const recent_sweeps = (store.cleanupRuns.get(workspace) ?? []).slice(0, 10);
    const inventory = { items, candidate_count: items.length, candidate_bytes: items.reduce((sum, item) => sum + item.bytes, 0), recent_sweeps };
    if (req.method === "GET") return inventory;
    if (!body.confirm) throw new AppError({ kind: "precondition_required", status: 428, message: "Cleanup requires explicit confirmation." });
    const selectedRefs = body.selected_refs === undefined ? [] : body.selected_refs;
    if (!Array.isArray(selectedRefs) || selectedRefs.some((ref) => typeof ref !== "string")) throw invalid("Selected artifacts must be content references.");
    if (selectedRefs.length > 100) throw invalid("At most 100 artifacts may be selected for cleanup.");
    const selected = new Set<string>();
    for (const ref of selectedRefs) {
      if (!/^sha256:[\da-f]{64}$/.test(ref.trim())) throw invalid("Selected artifacts must use valid sha256 content references.");
      const canonical = ref.trim();
      if (selected.has(canonical)) throw invalid("Selected artifacts must not contain duplicates.");
      selected.add(canonical);
    }
    if (selected.size) {
      if ([...selected].some((ref) => !items.some((item) => item.ref === ref))) throw new AppError({ kind: "precondition_required", status: 428, message: "One or more selected artifacts are no longer eligible for cleanup." });
      items = items.filter((item) => selected.has(item.ref));
      inventory.items = items;
      inventory.candidate_count = items.length;
      inventory.candidate_bytes = items.reduce((sum, item) => sum + item.bytes, 0);
    }
    const reviewId = typeof body.review_id === "string" ? body.review_id : "";
    if (reviewId) {
      const review = store.cleanupReviews.get(workspace);
      if (!review || review.status !== "open" || review.review_id !== reviewId || review.selected_refs.length !== selectedRefs.length || review.selected_refs.some((ref) => !selected.has(ref))) throw new AppError({ kind: "precondition_required", status: 428, message: "The cleanup review is no longer open or does not match the selected artifacts." });
    }
    for (const item of items) store.cleanedRefs.add(item.ref);
    const now = new Date().toISOString();
    const run: ArtifactCleanupSweepRun = { sweep_id: nextId(), workspace_id: workspace, requested_by: author, status: "completed", limit, candidate_count: inventory.candidate_count, candidate_bytes: inventory.candidate_bytes, deleted_count: items.length, deleted_bytes: inventory.candidate_bytes, already_gone_count: 0, skipped_count: 0, started_at: now, finished_at: now };
    if (reviewId) {
      const review = store.cleanupReviews.get(workspace);
      if (review) {
        const completed = { ...review, status: "completed" as const, completed_at: now, sweep_id: run.sweep_id, updated_by: run.requested_by, updated_at: now };
        store.cleanupReviews.set(workspace, completed);
        rememberCleanupReview(workspace, completed);
      }
      run.review_id = reviewId;
    }
    store.cleanupRuns.set(workspace, [run, ...(store.cleanupRuns.get(workspace) ?? [])].slice(0, 10));
    inventory.recent_sweeps = store.cleanupRuns.get(workspace) ?? [];
    return { inventory, run, deleted: items, already_gone: [], skipped: [], deleted_bytes: inventory.candidate_bytes };
  }

  const sharedCitationMatch = /^\/workspaces\/([^/]+)\/observations\/shared\/([^/]+)$/.exec(req.path);
  if (sharedCitationMatch) {
    const [, workspace, token] = sharedCitationMatch;
    recipientCaller(req, workspace);
    for (const shares of store.citationShares.values()) {
      const share = shares.find((one) => one.workspace_id === workspace && one.token === token && !one.revoked_at);
      if (!share) continue;
      const observation = (store.observations.get(share.source_id) ?? []).find((one) => one.observation_id === share.observation_id);
      if (!observation) throw missing();
      return citationContextFor(observation);
    }
    throw missing();
  }

  const citationShareRevokeMatch = /^\/workspaces\/([^/]+)\/sources\/shares\/([^/]+)\/revoke$/.exec(req.path);
  if (citationShareRevokeMatch) {
    const [, workspace, shareId] = citationShareRevokeMatch;
    const author = caller(req, workspace);
    for (const [observationId, shares] of store.citationShares) {
      const share = shares.find((one) => one.share_id === shareId && one.workspace_id === workspace);
      if (!share) continue;
      if (share.revoked_at) throw missing();
      share.revoked_at = new Date().toISOString();
      share.revoked_by = author;
      store.citationShares.set(observationId, shares);
      return safeCitationShare(share);
    }
    throw missing();
  }

  const citationSharesMatch = /^\/workspaces\/([^/]+)\/sources\/([^/]+)\/observations\/([^/]+)\/shares$/.exec(req.path);
  if (citationSharesMatch) {
    const [, workspace, sourceId, observationId] = citationSharesMatch;
    const author = caller(req, workspace);
    const source = sourceIn(workspace, sourceId);
    const observation = (store.observations.get(sourceId) ?? []).find((one) => one.observation_id === observationId && one.workspace_id === workspace);
    if (!observation || source.source_id !== observation.source_id) throw missing();
    const shares = store.citationShares.get(observationId) ?? [];
    if (req.method === "GET") return shares.map((share) => safeCitationShare(share));
    if (req.method !== "POST") return undefined;
    const share: CitationShare = {
      share_id: nextId(), workspace_id: workspace, source_id: sourceId, observation_id: observationId,
      created_by: author, created_at: new Date().toISOString(), token: nextId(),
    };
    store.citationShares.set(observationId, [share, ...shares]);
    return share;
  }

  const sourceGapRefreshMatch = /^\/workspaces\/([^/]+)\/source-alerts\/refresh-gaps$/.exec(req.path);
  if (sourceGapRefreshMatch) {
    const [, workspace] = sourceGapRefreshMatch;
    const author = caller({ ...req, method: "GET" }, workspace);
    if (req.method !== "POST") return undefined;
    return { active_gap_count: syncDerivedGapFixtureAlerts(workspace, author) };
  }

  const sourceAlertsMatch = /^\/workspaces\/([^/]+)\/source-alerts(?:\/([^/]+)\/seen)?$/.exec(req.path);
  if (sourceAlertsMatch) {
    const [, workspace, alertId] = sourceAlertsMatch;
    // Seen state is account-local attention metadata, so a reader may write it
    // even though source/capture mutations still require write access.
    const author = caller(alertId ? { ...req, method: "GET" } : req, workspace);
    if (!alertId) {
      if (req.method !== "GET") return undefined;
      const before = typeof req.params.before === "string" ? req.params.before : undefined;
      const all = [...store.alerts.values()]
        .filter((alert) => alert.workspace_id === workspace && alert.active !== false)
        .sort((left, right) => right.created_at.localeCompare(left.created_at) || right.alert_id.localeCompare(left.alert_id));
      const start = before ? Math.max(0, all.findIndex((alert) => alert.alert_id === before) + 1) : 0;
      const items = all.slice(start, start + 50).map((alert) => {
        const seen = store.alertSeen.get(`${author}:${alert.alert_id}`);
        return seen ? { ...alert, seen_at: seen } : alert;
      });
      return { items, next_cursor: start + items.length < all.length ? items.at(-1)?.alert_id ?? null : null };
    }
    if (req.method !== "POST") return undefined;
    const alert = store.alerts.get(alertId);
    if (!alert || alert.workspace_id !== workspace) throw missing();
    const seenAt = new Date().toISOString();
    store.alertSeen.set(`${author}:${alertId}`, seenAt);
    return { seen_at: seenAt };
  }

  const sourceAlertDeliveryMatch = /^\/workspaces\/([^/]+)\/source-alert-delivery$/.exec(req.path);
  if (sourceAlertDeliveryMatch) {
    const [, workspace] = sourceAlertDeliveryMatch;
    const author = caller(req, workspace);
    const key = `${workspace}:${author}`;
    const current = store.alertDelivery.get(key) ?? {
      workspace_id: workspace,
      account_id: author,
      email_enabled: false,
      kinds: [],
      updated_at: new Date().toISOString(),
    } satisfies SourceAlertDelivery;
    if (req.method === "GET") return current;
    if (req.method !== "PUT") return undefined;
    const body = (req.body ?? {}) as Partial<SourceAlertDeliveryInput>;
    const next: SourceAlertDelivery = {
      ...current,
      email_enabled: body.email_enabled === true,
      kinds: Array.isArray(body.kinds) ? body.kinds : current.kinds,
      updated_at: new Date().toISOString(),
    };
    store.alertDelivery.set(key, next);
    return next;
  }

  const dueWatchRunMatch = /^\/workspaces\/([^/]+)\/source-watches\/run-due$/.exec(req.path);
  if (dueWatchRunMatch) {
    const [, workspace] = dueWatchRunMatch;
    const author = caller(req, workspace);
    if (req.method !== "POST") return undefined;
    const now = new Date();
    const due = [...store.watches.values()]
      .filter((watch) => watch.workspace_id === workspace && watch.enabled && !!watch.next_run_at && new Date(watch.next_run_at).getTime() <= now.getTime() && (!watch.lease_until || new Date(watch.lease_until).getTime() <= now.getTime()))
      .sort((left, right) => (left.next_run_at ?? "").localeCompare(right.next_run_at ?? ""))[0];
    if (!due) return { claimed: false };
    const source = sourceIn(workspace, due.source_id);
    if (source.origin !== "reference" || !source.url) throw invalid("Only URL references can be monitored.");
    const owner = `fixture-worker/${author}/${nextId()}`;
    const leased: SourceWatch = { ...due, lease_owner: owner, lease_until: new Date(now.getTime() + 120_000).toISOString() };
    store.watches.set(due.source_id, leased);
    return (async () => {
      const content = `Fixture retained response from ${source.url}`;
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
      const sha256 = Array.from(new Uint8Array(digest), (x) => x.toString(16).padStart(2, "0")).join("");
      const changed = source.latest_capture?.sha256 !== sha256;
      const capture = changed ? await captureFor(source, content, "text/plain", author) : undefined;
      if (changed && capture) createSourceAlert(workspace, source, author, "capture_changed", capture);
      const completed = new Date();
      const next: SourceWatch = { ...leased, last_run_at: completed.toISOString(), last_status: changed ? "changed" : "unchanged", next_run_at: new Date(completed.getTime() + leased.interval_seconds * 1000).toISOString(), lease_owner: undefined, lease_until: undefined, ...(changed && capture ? { last_capture_id: capture.capture_id } : {}) };
      if (!changed) delete next.last_capture_id;
      store.watches.set(due.source_id, next);
      const run: SourceWatchRunResult = { watch: next, changed, ...(capture ? { capture } : {}) };
      return { claimed: true, run };
    })();
  }

  const watchRunMatch = /^\/workspaces\/([^/]+)\/sources\/([^/]+)\/watch\/run$/.exec(req.path);
  if (watchRunMatch) {
    const [, workspace, sourceId] = watchRunMatch;
    const author = caller(req, workspace);
    if (req.method !== "POST") return undefined;
    const source = sourceIn(workspace, sourceId);
    if (source.origin !== "reference" || !source.url) throw invalid("Only URL references can be monitored.");
    const watch = watchIn(workspace, sourceId);
    if (!watch.enabled) throw invalid("Enable source monitoring before running a watch.");
    if (watch.lease_owner && watch.lease_until && new Date(watch.lease_until).getTime() > Date.now()) throw new AppError({ kind: "conflict", status: 409, message: "A source watch is already running." });
    return (async () => {
      const content = `Fixture retained response from ${source.url}`;
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
      const sha256 = Array.from(new Uint8Array(digest), (x) => x.toString(16).padStart(2, "0")).join("");
      const changed = source.latest_capture?.sha256 !== sha256;
      const capture = changed ? await captureFor(source, content, "text/plain", author) : undefined;
      if (changed && capture) createSourceAlert(workspace, source, author, "capture_changed", capture);
      const now = new Date();
      const next: SourceWatch = { ...watch, last_run_at: now.toISOString(), last_status: changed ? "changed" : "unchanged", next_run_at: new Date(now.getTime() + watch.interval_seconds * 1000).toISOString(), ...(changed && capture ? { last_capture_id: capture.capture_id } : {}) };
      if (!changed) delete next.last_capture_id;
      store.watches.set(sourceId, next);
      const result: SourceWatchRunResult = { watch: next, changed, ...(capture ? { capture } : {}) };
      return result;
    })();
  }

  const watchMatch = /^\/workspaces\/([^/]+)\/sources\/([^/]+)\/watch$/.exec(req.path);
  if (watchMatch) {
    const [, workspace, sourceId] = watchMatch;
    const author = caller(req, workspace);
    const source = sourceIn(workspace, sourceId);
    if (source.origin !== "reference" || !source.url) throw invalid("Only URL references can be monitored.");
    if (req.method === "GET") return watchIn(workspace, sourceId);
    if (req.method !== "PUT") return undefined;
    const body = req.body as ConfigureSourceWatch;
    const interval = Number(body.interval_seconds);
    if (typeof body.enabled !== "boolean" || !Number.isInteger(interval) || interval < 900 || interval > 604800) throw invalid("Choose a monitoring interval between 15 minutes and 7 days.");
    const current = watchIn(workspace, sourceId);
    const now = new Date();
    const next: SourceWatch = { ...current, enabled: body.enabled, interval_seconds: interval, updated_by: author, updated_at: now.toISOString(), ...(body.enabled ? { next_run_at: new Date(now.getTime() + interval * 1000).toISOString() } : { next_run_at: undefined }) };
    store.watches.set(sourceId, next);
    return next;
  }

  const intakeReviewMatch = /^\/workspaces\/([^/]+)\/source-intake\/([^/]+)\/review$/.exec(req.path);
  if (intakeReviewMatch) {
    const [, workspace, intakeId] = intakeReviewMatch;
    const author = caller(req, workspace);
    if (req.method !== "PUT") return undefined;
    const candidate = intakeIn(workspace).find((one) => one.intake_id === intakeId);
    if (!candidate) throw missing();
    if (candidate.status !== "pending") throw new AppError({ kind: "conflict", status: 409, message: "This intake candidate has already been reviewed." });
    const body = req.body as ReviewSourceIntake;
    if (body.decision !== "approved" && body.decision !== "rejected") throw invalid("Choose approve or reject.");
    const note = typeof body.note === "string" ? body.note.trim() : "";
    if (!note || bytes(note) > 2000) throw invalid("A review note of up to 2,000 bytes is required.");
    return (async () => {
      const now = new Date().toISOString();
      const origin = candidate.origin ?? "reference";
      const next: SourceIntakeCandidate = { ...candidate, origin, status: body.decision, reviewed_by: author, reviewed_at: now, review_note: note };
      let source: SourceSummary | undefined;
      if (body.decision === "approved") {
        source = { source_id: nextId(), workspace_id: workspace, title: candidate.title, origin, ...(candidate.url ? { url: candidate.url } : {}), ...(candidate.filename ? { filename: candidate.filename } : {}), created_by: author, created_at: now, sensitivity: "internal", legal_hold: false, duplicate_policy: "warn", latest_capture: null };
        if (origin === "import") {
          const retained = store.intakeContent.get(intakeId);
          if (!retained) throw new AppError({ kind: "conflict", status: 409, message: "The staged import is no longer available for review." });
          if (retained.content_base64) await captureBinaryFor(source, decodeBase64(retained.content_base64), retained.media_type, author);
          else await captureFor(source, retained.content ?? "", retained.media_type, author);
        } else {
          store.captures.set(source.source_id, []);
        }
        next.source_id = source.source_id;
        store.sources.set(source.source_id, source);
      }
      store.intakeCandidates.set(workspace, intakeIn(workspace).map((one) => one.intake_id === intakeId ? next : one));
      store.intakeContent.delete(intakeId);
      return { candidate: next, ...(source ? { source } : {}) };
    })();
  }

  const intakeMatch = /^\/workspaces\/([^/]+)\/source-intake(?:\/([^/]+))?$/.exec(req.path);
  if (intakeMatch) {
    const [, workspace, intakeRouteId] = intakeMatch;
    const author = caller(req, workspace);
    const candidates = intakeIn(workspace);
    if (req.method === "GET" && intakeRouteId) {
      const candidate = candidates.find((one) => one.intake_id === intakeRouteId);
      if (!candidate) throw missing();
      return candidate;
    }
    if (req.method === "GET") {
      const status = String(req.params.status ?? "").trim();
      if (status && !["pending", "approved", "rejected"].includes(status)) throw invalid("Choose pending, approved, or rejected.");
      return page(candidates.filter((one) => !status || one.status === status), req, (one) => one.intake_id);
    }
    if (req.method !== "POST" || intakeRouteId) return undefined;
    const body = req.body as CreateSourceIntake;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const address = typeof body.url === "string" ? body.url.trim() : "";
    const note = typeof body.note === "string" ? body.note.trim() : "";
    const origin = body.origin ?? "reference";
    if (!title || bytes(title) > 400) throw invalid("Use a candidate title of up to 400 bytes.");
    if (bytes(note) > 2000) throw invalid("The intake note must be 2,000 bytes or smaller.");
    if (origin !== "reference" && origin !== "import") throw invalid("Choose a URL reference or imported file.");
    if (origin === "reference") {
      if (!address || bytes(address) > 4000) throw invalid("Add an HTTP or HTTPS candidate URL.");
      try {
        const parsed = new URL(address);
        if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error();
      } catch { throw invalid("Use an HTTP or HTTPS URL without credentials."); }
    }
    const intakeId = nextId();
    const createdAt = new Date().toISOString();
    let filename: string | undefined;
    let media_type: MediaType | undefined;
    let staged: { media_type: MediaType; content?: string; content_base64?: string } | undefined;
    if (origin === "import") {
      filename = typeof body.filename === "string" ? body.filename.trim() : "";
      if (!filename || bytes(filename) > 400) throw invalid("Add an imported filename of up to 400 bytes.");
      if (body.content_base64) {
        media_type = body.media_type;
        const binary = decodeBase64(body.content_base64);
        assertBinaryCapture(binary, media_type);
        staged = { media_type, content_base64: body.content_base64 };
      } else {
        const text = contentInput(body.content, body.media_type ?? "text/plain");
        media_type = text.media;
        staged = { media_type, content: text.content };
      }
    }
    const candidate: SourceIntakeCandidate = { intake_id: intakeId, workspace_id: workspace, title, origin, ...(address ? { url: address } : {}), ...(filename ? { filename } : {}), ...(media_type ? { media_type } : {}), ...(note ? { note } : {}), created_by: author, created_at: createdAt, status: "pending" };
    if (staged) store.intakeContent.set(intakeId, staged);
    store.intakeCandidates.set(workspace, [candidate, ...candidates]);
    return candidate;
  }

  const match = /^\/workspaces\/([^/]+)\/(sources|notes)(?:\/([^/]+))?(?:\/(captures|observations|fetch|retention))?(?:\/([^/]+))?$/.exec(req.path);
  if (!match) return undefined;
  const [, workspace, area, sourceId, child, captureId] = match;
  const author = caller(req, workspace);

  if (area === "notes") {
    const notes = store.notes.get(workspace) ?? [];
    if (req.method === "GET" && !sourceId) {
      const query = String(req.params.q ?? "").trim().toLowerCase();
      const contextKind = String(req.params.context_kind ?? "").trim();
      if (contextKind && !["question", "record", "event", "connection", "brief"].includes(contextKind)) throw invalid("Choose a supported working-note context.");
      if (query.length > 200) throw invalid("Note search must be 200 characters or fewer.");
      if (req.params.page === true || req.params.page === "true") {
        const result = page(
          notes.filter((note) => (!contextKind || note.context_kind === contextKind) && (!query || [note.note_id, note.body, note.author, note.context_kind ?? "", note.context_id ?? ""].some((field) => field.toLowerCase().includes(query)))),
          req,
          (note) => note.note_id,
        );
        return {
          ...result,
          items: result.items.map((note) => ({ ...note, mine: note.author === author })),
        } satisfies WorkingNotePage;
      }
      return notes.filter((note) => !contextKind || note.context_kind === contextKind).slice(0, 100).map((note) => ({ ...note, mine: note.author === author }));
    }
    if (req.method === "GET" && sourceId) {
      const note = notes.find((one) => one.note_id === sourceId);
      if (!note) throw missing();
      return { ...note, mine: note.author === author };
    }
    const body = String((req.body as { body?: string })?.body ?? "").trim();
    if (!body || bytes(body) > 20000) throw invalid("Write a note of up to 20,000 bytes.");
    if (req.method === "POST" && !sourceId) {
      const contextKind = String((req.body as { context_kind?: string })?.context_kind ?? "").trim();
      const contextID = String((req.body as { context_id?: string })?.context_id ?? "").trim();
      const context = contextKind || contextID ? readNoteContext(contextKind, contextID) : undefined;
      const now = new Date().toISOString();
      const note: WorkingNote = { note_id: nextId(), body, author, created_at: now, updated_at: now, edited: false, mine: true, ...(context ? { context_kind: context.kind, context_id: context.id } : {}) };
      store.notes.set(workspace, [note, ...notes]);
      return note;
    }
    if (req.method === "PUT" && sourceId) {
      const note = notes.find((one) => one.note_id === sourceId);
      if (!note) throw missing();
      if (note.author !== author) throw new AppError({ kind: "forbidden", status: 403, message: "Only the author can edit this note." });
      Object.assign(note, { body, updated_at: new Date().toISOString(), edited: true });
      return { ...note, mine: true };
    }
    return undefined;
  }

  if (!sourceId) {
    if (req.method === "GET") {
      const query = String(req.params.q ?? "").trim();
      if (query.length > 200) throw invalid("Source search must be 200 characters or fewer.");
      return page([...store.sources.values()].filter((one) => one.workspace_id === workspace && sourceMatches(one, query)), req, (one) => one.source_id);
    }
    if (req.method === "POST") {
      const body = req.body as AddSource;
      const title = body.title?.trim();
      if (!title || bytes(title) > 400 || title.includes("\0")) throw invalid("Use a source title of up to 400 bytes.");
      if (!["paste", "import", "reference"].includes(body.origin)) throw invalid("Choose how to add the source.");
      body.url = body.url?.trim();
      body.filename = body.filename?.trim();
      if (body.published_at !== undefined && (typeof body.published_at !== "string" || Number.isNaN(Date.parse(body.published_at)))) throw invalid("Publication time must be a valid timestamp.");
      if ((body.url && (bytes(body.url) > 4000 || body.url.includes("\0"))) || (body.filename && (bytes(body.filename) > 400 || body.filename.includes("\0")))) throw invalid("Source metadata is too long or contains an invalid character.");
      if (body.url) {
        try {
          const url = new URL(body.url);
          if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error();
        } catch { throw invalid("Use an HTTP or HTTPS URL without credentials."); }
      }
      if (body.origin === "reference" && (!body.url || body.content !== undefined || body.content_base64 !== undefined)) throw invalid("A URL reference needs a URL and has no captured material.");
      if (body.origin === "import" && !body.filename?.trim()) throw invalid("Choose a text or JSON file.");
      const retained = body.origin === "reference" ? null : body.content_base64 ? { binary: decodeBase64(body.content_base64), media: body.media_type as MediaType } : contentInput(body.content, body.media_type ?? "text/plain");
      const source: SourceSummary = {
        source_id: nextId(), workspace_id: workspace, title, origin: body.origin,
        ...(body.url ? { url: body.url } : {}), ...(body.filename ? { filename: body.filename } : {}),
        ...(body.published_at ? { published_at: new Date(body.published_at).toISOString() } : {}),
        created_by: author, created_at: new Date().toISOString(), sensitivity: "internal", legal_hold: false, duplicate_policy: "warn", latest_capture: null,
      };
      return (async () => {
        if (retained) {
          if ("binary" in retained) await captureBinaryFor(source, retained.binary, retained.media, author);
          else await captureFor(source, retained.content, retained.media, author);
        }
        store.sources.set(source.source_id, source);
        return source;
      })();
    }
    return undefined;
  }

  const source = sourceIn(workspace, sourceId);
  const captures = store.captures.get(sourceId) ?? [];
  if (req.method === "GET" && !child) return { source, captures: captures.map(({ content: _content, ...capture }) => capture) };
  if (child === "retention" && req.method === "PUT") {
    const body = req.body as SetSourceRetention;
    if (body.retention_until !== null && typeof body.retention_until !== "string") throw invalid("Retention date must be a timestamp or null.");
    if (body.retention_until !== null && Number.isNaN(Date.parse(body.retention_until))) throw invalid("Retention date must be a valid timestamp.");
    if (body.retention_until) source.retention_until = new Date(body.retention_until).toISOString();
    else delete source.retention_until;
    source.retention_updated_by = author;
    source.retention_updated_at = new Date().toISOString();
    return { source, captures: captures.map(({ content: _content, ...capture }) => capture) };
  }
  if (child === "fetch" && req.method === "POST") {
    if (source.purged_at) throw new AppError({ kind: "conflict", status: 409, message: "Source content has been purged." });
    if (source.origin !== "reference" || !source.url) throw invalid("Only URL references can be fetched.");
    return captureFor(source, `Fixture retained response from ${source.url}`, "text/plain", author);
  }
  if (child === "captures") {
    if (source.purged_at) throw new AppError({ kind: "conflict", status: 409, message: "Source content has been purged." });
    if (req.method === "GET" && captureId) {
      const capture = captures.find((one) => one.capture_id === captureId);
      if (!capture) throw missing();
      return capture;
    }
    if (req.method === "POST" && !captureId) {
      const body = req.body as { content?: string; content_base64?: string; media_type: MediaType };
      if (body.content_base64) return captureBinaryFor(source, decodeBase64(body.content_base64), body.media_type, author);
      const retained = contentInput(body.content, body.media_type);
      return captureFor(source, retained.content, retained.media, author);
    }
  }
  if (child === "observations") {
    const observations = store.observations.get(sourceId) ?? [];
    if (req.method === "GET" && captureId) {
      const observation = observations.find((one) => one.observation_id === captureId);
      if (!observation) throw missing();
      return observation;
    }
    if (req.method === "GET") return page(observations, req, (one) => one.observation_id);
    if (req.method === "POST") {
      const body = req.body as AddObservation;
      const capture = captures.find((one) => one.capture_id === body.capture_id);
      if (!capture) throw missing();
      const statement = body.statement?.trim();
      if (!statement || bytes(statement) > 4000 || statement.includes("\0")) throw invalid("Write a statement of up to 4,000 bytes.");
      if (!body.quote || bytes(body.quote) > 8000) throw invalid("Choose a passage of up to 8,000 bytes.");
      body.locator = body.locator?.trim();
      if (body.locator && (bytes(body.locator) > 400 || body.locator.includes("\0"))) throw invalid("The location label must be 400 bytes or smaller.");
      let citedContent: string;
      if (body.extraction_id) {
        const extraction = (store.extractions.get(sourceId) ?? []).find((one) => one.extraction_id === body.extraction_id && one.capture_id === capture.capture_id);
        if (!extraction || extraction.status !== "succeeded" || !extraction.text) throw invalid("Choose a successful extraction from this capture.");
        citedContent = extraction.text;
      } else {
        if (!isTextCapture(capture)) throw invalid("Binary captures cannot receive text observations.");
        citedContent = capture.content;
      }
      const start = body.quote_start ?? quoteOccurrences(citedContent, body.quote)[0];
      if (!Number.isInteger(start) || start < 0 || Array.from(citedContent).slice(start, start + Array.from(body.quote).length).join("") !== body.quote) throw invalid("The quote must match the cited text exactly.");
      const observation: ManualObservation = {
        observation_id: nextId(), workspace_id: workspace, source_id: sourceId, capture_id: capture.capture_id,
        ...(body.extraction_id ? { extraction_id: body.extraction_id } : {}),
        statement, quote: body.quote, quote_start: start, quote_end: start + Array.from(body.quote).length,
        ...(body.locator ? { locator: body.locator } : {}), author, recorded_at: new Date().toISOString(), origin: "manual",
      };
      store.observations.set(sourceId, [observation, ...observations]);
      return observation;
    }
  }
  return undefined;
}];

function connectionRevision(connection: ResearchConnection, revision: number, changedBy: string, changedAt: string, records: ResearchRecord[]): ResearchConnectionRevision {
  const from = records.find((record) => record.record_id === connection.from_record_id);
  const to = records.find((record) => record.record_id === connection.to_record_id);
  return {
    revision_id: nextId(), workspace_id: connection.workspace_id, connection_id: connection.connection_id, revision,
    from_record_id: connection.from_record_id, from_record_kind: from?.kind ?? "account", from_record_name: from?.name ?? connection.from_record_id,
    from_record_description: from?.description ?? "", from_record_observation_ids: [...(from?.observation_ids ?? [])],
    to_record_id: connection.to_record_id, to_record_kind: to?.kind ?? "account", to_record_name: to?.name ?? connection.to_record_id,
    to_record_description: to?.description ?? "", to_record_observation_ids: [...(to?.observation_ids ?? [])], kind: connection.kind, state: connection.state,
    rationale: connection.rationale, supporting_observation_ids: [...connection.supporting_observation_ids], opposing_observation_ids: [...connection.opposing_observation_ids],
    changed_by: changedBy, changed_at: changedAt,
  };
}

function readNoteContext(kind: string, id: string): NoteContext {
  if (!kind || !id || !["question", "record", "event", "connection", "brief"].includes(kind)) throw invalid("A note context needs a supported kind and identifier.");
  return { kind: kind as NoteContext["kind"], id };
}
