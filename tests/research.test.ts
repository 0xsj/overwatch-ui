import { test } from "node:test";
import assert from "node:assert/strict";
import { citedParts, citationQuality, quoteAt, quoteOccurrences } from "../lib/services/sources/citation.ts";
import { diffText } from "../lib/services/sources/diff.ts";
import { duplicateCaptureVersion } from "../lib/services/sources/history.ts";
import { mayWriteResearch, shellForPath } from "../app/(app)/_route-context.ts";
import type { Shell } from "../app/(app)/_shell.ts";
import { reviewBoundaryCopy } from "../lib/services/assistance/review-boundary.ts";
import { renderBriefRecipientHandoffMarkdown, renderBriefSnapshotMarkdown, snapshotEvidenceIds } from "../lib/services/brief/export.ts";
import { snapshotConnectionChanges, snapshotConnectionEvidenceChanges, snapshotConnectionRecordObservationChanges, snapshotQuestionObservationChanges } from "../lib/services/brief/history.ts";
import { filterBriefPickerRows, unresolvedBriefPickerIDs } from "../lib/services/brief/picker.ts";
import { filterLoadedRows, unresolvedIDs } from "../lib/query/filter.ts";
import type { BriefRecipientHandoff, BriefSnapshot } from "../lib/services/brief/index.ts";
import { createBriefDraft, listBriefDrafts, readBriefDraft, readBriefSnapshotActivity } from "../lib/services/brief/index.ts";
import type { Evidence, EvidenceCluster } from "../lib/services/review/index.ts";
import { readEvidenceByIDs, relationCounts } from "../lib/services/review/index.ts";
import type { EvidenceRelation } from "../lib/services/review/index.ts";
import { clusterCoverage, questionGap, recordCoverage } from "../lib/services/review/coverage.ts";
import type { InvestigationQuestion } from "../lib/services/questions/index.ts";
import type { ResearchRecord } from "../lib/services/research-records/index.ts";
import { listQuestions, readQuestionsByIDs } from "../lib/services/questions/index.ts";
import type { ResearchConnectionRevision } from "../lib/services/research-connections/index.ts";
import { createResearchConnectionReview, listResearchConnectionReviews, listResearchConnections, readResearchConnectionReview, readResearchConnectionSummary, readResearchConnectionsByIDs } from "../lib/services/research-connections/index.ts";
import { archiveResearchRecord, listResearchRecordRevisions, listResearchRecords, readResearchRecordNeighborhood, readResearchRecordSummary, readResearchRecordsByIDs, restoreResearchRecord } from "../lib/services/research-records/index.ts";
import { readResearchResolutionImpact } from "../lib/services/research-resolutions/index.ts";
import { createResearchResolutionSet, listResearchResolutionSets, readResearchResolutionSetImpact, reviewResearchResolutionSet, reverseResearchResolutionSet } from "../lib/services/research-resolution-sets/index.ts";
import { connectionRevisionChanges, connectionRevisionEvidenceChanges, connectionRevisionObservationIds } from "../lib/services/research-connections/history.ts";
import { recordCoverageQuestionDraft, recordHref } from "../lib/services/research-records/navigation.ts";
import { placePrecisionLabel, projectPlaceGeometry } from "../lib/services/research-records/map.ts";
import { connectionHref, connectionQuestionDraft } from "../lib/services/research-connections/navigation.ts";
import { eventHref, eventRelationshipHref, eventRelationshipQuestionDraft, eventRevisionHref } from "../lib/services/events/navigation.ts";
import { createEventCluster, createEventRelationship, listEventAccounts, listEventClusters, listEventRelationships, reconcileEventAccounts, reviewEventCluster, reviewEventRelationship, type TimelineEvent } from "../lib/services/events/index.ts";
import { compareEvents, sequenceEvents } from "../lib/services/events/temporal.ts";
import { noteContextHref, noteDraftHref, noteHref } from "../lib/services/notes/navigation.ts";
import { listWorkingNotesPage, writeWorkingNote } from "../lib/services/notes/index.ts";
import { questionContextHref, questionDraftHref, questionEvidenceHref, questionHref } from "../lib/services/questions/navigation.ts";
import { observationHref, sourceHref } from "../lib/services/sources/navigation.ts";
import { addSource, configureSourceWatch, createCitationShare, createSourceIntake, listCitationShares, listSourceAlerts, listSourceIntake, listSources, markSourceAlertSeen, readSharedCitation, readSourceWatch, refreshSourceGapAlerts, reviewSourceIntake, revokeCitationShare, runSourceWatch, searchSources, setSourceDuplicatePolicy, setSourcePublication } from "../lib/services/sources/sources.api.ts";
import { repeatedAssets } from "../lib/services/entities/repeated.ts";
import { readHealth } from "../lib/services/health/index.ts";
import { getWorkspaceLogs } from "../lib/services/ledger/ledger.api.ts";
import { listChanges, markChangesSeen } from "../lib/services/changes/changes.api.ts";
import { textOccurrences } from "../lib/services/sources/search.ts";
import { researchRecordCandidates, synthesisText } from "../lib/services/research-records/candidates.ts";
import { generateAssistance, readAssistanceHistory, readAssistanceProviderPolicy, readLatestAssistance, setAssistanceProviderPolicy } from "../lib/services/assistance/index.ts";
import { createEvidenceCluster, createEvidenceComparison, createEvidenceQuestionSuggestions, createEvidenceSynthesis, listEvidenceBoard, listEvidenceClusterCoverage, listEvidenceClusters, listEvidenceComparisons, listEvidenceQuestionSuggestions, listEvidenceSourceLinks, listEvidenceSyntheses, readEvidenceQuestionSuggestions, setEvidenceSourceLink, updateEvidenceCluster } from "../lib/services/review/index.ts";
import type { HttpClient } from "../lib/http/port.ts";
import { errorFromResponse, errorFromTransport } from "../lib/http/envelope.ts";
import { retryDelay, shouldRetry } from "../lib/query/client.ts";

test("transport timeouts remain retryable and distinct from cancellation", () => {
  const timedOut = errorFromTransport(new DOMException("The operation timed out.", "TimeoutError"));
  assert.equal(timedOut.kind, "timeout");
  assert.equal(timedOut.retryable, true);
  assert.equal(timedOut.message, "The request timed out. Try again.");

  const cancelled = errorFromTransport(new DOMException("The operation was aborted.", "AbortError"));
  assert.equal(cancelled.kind, "canceled");
  assert.equal(cancelled.retryable, false);
});

test("rate limits honor retry guidance without retrying refusals", async () => {
  assert.equal(shouldRetry(0, { status: 429, kind: "rate_limited" }), true);
  assert.equal(shouldRetry(0, { status: 403, kind: "forbidden" }), false);
  assert.equal(retryDelay(0, { retryAfterMs: 2500 }), 2500);
  assert.equal(retryDelay(1, { retryAfterMs: 120_000 }), 60_000);
  assert.equal(retryDelay(0, { kind: "unavailable" }), 1000);
  assert.equal(retryDelay(1, { kind: "unavailable" }), 2000);

  const guided = await errorFromResponse(new Response("", { status: 429, headers: { "retry-after": "3", "x-request-id": "req-rate-limit" } }));
  assert.equal(guided.kind, "rate_limited");
  assert.equal(guided.retryAfterMs, 3000);
  assert.equal(guided.requestId, "req-rate-limit");

  const capped = await errorFromResponse(new Response("", { status: 503, headers: { "retry-after": "999999" } }));
  assert.equal(capped.retryAfterMs, 60_000);
});

test("citations use code points across emoji, accents and repeated passages", () => {
  const content = "🚉 İzmir — service paused.\n🚉 İzmir — service paused.";
  const quote = "İzmir — service paused.";
  const positions = quoteOccurrences(content, quote);
  assert.deepEqual(positions, [2, 28]);
  const parts = citedParts(content, positions[1], positions[1] + Array.from(quote).length, quote);
  assert.equal(parts?.cited, quote);
  assert.equal(parts?.before, "🚉 İzmir — service paused.\n🚉 ");
});

test("citation quality reports exact artifact ranges and mismatches", () => {
  const content = "🚉 İzmir — service paused.";
  const quote = "İzmir — service paused.";
  assert.deepEqual(citationQuality(content, 2, 25, quote), { status: "verified", range: { start: 2, end: 25, length: 23 } });
  assert.equal(citationQuality(content, 3, 26, quote).status, "mismatch");
  assert.equal(citationQuality(content, -1, 2, quote).reason, "The stored range is outside this artifact.");
});

test("overlapping matches can identify the exact selected occurrence", () => {
  assert.deepEqual(quoteOccurrences("aaa", "aa"), [0, 1]);
  assert.deepEqual(quoteOccurrences("abc", ""), []);
});

test("search handoff offsets remain Unicode-exact", () => {
  const content = "🚉 İzmir — service paused. 🚉 İzmir";
  assert.equal(quoteAt(content, 2, "İzmir"), true);
  assert.equal(quoteAt(content, 3, "İzmir"), false);
  assert.equal(quoteAt(content, 99, "İzmir"), false);
});

test("place map projection preserves coordinate extremes and precision language", () => {
  assert.deepEqual(projectPlaceGeometry({ latitude: 90, longitude: -180, precision: "exact", observation_ids: ["observation-1"] }, 1000, 520), { x: 0, y: 0 });
  assert.deepEqual(projectPlaceGeometry({ latitude: 0, longitude: 0, precision: "approximate", observation_ids: [] }, 1000, 520), { x: 500, y: 260 });
  assert.deepEqual(projectPlaceGeometry({ latitude: -90, longitude: 180, precision: "region", observation_ids: [] }, 1000, 520), { x: 1000, y: 520 });
  assert.equal(placePrecisionLabel("exact"), "Exact coordinate");
  assert.equal(placePrecisionLabel("approximate"), "Approximate coordinate");
  assert.equal(placePrecisionLabel("region"), "Regional coordinate");
});

test("AI review boundary labels keep proposals, accepted assistance and authored evidence distinct", () => {
  assert.match(reviewBoundaryCopy.proposal.text, /not evidence/);
  assert.match(reviewBoundaryCopy.accepted.text, /Record a cited observation/);
  assert.match(reviewBoundaryCopy.authored.text, /explicitly save/);
  assert.notEqual(reviewBoundaryCopy.proposal.label, reviewBoundaryCopy.accepted.label);
  assert.notEqual(reviewBoundaryCopy.accepted.label, reviewBoundaryCopy.authored.label);
});

test("latest assistance reads are capture-scoped and preserve the extraction selector", async () => {
  let seenPath = "";
  let seenParams: Record<string, string | number | boolean | undefined> | undefined;
  const http = {
    get: async (path: string, options?: { params?: Record<string, string | number | boolean | undefined> }) => {
      seenPath = path;
      seenParams = options?.params;
      return { operation: null, proposals: [] };
    },
  } as unknown as HttpClient;
  const found = await readLatestAssistance(http, "workspace/1", "source/2", "capture/3", "extraction/4");
  assert.deepEqual(found, { operation: null, proposals: [] });
  assert.equal(seenPath, "/workspaces/workspace%2F1/sources/source%2F2/captures/capture%2F3/assistance");
  assert.deepEqual(seenParams, { extraction_id: "extraction/4" });
});

test("assistance retries preserve the original capture route and operation lineage", async () => {
  let seenPath = "";
  let seenBody: unknown;
  const http = {
    post: async (path: string, options?: { body?: unknown }) => {
      seenPath = path;
      seenBody = options?.body;
      return { operation: { operation_id: "retry-1" }, proposals: [] };
    },
  } as unknown as HttpClient;
  await generateAssistance(http, "case/a", "source/1", "capture/2", "extraction/3", "operation/4");
  assert.equal(seenPath, "/workspaces/case%2Fa/sources/source%2F1/captures/capture%2F2/assistance");
  assert.deepEqual(seenBody, { extraction_id: "extraction/3", retry_operation_id: "operation/4" });
});

test("assistance provider policy is workspace-scoped and explicit", async () => {
  const seen: Array<{ method: string; path: string; body?: unknown }> = [];
  const http = {
    get: async (path: string) => {
      seen.push({ method: "GET", path });
      return { workspace_id: "case/a", allow_external: false };
    },
    put: async (path: string, options?: { body?: unknown }) => {
      seen.push({ method: "PUT", path, body: options?.body });
      return { workspace_id: "case/a", allow_external: true };
    },
  } as unknown as HttpClient;
  assert.equal((await readAssistanceProviderPolicy(http, "case/a")).allow_external, false);
  assert.equal((await setAssistanceProviderPolicy(http, "case/a", true)).allow_external, true);
  assert.deepEqual(seen, [
    { method: "GET", path: "/workspaces/case%2Fa/assistance/policy" },
    { method: "PUT", path: "/workspaces/case%2Fa/assistance/policy", body: { allow_external: true } },
  ]);
});

test("repeated asset comparison keeps exact values and target provenance", () => {
  const base = { kind: "host" as const, value: "edge.example", origin: "observed" as const, observations: 2, judgement: { state: "triaged" as const } };
  const rows = [
    { ...base, fragment_id: "fragment-a", attribution_id: "attribution-a", claimant: "rule" as const, basis: "scope one", root_entity_id: "root-a", target_id: "target-a" },
    { ...base, fragment_id: "fragment-b", attribution_id: "attribution-b", claimant: "human" as const, basis: "review two", root_entity_id: "root-b", target_id: "target-b" },
    { ...base, fragment_id: "fragment-c", attribution_id: "attribution-c", claimant: "rule" as const, basis: "scope three", root_entity_id: "root-c", target_id: "target-c", value: "other.example" },
  ];
  const found = repeatedAssets(rows);
  assert.equal(found.length, 1);
  assert.equal(found[0].value, "edge.example");
  assert.deepEqual(found[0].target_ids, ["target-a", "target-b"]);
  assert.deepEqual(found[0].assets.map((asset) => asset.root_entity_id), ["root-a", "root-b"]);
});

test("workspace health reads its measured probe contract", async () => {
  let seenPath = "";
  const http = {
    get: async (path: string) => {
      seenPath = path;
      return { at: "2026-09-19T12:00:00Z", trustworthy: true, probes: [], symptoms: [] };
    },
  } as unknown as HttpClient;
  const report = await readHealth(http, "case/a");
  assert.equal(seenPath, "/workspaces/case%2Fa/health");
  assert.equal(report.trustworthy, true);
});

test("causal logs preserve workspace scope and keyset pagination", async () => {
  let seenPath = "";
  let seenParams: Record<string, string | number | boolean | undefined> | undefined;
  const http = {
    get: async (path: string, options?: { params?: Record<string, string | number | boolean | undefined> }) => {
      seenPath = path;
      seenParams = options?.params;
      return { entries: [], next: undefined };
    },
  } as unknown as HttpClient;
  await getWorkspaceLogs(http, "case/a", { after: "cursor-1", limit: 50 });
  assert.equal(seenPath, "/workspaces/case%2Fa/logs");
  assert.deepEqual(seenParams, { after: "cursor-1", limit: 50, facet: undefined });
});

test("what's new keeps the comparison workspace-scoped and server-derived", async () => {
  let seenPath = "";
  let method = "";
  const http = {
    get: async (path: string) => {
      seenPath = path;
      return { changes: [], comparisons: [] };
    },
    post: async (path: string) => {
      method = path;
      return { seen_at: "2026-09-19T12:00:00Z" };
    },
  } as unknown as HttpClient;
  const page = await listChanges(http, "case/a");
  assert.equal(seenPath, "/workspaces/case%2Fa/changes");
  assert.deepEqual(page.changes, []);
  assert.equal((await markChangesSeen(http, "case/a")).seen_at, "2026-09-19T12:00:00Z");
  assert.equal(method, "/workspaces/case%2Fa/changes/seen");
});

test("source search sends a normalized query alongside the cursor", async () => {
  let seenPath = "";
  let seenParams: Record<string, string | number | boolean | undefined> | undefined;
  const http = {
    get: async (path: string, options?: { params?: Record<string, string | number | boolean | undefined> }) => {
      seenPath = path;
      seenParams = options?.params;
      return { items: [], next_cursor: null };
    },
  } as unknown as HttpClient;
  await listSources(http, "case a", "cursor-1", "  Harbor bulletin  ");
  assert.equal(seenPath, "/workspaces/case%20a/sources");
  assert.deepEqual(seenParams, { before: "cursor-1", q: "Harbor bulletin", limit: 50 });
});

test("source intake preserves an explicit publication timestamp", async () => {
  let seenPath = "";
  let seenBody: unknown;
  const http = {
    post: async (path: string, options?: { body?: unknown }) => {
      seenPath = path;
      seenBody = options?.body;
      return { source_id: "source-1" };
    },
  } as unknown as HttpClient;
  await addSource(http, "case a", {
    title: "Harbor bulletin",
    origin: "reference",
    url: "https://example.test/harbor-bulletin",
    published_at: "2026-09-18T08:30:00.000Z",
  });
  assert.equal(seenPath, "/workspaces/case%20a/sources");
  assert.deepEqual(seenBody, {
    title: "Harbor bulletin",
    origin: "reference",
    url: "https://example.test/harbor-bulletin",
    published_at: "2026-09-18T08:30:00.000Z",
  });
});

test("source publication edits preserve the workspace-scoped metadata route", async () => {
  let seenPath = "";
  let seenBody: unknown;
  const http = {
    put: async (path: string, options?: { body?: unknown }) => {
      seenPath = path;
      seenBody = options?.body;
      return { source: { source_id: "source-1" }, captures: [] };
    },
  } as unknown as HttpClient;
  await setSourcePublication(http, "case a", "source/1", { published_at: null });
  assert.equal(seenPath, "/workspaces/case%20a/sources/source%2F1/publication");
  assert.deepEqual(seenBody, { published_at: null });
});

test("source duplicate policy edits preserve the workspace-scoped metadata route", async () => {
  let seenPath = "";
  let seenBody: unknown;
  const http = {
    put: async (path: string, options?: { body?: unknown }) => {
      seenPath = path;
      seenBody = options?.body;
      return { source: { source_id: "source-1" }, captures: [] };
    },
  } as unknown as HttpClient;
  await setSourceDuplicatePolicy(http, "case a", "source/1", { duplicate_policy: "block" });
  assert.equal(seenPath, "/workspaces/case%20a/sources/source%2F1/duplicate-policy");
  assert.deepEqual(seenBody, { duplicate_policy: "block" });
});

test("source intake preserves staged discovery and review routes", async () => {
  const seen: string[] = [];
  const http = {
    get: async (path: string) => { seen.push(`GET ${path}`); return { items: [], next_cursor: null }; },
    post: async (path: string, options?: { body?: unknown }) => { seen.push(`POST ${path}`); assert.deepEqual(options?.body, { title: "Harbor bulletin", url: "https://example.test/harbor", note: "Feed hit" }); return { intake_id: "intake-1" }; },
    put: async (path: string, options?: { body?: unknown }) => { seen.push(`PUT ${path}`); assert.deepEqual(options?.body, { decision: "approved", note: "Relevant" }); return { candidate: { intake_id: "intake-1" }, source: { source_id: "source-1" } }; },
  } as unknown as HttpClient;
  await listSourceIntake(http, "case a", "pending");
  await createSourceIntake(http, "case a", { title: "Harbor bulletin", url: "https://example.test/harbor", note: "Feed hit" });
  await reviewSourceIntake(http, "case a", "intake/1", { decision: "approved", note: "Relevant" });
  assert.deepEqual(seen, ["GET /workspaces/case%20a/source-intake", "POST /workspaces/case%20a/source-intake", "PUT /workspaces/case%20a/source-intake/intake%2F1/review"]);
});

test("source intake preserves imported-file review payloads", async () => {
  let seenBody: unknown;
  const http = {
    post: async (_path: string, options?: { body?: unknown }) => { seenBody = options?.body; return { intake_id: "intake-2" }; },
  } as unknown as HttpClient;
  await createSourceIntake(http, "case a", { origin: "import", title: "Notice PDF", filename: "notice.pdf", media_type: "application/pdf", content_base64: "JVBERi0xLjct", note: "Reviewed bundle" });
  assert.deepEqual(seenBody, { origin: "import", title: "Notice PDF", filename: "notice.pdf", media_type: "application/pdf", content_base64: "JVBERi0xLjct", note: "Reviewed bundle" });
});

test("source monitoring preserves schedule, read, and run routes", async () => {
  const seen: string[] = [];
  let configured: unknown;
  const http = {
    get: async (path: string) => { seen.push(`GET ${path}`); return { source_id: "source-1", workspace_id: "case a", enabled: false, interval_seconds: 3600, last_status: "never" }; },
    put: async (path: string, options?: { body?: unknown }) => { seen.push(`PUT ${path}`); configured = options?.body; return { source_id: "source-1", workspace_id: "case a", enabled: true, interval_seconds: 900, last_status: "never" }; },
    post: async (path: string) => { seen.push(`POST ${path}`); return { watch: { source_id: "source-1", workspace_id: "case a", enabled: true, interval_seconds: 900, last_status: "unchanged" }, changed: false }; },
  } as unknown as HttpClient;
  await readSourceWatch(http, "case a", "source/1");
  await configureSourceWatch(http, "case a", "source/1", { enabled: true, interval_seconds: 900 });
  await runSourceWatch(http, "case a", "source/1");
  assert.deepEqual(configured, { enabled: true, interval_seconds: 900 });
  assert.deepEqual(seen, ["GET /workspaces/case%20a/sources/source%2F1/watch", "PUT /workspaces/case%20a/sources/source%2F1/watch", "POST /workspaces/case%20a/sources/source%2F1/watch/run"]);
});

test("source alerts preserve list and account-seen routes", async () => {
  const seen: string[] = [];
  let seenParams: Record<string, string | number | boolean | undefined> | undefined;
  const http = {
    get: async (path: string, options?: { params?: Record<string, string | number | boolean | undefined> }) => {
      seen.push(`GET ${path}`);
      seenParams = options?.params;
      return { items: [], next_cursor: null };
    },
    post: async (path: string, options?: { body?: unknown }) => {
      seen.push(`POST ${path}`);
      assert.deepEqual(options?.body, {});
      return { seen_at: "2026-09-20T12:00:00Z" };
    },
  } as unknown as HttpClient;
  await listSourceAlerts(http, "case a", "cursor/1");
  await markSourceAlertSeen(http, "case a", "alert/1");
  assert.deepEqual(seenParams, { before: "cursor/1", limit: 50 });
  assert.deepEqual(seen, [
    "GET /workspaces/case%20a/source-alerts",
    "POST /workspaces/case%20a/source-alerts/alert%2F1/seen",
  ]);
});

test("source gap refresh preserves the explicit materialization route", async () => {
  let seenPath = "";
  let seenBody: unknown;
  const http = {
    post: async (path: string, options?: { body?: unknown }) => {
      seenPath = path;
      seenBody = options?.body;
      return { active_gap_count: 2 };
    },
  } as unknown as HttpClient;
  const result = await refreshSourceGapAlerts(http, "case a");
  assert.deepEqual(result, { active_gap_count: 2 });
  assert.equal(seenPath, "/workspaces/case%20a/source-alerts/refresh-gaps");
  assert.deepEqual(seenBody, {});
});

test("brief draft assistance preserves workspace, cursor and citation contracts", async () => {
  const seen: string[] = [];
  let seenParams: Record<string, string | number | boolean | undefined> | undefined;
  let createdBody: unknown;
  const http = {
    get: async (path: string, options?: { params?: Record<string, string | number | boolean | undefined> }) => {
      seen.push(`GET ${path}`);
      if (path.endsWith("/drafts")) seenParams = options?.params;
      return path.endsWith("draft-1") ? { brief_draft_id: "draft-1" } : { items: [], next_cursor: null };
    },
    post: async (path: string, options?: { body?: unknown }) => {
      seen.push(`POST ${path}`);
      createdBody = options?.body;
      return { brief_draft_id: "draft-1" };
    },
  } as unknown as HttpClient;

  await listBriefDrafts(http, "case/a", "cursor-1");
  await readBriefDraft(http, "case/a", "draft/1");
  await createBriefDraft(http, "case/a", ["observation-1", "observation-2"]);
  assert.deepEqual(seen, [
    "GET /workspaces/case%2Fa/brief/drafts",
    "GET /workspaces/case%2Fa/brief/drafts/draft%2F1",
    "POST /workspaces/case%2Fa/brief/drafts",
  ]);
  assert.deepEqual(seenParams, { before: "cursor-1", limit: 20 });
  assert.deepEqual(createdBody, { observation_ids: ["observation-1", "observation-2"] });
});

test("citation shares preserve the workspace-scoped management and recipient paths", async () => {
  const seen: string[] = [];
  let createdBody: unknown;
  const http = {
    get: async (path: string) => { seen.push(`GET ${path}`); return path.includes("shared") ? { visibility: "recipient" } : []; },
    post: async (path: string, options?: { body?: unknown }) => { seen.push(`POST ${path}`); createdBody = options?.body; return { share_id: "share-1", token: "token-1" }; },
  } as unknown as HttpClient;
  await createCitationShare(http, "case/a", "source/1", "observation/2");
  await listCitationShares(http, "case/a", "source/1", "observation/2");
  await revokeCitationShare(http, "case/a", "share/1");
  await readSharedCitation(http, "case/a", "token/1");
  assert.deepEqual(createdBody, {});
  assert.deepEqual(seen, [
    "POST /workspaces/case%2Fa/sources/source%2F1/observations/observation%2F2/shares",
    "GET /workspaces/case%2Fa/sources/source%2F1/observations/observation%2F2/shares",
    "POST /workspaces/case%2Fa/sources/shares/share%2F1/revoke",
    "GET /workspaces/case%2Fa/observations/shared/token%2F1",
  ]);
});

test("claims board preserves bounded filters and cursor contract", async () => {
  let seenPath = "";
  let seenParams: Record<string, string | number | boolean | undefined> | undefined;
  const http = {
    get: async (path: string, options?: { params?: Record<string, string | number | boolean | undefined> }) => {
      seenPath = path;
      seenParams = options?.params;
      return { items: [], next_cursor: null };
    },
  } as unknown as HttpClient;
  await listEvidenceBoard(http, "case/a", "cursor-1", "  harbor  ", "source/1", "contradiction", "record/1", "event/1", "2026-09-01", "2026-09-30", true);
  assert.equal(seenPath, "/workspaces/case%2Fa/evidence/board");
  assert.deepEqual(seenParams, { before: "cursor-1", q: "harbor", source: "source/1", record: "record/1", event: "event/1", state: "contradiction", date_from: "2026-09-01", date_to: "2026-09-30", unresolved: "true", limit: 50 });
});

test("cluster coverage preserves its workspace-scoped page contract", async () => {
  let seenPath = "";
  let seenParams: Record<string, string | number | boolean | undefined> | undefined;
  const http = {
    get: async (path: string, options?: { params?: Record<string, string | number | boolean | undefined> }) => {
      seenPath = path;
      seenParams = options?.params;
      return { items: [], next_cursor: null };
    },
  } as unknown as HttpClient;
  await listEvidenceClusterCoverage(http, "case/a", "cursor-2");
  assert.equal(seenPath, "/workspaces/case%2Fa/evidence/clusters/coverage");
  assert.deepEqual(seenParams, { before: "cursor-2", limit: 50 });
});

test("workspace text search preserves its bounded query and cursor contract", async () => {
  let seenPath = "";
  let seenParams: Record<string, string | number | boolean | undefined> | undefined;
  const http = {
    get: async (path: string, options?: { params?: Record<string, string | number | boolean | undefined> }) => {
      seenPath = path;
      seenParams = options?.params;
      return { items: [], next_cursor: null };
    },
  } as unknown as HttpClient;
  await searchSources(http, "case a", "  East Quay  ", "cursor-1");
  assert.equal(seenPath, "/workspaces/case%20a/search");
  assert.deepEqual(seenParams, { q: "East Quay", before: "cursor-1", limit: 50 });
});

test("source search handoff preserves the return target and exact observation draft", () => {
  const href = sourceHref("case a", "source/1", "capture/2", undefined, "/investigation/case%20a/sources?search=East%20Quay", "East Quay", 0, "extraction/3", "East Quay", 17);
  assert.equal(href, "/investigation/case%20a/sources/source%2F1?capture=capture%2F2&return=%2Finvestigation%2Fcase%2520a%2Fsources%3Fsearch%3DEast%2520Quay&find=East+Quay&match=0&extraction=extraction%2F3&observe_quote=East+Quay&observe_start=17");
});

test("source handoff omits invalid offsets and bounds draft quotes", () => {
  const base = sourceHref("case", "source", "capture");
  assert.equal(sourceHref("case", "source", "capture", undefined, undefined, undefined, undefined, undefined, "East Quay", -1), base);
  const bounded = sourceHref("case", "source", "capture", undefined, undefined, undefined, undefined, undefined, "x".repeat(201), 0);
  assert.equal(new URLSearchParams(bounded.split("?")[1]).get("observe_quote")?.length, 200);
});

test("observation destinations preserve exact extraction and quote provenance", () => {
  assert.equal(observationHref("case a", { source_id: "source/1", capture_id: "capture/2", observation_id: "observation/3", extraction_id: "extraction/4", quote: "East Quay", quote_start: 17 }, "/investigation/case%20a/records?record=record%2F1"), "/investigation/case%20a/sources/source%2F1?capture=capture%2F2&citation=observation%2F3&return=%2Finvestigation%2Fcase%2520a%2Frecords%3Frecord%3Drecord%252F1&extraction=extraction%2F4&observe_quote=East+Quay&observe_start=17");
});

test("capture text search returns overlapping Unicode code-point occurrences", () => {
  assert.deepEqual(textOccurrences("🚉 İzmir — service paused. 🚉 İzmir", "İzmir"), [2, 28]);
  assert.deepEqual(textOccurrences("Alpha and alpha", "ALPHA"), [0, 10]);
  assert.deepEqual(textOccurrences("aaaa", "aa"), [0, 1, 2]);
  assert.deepEqual(textOccurrences("anything", ""), []);
});

test("assistance history reads the same capture scope with a bounded limit", async () => {
  let seenPath = "";
  let seenParams: Record<string, string | number | boolean | undefined> | undefined;
  const http = {
    get: async (path: string, options?: { params?: Record<string, string | number | boolean | undefined> }) => {
      seenPath = path;
      seenParams = options?.params;
      return { items: [] };
    },
  } as unknown as HttpClient;
  const found = await readAssistanceHistory(http, "workspace", "source", "capture");
  assert.deepEqual(found, { items: [] });
  assert.equal(seenPath, "/workspaces/workspace/sources/source/captures/capture/assistance/history");
  assert.deepEqual(seenParams, { extraction_id: undefined, limit: 20 });
});

test("historical evidence hydration keeps valid rows when one citation is missing", async () => {
  const found = { observation_id: "found" } as Evidence;
  const http = {
    get: async (path: string) => {
      if (path.endsWith("/missing")) throw Object.assign(new Error("Observation no longer exists"), { kind: "not_found" });
      return found;
    },
  } as unknown as HttpClient;
  const rows = await readEvidenceByIDs(http, "case", ["found", "missing"]);
  assert.deepEqual(rows, [found]);
});

test("historical evidence hydration does not hide server failures", async () => {
  const http = {
    get: async () => { throw Object.assign(new Error("Review service unavailable"), { kind: "unavailable" }); },
  } as unknown as HttpClient;
  await assert.rejects(readEvidenceByIDs(http, "case", ["observation"]), /Review service unavailable/);
});

test("review ledger counts preserve every persisted decision kind", () => {
  const relations = [
    { kind: "supports" },
    { kind: "supports" },
    { kind: "contradicts" },
    { kind: "repeats" },
    { kind: "unresolved" },
  ] as EvidenceRelation[];
  assert.deepEqual(relationCounts(relations), { supports: 2, contradicts: 1, repeats: 1, unresolved: 1 });
});

test("record coverage distinguishes corroboration gaps from conflicting evidence", () => {
  const record = { record_id: "record-1", observation_ids: ["one", "two", "three"] } as ResearchRecord;
  const relation = (left: string, right: string, kind: EvidenceRelation["kind"]): EvidenceRelation => ({ left_observation_id: left, right_observation_id: right, kind } as EvidenceRelation);
  const coverage = recordCoverage(record, [relation("one", "two", "supports"), relation("two", "three", "contradicts")]);
  assert.equal(coverage.supporting_count, 1);
  assert.equal(coverage.contradicting_count, 1);
  assert.equal(coverage.unreviewed_internal_pairs, 1);
  assert.equal(coverage.status, "contradiction_found");
});

test("record coverage question drafts preserve the authored record origin and citations", () => {
  assert.deepEqual(recordCoverageQuestionDraft({ recordId: "record/1", name: "@harborline", kind: "account", description: "A provisional account record.", status: "contradiction_found", observationCount: 2, supportingCount: 1, contradictingCount: 1, unresolvedCount: 0, observationIds: ["observation/1", "observation/2", "observation/1"] }), {
    prompt: "What evidence would corroborate or challenge the account record “@harborline”?",
    context: "A provisional account record. Record coverage is currently contradiction found: 2 cited observations, 1 supporting, 1 contradicting, and 0 unresolved. Seek an independent or discriminating observation before treating the record as settled.",
    observation_ids: ["observation/1", "observation/2"],
    origin: { kind: "record", id: "record/1" },
  });
});

test("cluster coverage only counts internal review and exposes disagreement", () => {
  const cluster = { cluster_id: "cluster-1", observation_ids: ["one", "two", "three"] } as EvidenceCluster;
  const relation = (left: string, right: string, kind: EvidenceRelation["kind"]): EvidenceRelation => ({ left_observation_id: left, right_observation_id: right, kind } as EvidenceRelation);
  const coverage = clusterCoverage(cluster, [relation("one", "two", "contradicts"), relation("one", "outside", "supports")]);
  assert.equal(coverage.contradicting_count, 1);
  assert.equal(coverage.supporting_count, 0);
  assert.equal(coverage.unreviewed_internal_pairs, 2);
  assert.equal(coverage.status, "contradiction_found");
});

test("question gaps keep uncited and conflicting open questions visible", () => {
  const question = { question_id: "question-1", state: "open", observation_ids: ["one", "two"] } as InvestigationQuestion;
  const relation = { left_observation_id: "one", right_observation_id: "two", kind: "contradicts" } as EvidenceRelation;
  const gap = questionGap(question, [relation]);
  assert.equal(gap.status, "conflicted");
  assert.equal(gap.is_gap, true);
  assert.deepEqual(questionGap({ question_id: "question-2", state: "open", observation_ids: [] } as unknown as InvestigationQuestion, []), {
    question_id: "question-2", cited_observation_count: 0, compared_observation_count: 0,
    unresolved_relation_count: 0, contradicting_relation_count: 0, status: "no_evidence", is_gap: true,
  });
});

test("targeted relationship hydration preserves surviving endpoints", async () => {
  const record = { record_id: "record-1" } as ResearchRecord;
  const connection = { connection_id: "connection-1" } as never;
  const http = {
    get: async (path: string) => {
      if (path.endsWith("missing")) throw Object.assign(new Error("No longer available"), { kind: "not_found" });
      return path.includes("/records/") ? record : connection;
    },
  } as unknown as HttpClient;
  assert.deepEqual(await readResearchRecordsByIDs(http, "case", ["record-1", "missing"]), [record]);
  assert.deepEqual(await readResearchConnectionsByIDs(http, "case", ["connection-1", "missing"]), [connection]);
});

test("targeted question hydration preserves surviving linked questions", async () => {
  const question = { question_id: "question-1" } as InvestigationQuestion;
  const http = {
    get: async (path: string) => {
      if (path.endsWith("/missing")) throw Object.assign(new Error("No longer available"), { kind: "not_found" });
      return question;
    },
  } as unknown as HttpClient;
  assert.deepEqual(await readQuestionsByIDs(http, "case", ["question-1", "missing"]), [question]);
});

test("question list status filters are sent to the server", async () => {
  let seenPath = "";
  let seenParams: Record<string, string | number | boolean | undefined> | undefined;
  const http = {
    get: async (path: string, options?: { params?: Record<string, string | number | boolean | undefined> }) => {
      seenPath = path;
      seenParams = options?.params;
      return { items: [], next_cursor: null };
    },
  } as unknown as HttpClient;
  await listQuestions(http, "case/a", "cursor/1", "deferred");
  assert.equal(seenPath, "/workspaces/case%2Fa/questions");
  assert.deepEqual(seenParams, { before: "cursor/1", state: "deferred", limit: 50 });
});

test("brief picker filtering is local and unresolved IDs stay ordered", () => {
  const rows = [{ id: "one", label: "Source Alpha" }, { id: "two", label: "Question Beta" }, { id: "three", label: "Source Gamma" }];
  assert.deepEqual(filterBriefPickerRows(rows, "beta", (row) => [row.id, row.label]), [rows[1]]);
  assert.deepEqual(unresolvedBriefPickerIDs(["two", "missing", "one"], rows, (row) => row.id), ["missing"]);
});

test("loaded-row filtering is case-insensitive and preserves input order", () => {
  const rows = [{ id: "one", text: "Alpha" }, { id: "two", text: "Beta" }, { id: "three", text: "alpha second" }];
  assert.deepEqual(filterLoadedRows(rows, "ALPHA", (row) => [row.id, row.text]), [rows[0], rows[2]]);
  assert.deepEqual(unresolvedIDs(["three", "missing", "one"], rows.slice(0, 2), (row) => row.id), ["three", "missing"]);
});

test("large loaded evidence sets stay bounded and preserve selection order", () => {
  const rows = Array.from({ length: 10_000 }, (_, index) => ({ id: `observation-${index}`, text: index === 9_999 ? "The final corroborating detail" : `Observation ${index}` }));
  const selected = ["observation-9999", "observation-4500", "missing-observation"];
  const found = filterLoadedRows(rows, "CORROBORATING", (row) => [row.id, row.text]);
  assert.deepEqual(found, [rows[9_999]]);
  assert.deepEqual(unresolvedIDs(selected, rows.slice(0, 5000), (row) => row.id), ["observation-9999", "missing-observation"]);
  assert.equal(rows[0].id, "observation-0");
  assert.equal(rows.length, 10_000);
});

test("evidence syntheses preserve the selected observation order and page cursor", async () => {
  let seenPostPath = "";
  let seenBody: unknown;
  let seenGetPath = "";
  let seenParams: Record<string, string | number | boolean | undefined> | undefined;
  const http = {
    post: async (path: string, options?: { body?: unknown }) => {
      seenPostPath = path;
      seenBody = options?.body;
      return { synthesis_id: "synthesis-1" };
    },
    get: async (path: string, options?: { params?: Record<string, string | number | boolean | undefined> }) => {
      seenGetPath = path;
      seenParams = options?.params;
      return { items: [], next_cursor: null };
    },
  } as unknown as HttpClient;
  await createEvidenceSynthesis(http, "case/a", ["observation/1", "observation/2"]);
  await listEvidenceSyntheses(http, "case/a", "cursor/3");
  assert.equal(seenPostPath, "/workspaces/case%2Fa/evidence/syntheses");
  assert.deepEqual(seenBody, { observation_ids: ["observation/1", "observation/2"] });
  assert.equal(seenGetPath, "/workspaces/case%2Fa/evidence/syntheses");
  assert.deepEqual(seenParams, { before: "cursor/3", limit: 20 });
});

test("assisted comparisons preserve selected citations and history cursor", async () => {
  let seenPostPath = "";
  let seenBody: unknown;
  let seenGetPath = "";
  let seenParams: Record<string, string | number | boolean | undefined> | undefined;
  const http = {
    post: async (path: string, options?: { body?: unknown }) => { seenPostPath = path; seenBody = options?.body; return { comparison_id: "comparison-1" }; },
    get: async (path: string, options?: { params?: Record<string, string | number | boolean | undefined> }) => { seenGetPath = path; seenParams = options?.params; return { items: [], next_cursor: null }; },
  } as unknown as HttpClient;
  await createEvidenceComparison(http, "case/a", ["observation/1", "observation/2"]);
  await listEvidenceComparisons(http, "case/a", "cursor/4");
  assert.equal(seenPostPath, "/workspaces/case%2Fa/evidence/comparisons");
  assert.deepEqual(seenBody, { observation_ids: ["observation/1", "observation/2"] });
  assert.equal(seenGetPath, "/workspaces/case%2Fa/evidence/comparisons");
  assert.deepEqual(seenParams, { before: "cursor/4", limit: 20 });
});

test("next-question suggestions preserve gap citations and workspace routes", async () => {
  const seen: string[] = [];
  let createdBody: unknown;
  const http = {
    get: async (path: string, options?: { params?: Record<string, string | number | boolean | undefined> }) => {
      seen.push(`GET ${path}`);
      if (path.endsWith("question-suggestions")) assert.deepEqual(options?.params, { before: "cursor-1", limit: 20 });
      else assert.equal(options?.params, undefined);
      return { items: [], next_cursor: null };
    },
    post: async (path: string, options?: { body?: unknown }) => {
      seen.push(`POST ${path}`);
      createdBody = options?.body;
      return { question_suggestions_id: "suggestion-1", suggestions: [] };
    },
  } as unknown as HttpClient;
  const gaps = [{ kind: "contradiction" as const, label: "East Quay", detail: "Two notices disagree.", observation_ids: ["observation/1", "observation/2"] }];
  await listEvidenceQuestionSuggestions(http, "case/a", "cursor-1");
  await readEvidenceQuestionSuggestions(http, "case/a", "suggestion/1");
  await createEvidenceQuestionSuggestions(http, "case/a", gaps);
  assert.deepEqual(createdBody, { gaps });
  assert.deepEqual(seen, [
    "GET /workspaces/case%2Fa/evidence/question-suggestions",
    "GET /workspaces/case%2Fa/evidence/question-suggestions/suggestion%2F1",
    "POST /workspaces/case%2Fa/evidence/question-suggestions",
  ]);
});

test("evidence clusters preserve their workspace route and ordered citations", async () => {
  const seen: string[] = [];
  let createdBody: unknown;
  let updatedBody: unknown;
  const http = {
    post: async (path: string, options?: { body?: unknown }) => { seen.push(`POST ${path}`); createdBody = options?.body; return { cluster_id: "cluster-1" }; },
    put: async (path: string, options?: { body?: unknown }) => { seen.push(`PUT ${path}`); updatedBody = options?.body; return { cluster_id: "cluster-1" }; },
    get: async (path: string, options?: { params?: Record<string, string | number | boolean | undefined> }) => { seen.push(`GET ${path}`); assert.deepEqual(options?.params, { before: "cursor/2", limit: 50 }); return { items: [], next_cursor: null }; },
  } as unknown as HttpClient;
  await createEvidenceCluster(http, "case/a", { kind: "claim", title: "East Quay", description: "Qualified grouping.", observation_ids: ["observation/1", "observation/2"] });
  await updateEvidenceCluster(http, "case/a", "cluster/1", { kind: "account", title: "East Quay account", description: "Still provisional.", observation_ids: ["observation/2"] });
  await listEvidenceClusters(http, "case/a", "cursor/2");
  assert.deepEqual(createdBody, { kind: "claim", title: "East Quay", description: "Qualified grouping.", observation_ids: ["observation/1", "observation/2"] });
  assert.deepEqual(updatedBody, { kind: "account", title: "East Quay account", description: "Still provisional.", observation_ids: ["observation/2"] });
  assert.deepEqual(seen, ["POST /workspaces/case%2Fa/evidence/clusters", "PUT /workspaces/case%2Fa/evidence/clusters/cluster%2F1", "GET /workspaces/case%2Fa/evidence/clusters"]);
});

test("source-chain review preserves direction, rationale and cursor routing", async () => {
  const seen: string[] = [];
  let savedBody: unknown;
  const http = {
    get: async (path: string, options?: { params?: Record<string, string | number | boolean | undefined> }) => {
      seen.push(`GET ${path}`);
      assert.deepEqual(options?.params, { before: "cursor/3", limit: 50 });
      return { items: [], next_cursor: null };
    },
    put: async (path: string, options?: { body?: unknown }) => {
      seen.push(`PUT ${path}`);
      savedBody = options?.body;
      return {};
    },
  } as unknown as HttpClient;
  await listEvidenceSourceLinks(http, "case/a", "cursor/3");
  await setEvidenceSourceLink(http, "case/a", {
    downstream_observation_id: "observation/downstream",
    upstream_observation_id: "observation/upstream",
    rationale: "The later report repeats a distinctive phrase from the earlier report.",
  });
  assert.deepEqual(savedBody, {
    downstream_observation_id: "observation/downstream",
    upstream_observation_id: "observation/upstream",
    rationale: "The later report repeats a distinctive phrase from the earlier report.",
  });
  assert.deepEqual(seen, ["GET /workspaces/case%2Fa/evidence/source-links", "PUT /workspaces/case%2Fa/evidence/source-links"]);
});

test("invalid, mismatched and out-of-range citations never highlight other text", () => {
  assert.equal(citedParts("🚉 notice", 3, 9, "notice"), null);
  assert.equal(citedParts("notice", -1, 5, "notic"), null);
  assert.equal(citedParts("notice", 0, 90, "notice"), null);
  assert.equal(citedParts("notice", 0.5, 6, "notice"), null);
});

test("capture diffs preserve unchanged lines and identify additions/removals", () => {
  assert.deepEqual(diffText("A\nold line\nC", "A\nnew line\nC").lines, [
    { kind: "same", text: "A" },
    { kind: "removed", text: "old line" },
    { kind: "added", text: "new line" },
    { kind: "same", text: "C" },
  ]);
  assert.equal(diffText(Array.from({ length: 1501 }, () => "line").join("\n"), "later").truncated, true);
});

test("capture history surfaces duplicate bytes without collapsing immutable versions", () => {
  const captures = [
    { capture_id: "new", version: 2, sha256: "same" },
    { capture_id: "old", version: 1, sha256: "same" },
  ] as never[];
  assert.equal(duplicateCaptureVersion(captures, captures[0]), 1);
  assert.equal(duplicateCaptureVersion(captures, undefined), undefined);
});

test("research record links preserve an observation as the reviewed starting citation", () => {
  assert.equal(recordHref("case a", "observation/1"), "/investigation/case%20a/records?observation=observation%2F1");
  assert.equal(recordHref("case a"), "/investigation/case%20a/records");
  assert.equal(recordHref("case a", "observation/1", { kind: "account", name: "@harborline", description: "Verify scope" }), "/investigation/case%20a/records?observation=observation%2F1&candidate_kind=account&candidate_name=%40harborline&candidate_description=Verify+scope");
  assert.equal(recordHref("case a", ["one", "two"], { kind: "account", name: "@harborline" }), "/investigation/case%20a/records?observation=one&observation=two&candidate_kind=account&candidate_name=%40harborline");
  assert.equal(recordHref("case a", "observation/1", { kind: "account", name: "@harborline" }, { kind: "may_belong_to", related: { kind: "person", name: "Harborline author", description: "Review the person context." }, description: "The source suggests a possible relationship." }), "/investigation/case%20a/records?observation=observation%2F1&candidate_kind=account&candidate_name=%40harborline&relationship_kind=may_belong_to&related_kind=person&related_name=Harborline+author&related_description=Review+the+person+context.&relationship_description=The+source+suggests+a+possible+relationship.");
  assert.equal(recordHref("case a", "observation/1", undefined, undefined, "/investigation/case%20a/sources/source-1?citation=observation%2F1"), "/investigation/case%20a/records?observation=observation%2F1&return=%2Finvestigation%2Fcase%2520a%2Fsources%2Fsource-1%3Fcitation%3Dobservation%252F1");
  assert.equal(recordHref("case a", "observation/1", { kind: "account", name: "@harborline" }, { kind: "may_belong_to", related: { kind: "person", name: "Harborline author" } }, "/investigation/case%20a/evidence"), "/investigation/case%20a/records?observation=observation%2F1&candidate_kind=account&candidate_name=%40harborline&relationship_kind=may_belong_to&related_kind=person&related_name=Harborline+author&return=%2Finvestigation%2Fcase%2520a%2Fevidence");
});

test("guided relationship handoffs open a proposed connection with cited support", () => {
  assert.equal(connectionHref("case a", { fromRecordId: "record-a", toRecordId: "record-b", kind: "possible_same_subject", rationale: "The retained source uses the same distinctive handle.", supportingObservationIds: ["observation/1", "observation/2"] }), "/investigation/case%20a/connections?from_record=record-a&to_record=record-b&kind=possible_same_subject&state=proposed&rationale=The+retained+source+uses+the+same+distinctive+handle.&supporting_observation=observation%2F1&supporting_observation=observation%2F2");
  assert.equal(connectionHref("case a", { fromRecordId: "record-a", toRecordId: "record-b", kind: "associated_with", rationale: "Review together.", returnTo: "/investigation/case%20a/evidence" }), "/investigation/case%20a/connections?from_record=record-a&to_record=record-b&kind=associated_with&state=proposed&rationale=Review+together.&return=%2Finvestigation%2Fcase%2520a%2Fevidence");
});

test("relationship question drafts preserve uncertainty and exact supporting/opposing citations", () => {
  assert.deepEqual(connectionQuestionDraft({
    connectionId: "connection/1",
    fromName: "@harborline",
    toName: "Harborline author",
    kindLabel: "Possible same subject",
    stateLabel: "Proposed",
    rationale: "The same distinctive handle appears in both records.",
    supportingObservationIds: ["observation/1", "observation/2", "observation/1"],
    opposingObservationIds: ["observation/3"],
  }), {
    prompt: "What would establish or challenge the possible same subject relationship between “@harborline” and “Harborline author”?",
    context: "Relationship under review: Possible same subject. Current assessment: Proposed. The same distinctive handle appears in both records. Look for evidence that would distinguish support from contradiction rather than treating the relationship as established.",
    observation_ids: ["observation/1", "observation/2", "observation/3"],
    origin: { kind: "connection", id: "connection/1" },
  });
});

test("graph destinations preserve explicit record and connection selection", () => {
  assert.equal(`/investigation/${encodeURIComponent("case a")}/records?record=${encodeURIComponent("record/1")}`, "/investigation/case%20a/records?record=record%2F1");
  assert.equal(`/investigation/${encodeURIComponent("case a")}/connections?connection=${encodeURIComponent("connection/1")}`, "/investigation/case%20a/connections?connection=connection%2F1");
});

test("timeline destinations preserve exact event selection", () => {
  assert.equal(eventHref("case a", "event/1"), "/investigation/case%20a/timeline?event=event%2F1");
  assert.equal(eventHref("case a"), "/investigation/case%20a/timeline");
  assert.equal(eventRevisionHref("case a", "event/1", "revision/1"), "/investigation/case%20a/timeline/event%2F1/revisions/revision%2F1");
  assert.equal(eventRelationshipHref("case a", "relationship/1"), "/investigation/case%20a/timeline?relationship=relationship%2F1");
  assert.deepEqual(eventRelationshipQuestionDraft({ relationshipId: "relationship/1", fromTitle: "East Quay disruption", toTitle: "Harborline account", kindLabel: "Possibly causes", stateLabel: "proposed", rationale: "The timing suggests a sequence, but causality remains provisional.", supportingObservationIds: ["observation/1"], opposingObservationIds: ["observation/2"] }), {
    prompt: "What would establish or challenge the possibly causes relationship between “East Quay disruption” and “Harborline account”?",
    context: "Event relationship under review: Possibly causes. Current assessment: proposed. The timing suggests a sequence, but causality remains provisional. Look for evidence that would distinguish event sequence or association from coincidence or reporting-chain repetition.",
    observation_ids: ["observation/1", "observation/2"],
    origin: { kind: "event_relationship", id: "relationship/1" },
  });
});

test("event account comparison keeps the event route and reconciliation endpoint scoped", async () => {
  const seen: Array<{ method: string; path: string; body?: unknown }> = [];
  const http = {
    get: async (path: string) => { seen.push({ method: "GET", path }); return { items: [], reconciliation: undefined }; },
    put: async (path: string, options?: { body?: unknown }) => { seen.push({ method: "PUT", path, body: options?.body }); return { reconciliation_id: "reconciliation-1" }; },
  } as unknown as HttpClient;
  const page = await listEventAccounts(http, "case/a", "event/1");
  assert.deepEqual(page.items, []);
  await reconcileEventAccounts(http, "case/a", "event/1", { decision: "retain_event", rationale: "The accounts remain unresolved." });
  assert.deepEqual(seen, [
    { method: "GET", path: "/workspaces/case%2Fa/events/event%2F1/accounts" },
    { method: "PUT", path: "/workspaces/case%2Fa/events/event%2F1/accounts/reconciliation", body: { decision: "retain_event", rationale: "The accounts remain unresolved." } },
  ]);
});

test("event hypotheses preserve bounded cluster routes and review state", async () => {
  const seen: Array<{ method: string; path: string; body?: unknown }> = [];
  const http = {
    get: async (path: string, options?: { params?: unknown }) => { seen.push({ method: "GET", path, body: options?.params }); return { items: [], next_cursor: null }; },
    post: async (path: string, options?: { body?: unknown }) => { seen.push({ method: "POST", path, body: options?.body }); return { cluster_id: "cluster-1" }; },
    put: async (path: string, options?: { body?: unknown }) => { seen.push({ method: "PUT", path, body: options?.body }); return { cluster_id: "cluster-1", state: "accepted" }; },
  } as unknown as HttpClient;
  const page = await listEventClusters(http, "case/a");
  assert.deepEqual(page.items, []);
  await createEventCluster(http, "case/a", { title: "Same incident?", description: "Review two authored events together.", event_ids: ["event/1", "event/2"] });
  await reviewEventCluster(http, "case/a", "cluster/1", { state: "accepted", note: "The retained observations support one bounded hypothesis." });
  assert.deepEqual(seen, [
    { method: "GET", path: "/workspaces/case%2Fa/event-clusters", body: { before: undefined, limit: 50 } },
    { method: "POST", path: "/workspaces/case%2Fa/event-clusters", body: { title: "Same incident?", description: "Review two authored events together.", event_ids: ["event/1", "event/2"] } },
    { method: "PUT", path: "/workspaces/case%2Fa/event-clusters/cluster%2F1/review", body: { state: "accepted", note: "The retained observations support one bounded hypothesis." } },
  ]);
});

test("event relationships preserve direction, type and review routes", async () => {
  const seen: Array<{ method: string; path: string; body?: unknown }> = [];
  const http = {
    get: async (path: string, options?: { params?: unknown }) => { seen.push({ method: "GET", path, body: options?.params }); return { items: [], next_cursor: null }; },
    post: async (path: string, options?: { body?: unknown }) => { seen.push({ method: "POST", path, body: options?.body }); return { relationship_id: "relationship-1" }; },
    put: async (path: string, options?: { body?: unknown }) => { seen.push({ method: "PUT", path, body: options?.body }); return { relationship_id: "relationship-1", state: "accepted" }; },
  } as unknown as HttpClient;
  const page = await listEventRelationships(http, "case/a");
  assert.deepEqual(page.items, []);
  await createEventRelationship(http, "case/a", { from_event_id: "event/1", to_event_id: "event/2", kind: "precedes", rationale: "The reported ordering dates support a sequence.", supporting_observation_ids: ["observation/1"], opposing_observation_ids: ["observation/2"] });
  await reviewEventRelationship(http, "case/a", "relationship/1", { state: "accepted", note: "The sequence is accepted for this investigation." });
  assert.deepEqual(seen, [
    { method: "GET", path: "/workspaces/case%2Fa/event-relationships", body: { before: undefined, limit: 50 } },
    { method: "POST", path: "/workspaces/case%2Fa/event-relationships", body: { from_event_id: "event/1", to_event_id: "event/2", kind: "precedes", rationale: "The reported ordering dates support a sequence.", supporting_observation_ids: ["observation/1"], opposing_observation_ids: ["observation/2"] } },
    { method: "PUT", path: "/workspaces/case%2Fa/event-relationships/relationship%2F1/review", body: { state: "accepted", note: "The sequence is accepted for this investigation." } },
  ]);
});

test("temporal comparison keeps ordering hints separate from reported wording", () => {
  const events = [
    { event_id: "later", title: "Later", sort_date: "2026-09-19", created_at: "2026-09-01T00:00:00Z" },
    { event_id: "unknown", title: "Unknown", created_at: "2026-09-02T00:00:00Z" },
    { event_id: "earlier", title: "Earlier", sort_date: "2026-09-17", created_at: "2026-09-03T00:00:00Z" },
  ] as unknown as TimelineEvent[];
  assert.deepEqual(sequenceEvents(events).map((event) => event.event_id), ["earlier", "later", "unknown"]);
  const relationship = { relationship_id: "relationship-1", from_event_id: "unknown", to_event_id: "later", kind: "precedes", state: "accepted", review_note: "Reviewed sequence.", rationale: "The source ordering is explicit." } as never;
  const comparison = compareEvents(events[1], events[0], [relationship]);
  assert.equal(comparison.order, "before");
  assert.equal(comparison.orderBasis, "explicit_relationship");
  assert.equal(comparison.relationshipDirection, "direct");
  const sameDate = { ...events[0], event_id: "same", sort_date: "2026-09-19" };
  assert.equal(compareEvents(events[0], sameDate, []).order, "same_order_hint");
});

test("working note destinations preserve exact selection and return context", () => {
  assert.equal(noteHref("case a", "note/1"), "/investigation/case%20a/notes?note=note%2F1");
  assert.equal(noteHref("case a", "note/1", "/investigation/case%20a/brief"), "/investigation/case%20a/notes?note=note%2F1&return=%2Finvestigation%2Fcase%2520a%2Fbrief");
  assert.equal(noteHref("case a"), "/investigation/case%20a/notes");
  assert.equal(noteDraftHref("case a", { body: "Follow-up question: What changed?\n\nNext step: " }, "/investigation/case%20a/questions?question=question%2F1"), "/investigation/case%20a/notes?new=1&draft_note=Follow-up+question%3A+What+changed%3F%0A%0ANext+step%3A+&return=%2Finvestigation%2Fcase%2520a%2Fquestions%3Fquestion%3Dquestion%252F1");
  assert.equal(noteDraftHref("case a", { body: "Follow-up" }, undefined, { kind: "question", id: "question/1" }), "/investigation/case%20a/notes?new=1&draft_note=Follow-up&context_kind=question&context_id=question%2F1");
  assert.equal(noteContextHref("case a", { kind: "question", id: "question/1" }), "/investigation/case%20a/questions?question=question%2F1");
  assert.equal(noteContextHref("case a", { kind: "record", id: "record/1" }), "/investigation/case%20a/records?record=record%2F1");
  assert.equal(noteContextHref("case a", { kind: "event", id: "event/1" }), "/investigation/case%20a/timeline?event=event%2F1");
  assert.equal(noteContextHref("case a", { kind: "connection", id: "connection/1" }), "/investigation/case%20a/connections?connection=connection%2F1");
  assert.equal(noteContextHref("case a", { kind: "brief", id: "brief/1" }), "/investigation/case%20a/brief");
});

test("working note writes preserve research context", async () => {
  let seenBody: unknown;
  const http = {
    post: async (_path: string, options?: { body?: unknown }) => {
      seenBody = options?.body;
      return { note_id: "note/1" };
    },
  } as unknown as HttpClient;
  await writeWorkingNote(http, "case/a", "follow up", { kind: "question", id: "question/1" });
  assert.deepEqual(seenBody, { body: "follow up", context_kind: "question", context_id: "question/1" });
});

test("working note pages preserve the server cursor and search boundary", async () => {
  let seenPath = "";
  let seenParams: Record<string, string | number | boolean | undefined> | undefined;
  const http = {
    get: async (path: string, options?: { params?: Record<string, string | number | boolean | undefined> }) => {
      seenPath = path;
      seenParams = options?.params;
      return { items: [], next_cursor: null };
    },
  } as unknown as HttpClient;
  await listWorkingNotesPage(http, "case/a", "cursor/1", "  corroboration  ");
  assert.equal(seenPath, "/workspaces/case%2Fa/notes");
  assert.deepEqual(seenParams, { page: true, summary: true, before: "cursor/1", q: "corroboration", limit: 50 });
  await listWorkingNotesPage(http, "case/a", undefined, "", "record");
  assert.deepEqual(seenParams, { page: true, summary: true, before: undefined, q: undefined, limit: 50, context_kind: "record" });
});

test("research record pages preserve server search and kind filters", async () => {
  let seenPath = "";
  let seenParams: Record<string, string | number | boolean | undefined> | undefined;
  const http = {
    get: async (path: string, options?: { params?: Record<string, string | number | boolean | undefined> }) => {
      seenPath = path;
      seenParams = options?.params;
      return { items: [], next_cursor: null };
    },
  } as unknown as HttpClient;
  await listResearchRecords(http, "case/a", "cursor/1", "  harborline  ", "account", "cited", "open");
  assert.equal(seenPath, "/workspaces/case%2Fa/records");
  assert.deepEqual(seenParams, { before: "cursor/1", q: "harborline", kind: "account", citation: "cited", resolution: "open", archived: undefined, limit: 50 });
  await listResearchRecords(http, "case/a", undefined, "", undefined, "", "", "archived");
  assert.deepEqual(seenParams, { before: undefined, q: undefined, kind: undefined, citation: undefined, resolution: undefined, archived: "archived", limit: 50 });
});

test("research record lifecycle actions use the auditable archive routes", async () => {
  const seen: string[] = [];
  const http = {
    post: async (path: string) => { seen.push(path); return { record_id: "record/1" }; },
  } as unknown as HttpClient;
  await archiveResearchRecord(http, "case/a", "record/1");
  await restoreResearchRecord(http, "case/a", "record/1");
  assert.deepEqual(seen, [
    "/workspaces/case%2Fa/records/record%2F1/archive",
    "/workspaces/case%2Fa/records/record%2F1/restore",
  ]);
});

test("research record history preserves the workspace-scoped revision route", async () => {
  let seenPath = "";
  const http = {
    get: async (path: string) => {
      seenPath = path;
      return { items: [] };
    },
  } as unknown as HttpClient;
  await listResearchRecordRevisions(http, "case/a", "record/1");
  assert.equal(seenPath, "/workspaces/case%2Fa/records/record%2F1/revisions");
});

test("research record summaries use a workspace-scoped read", async () => {
  let seenPath = "";
  const http = {
    get: async (path: string) => {
      seenPath = path;
      return { record_count: 0, kind_counts: { person: 0, account: 0, organisation: 0, place: 0 }, cited_record_count: 0, uncited_record_count: 0, citation_count: 0, open_resolution_record_count: 0, accepted_resolution_record_count: 0 };
    },
  } as unknown as HttpClient;
  await readResearchRecordSummary(http, "case/a");
  assert.equal(seenPath, "/workspaces/case%2Fa/records/summary");
});

test("research record neighborhoods preserve the bounded authored context route", async () => {
  let seenPath = "";
  let seenParams: Record<string, string | number | boolean | undefined> | undefined;
  const http = {
    get: async (path: string, options?: { params?: Record<string, string | number | boolean | undefined> }) => {
      seenPath = path;
      seenParams = options?.params;
      return { meta: { depth: 2, max_depth: 2, record_limit: 50, truncated: false, record_count: 1, connection_count: 0, event_count: 0, citation_count: 0 }, record: { record_id: "record/1" }, records: [], connections: [], events: [], citations: [] };
    },
  } as unknown as HttpClient;
  await readResearchRecordNeighborhood(http, "case/a", "record/1", 2);
  assert.equal(seenPath, "/workspaces/case%2Fa/records/record%2F1/neighborhood");
  assert.deepEqual(seenParams, { depth: 2, limit: 50, kind: undefined, record_kind: undefined });
});

test("research record neighborhoods preserve an explicit record budget", async () => {
  let seenParams: Record<string, string | number | boolean | undefined> | undefined;
  const http = {
    get: async (_path: string, options?: { params?: Record<string, string | number | boolean | undefined> }) => {
      seenParams = options?.params;
      return { meta: { depth: 2, max_depth: 2, record_limit: 10, truncated: true, record_count: 2, connection_count: 1, event_count: 0, citation_count: 0 }, record: { record_id: "record/1" }, records: [], connections: [], events: [], citations: [] };
    },
  } as unknown as HttpClient;
  await readResearchRecordNeighborhood(http, "case/a", "record/1", 2, 10);
  assert.deepEqual(seenParams, { depth: 2, limit: 10, kind: undefined, record_kind: undefined });
});

test("research record neighborhoods preserve a relationship-kind lens", async () => {
  let seenParams: Record<string, string | number | boolean | undefined> | undefined;
  const http = {
    get: async (_path: string, options?: { params?: Record<string, string | number | boolean | undefined> }) => {
      seenParams = options?.params;
      return { meta: { depth: 1, max_depth: 2, record_limit: 50, truncated: false, record_count: 2, connection_count: 1, event_count: 0, citation_count: 0 }, record: { record_id: "record/1" }, records: [], connections: [], events: [], citations: [] };
    },
  } as unknown as HttpClient;
  await readResearchRecordNeighborhood(http, "case/a", "record/1", 1, 50, "mentions");
  assert.deepEqual(seenParams, { depth: 1, limit: 50, kind: "mentions", record_kind: undefined });
});

test("research record neighborhoods preserve an endpoint record-kind lens", async () => {
  let seenParams: Record<string, string | number | boolean | undefined> | undefined;
  const http = {
    get: async (_path: string, options?: { params?: Record<string, string | number | boolean | undefined> }) => {
      seenParams = options?.params;
      return { meta: { depth: 1, max_depth: 2, record_limit: 50, truncated: false, record_count: 2, connection_count: 1, event_count: 0, citation_count: 0 }, record: { record_id: "record/1" }, records: [], connections: [], events: [], citations: [] };
    },
  } as unknown as HttpClient;
  await readResearchRecordNeighborhood(http, "case/a", "record/1", 1, 50, "mentions", "organisation");
  assert.deepEqual(seenParams, { depth: 1, limit: 50, kind: "mentions", record_kind: "organisation" });
});

test("research connection review queues preserve server filters", async () => {
  let seenPath = "";
  let seenParams: Record<string, string | number | boolean | undefined> | undefined;
  const http = {
    get: async (path: string, options?: { params?: Record<string, string | number | boolean | undefined> }) => {
      seenPath = path;
      seenParams = options?.params;
      return { items: [], next_cursor: null };
    },
  } as unknown as HttpClient;
  await listResearchConnections(http, "case/a", "cursor/1", "deferred", "open");
  assert.equal(seenPath, "/workspaces/case%2Fa/connections");
  assert.deepEqual(seenParams, { before: "cursor/1", q: undefined, state: "deferred", review: "open", kind: undefined, record_kind: undefined, limit: 50 });
});

test("research connection search preserves the workspace route and query", async () => {
  let seenParams: Record<string, string | number | boolean | undefined> | undefined;
  const http = {
    get: async (_path: string, options?: { params?: Record<string, string | number | boolean | undefined> }) => {
      seenParams = options?.params;
      return { items: [], next_cursor: null };
    },
  } as unknown as HttpClient;
  await listResearchConnections(http, "case/a", undefined, "", "", "harborline author");
  assert.deepEqual(seenParams, { before: undefined, q: "harborline author", state: undefined, review: undefined, kind: undefined, record_kind: undefined, limit: 50 });
});

test("research connection queries preserve the relationship-kind filter", async () => {
  let seenParams: Record<string, string | number | boolean | undefined> | undefined;
  const http = {
    get: async (_path: string, options?: { params?: Record<string, string | number | boolean | undefined> }) => {
      seenParams = options?.params;
      return { items: [], next_cursor: null };
    },
  } as unknown as HttpClient;
  await listResearchConnections(http, "case/a", undefined, "", "", "", "mentions");
  assert.deepEqual(seenParams, { before: undefined, q: undefined, state: undefined, review: undefined, kind: "mentions", record_kind: undefined, limit: 50 });
});

test("research connection queries preserve the endpoint record-kind filter", async () => {
  let seenParams: Record<string, string | number | boolean | undefined> | undefined;
  const http = {
    get: async (_path: string, options?: { params?: Record<string, string | number | boolean | undefined> }) => {
      seenParams = options?.params;
      return { items: [], next_cursor: null };
    },
  } as unknown as HttpClient;
  await listResearchConnections(http, "case/a", undefined, "", "", "", undefined, "person");
  assert.deepEqual(seenParams, { before: undefined, q: undefined, state: undefined, review: undefined, kind: undefined, record_kind: "person", limit: 50 });
});

test("research connection summaries use a workspace-scoped read", async () => {
  let seenPath = "";
  const http = {
    get: async (path: string) => {
      seenPath = path;
      return { connection_count: 0, state_counts: { proposed: 0, accepted: 0, rejected: 0, deferred: 0 }, open_count: 0, conflicted_count: 0, uncited_count: 0 };
    },
  } as unknown as HttpClient;
  await readResearchConnectionSummary(http, "case/a");
  assert.equal(seenPath, "/workspaces/case%2Fa/connections/summary");
});

test("resolution impact reads the workspace-scoped authored surface projection", async () => {
  let seenPath = "";
  const http = {
    get: async (path: string) => {
      seenPath = path;
      return { connections: [], events: [], briefs: [], snapshots: [] };
    },
  } as unknown as HttpClient;
  const impact = await readResearchResolutionImpact(http, "workspace/1", "resolution/2");
  assert.deepEqual(impact, { connections: [], events: [], briefs: [], snapshots: [] });
  assert.equal(seenPath, "/workspaces/workspace%2F1/resolutions/resolution%2F2/impact");
});

test("multi-record resolution sets preserve the bounded workspace route", async () => {
  const seen: string[] = [];
  const http = {
    get: async (path: string) => { seen.push(`GET ${path}`); return { items: [], next_cursor: null, connections: [], events: [], briefs: [], snapshots: [] }; },
    post: async (path: string) => { seen.push(`POST ${path}`); return { resolution_set_id: "set/1" }; },
    put: async (path: string) => { seen.push(`PUT ${path}`); return { resolution_set_id: "set/1" }; },
  } as unknown as HttpClient;
  await listResearchResolutionSets(http, "workspace/1", "cursor/2");
  await createResearchResolutionSet(http, "workspace/1", { canonical_record_id: "record/1", alias_record_ids: ["record/2", "record/3"], rationale: "review" });
  await reviewResearchResolutionSet(http, "workspace/1", "set/1", "accept");
  await reverseResearchResolutionSet(http, "workspace/1", "set/1");
  await readResearchResolutionSetImpact(http, "workspace/1", "set/1");
  assert.deepEqual(seen, [
    "GET /workspaces/workspace%2F1/resolution-sets",
    "POST /workspaces/workspace%2F1/resolution-sets",
    "PUT /workspaces/workspace%2F1/resolution-sets/set%2F1",
    "POST /workspaces/workspace%2F1/resolution-sets/set%2F1/reverse",
    "GET /workspaces/workspace%2F1/resolution-sets/set%2F1/impact",
  ]);
});

test("question destinations preserve exact selection and return context", () => {
  assert.equal(questionHref("case a", "question/1"), "/investigation/case%20a/questions?question=question%2F1");
  assert.equal(questionHref("case a", "question/1", "/investigation/case%20a/brief"), "/investigation/case%20a/questions?question=question%2F1&return=%2Finvestigation%2Fcase%2520a%2Fbrief");
  assert.equal(questionHref("case a"), "/investigation/case%20a/questions");
  assert.equal(questionEvidenceHref("case a", "question/1", questionHref("case a", "question/1")), "/investigation/case%20a/evidence?question=question%2F1&return=%2Finvestigation%2Fcase%2520a%2Fquestions%3Fquestion%3Dquestion%252F1");
  assert.equal(questionDraftHref("case a", { prompt: "What corroborates East Quay?", context: "Two retained reports need another source.", observation_ids: ["observation/1", "observation/2"], origin: { kind: "connection", id: "connection/1" } }, "/investigation/case%20a/evidence"), "/investigation/case%20a/questions?new=1&draft_question=What+corroborates+East+Quay%3F&draft_context=Two+retained+reports+need+another+source.&draft_observations=observation%2F1%2Cobservation%2F2&draft_context_kind=connection&draft_context_id=connection%2F1&return=%2Finvestigation%2Fcase%2520a%2Fevidence");
  assert.equal(questionContextHref("case a", { kind: "connection", id: "connection/1" }), "/investigation/case%20a/connections?connection=connection%2F1");
  assert.equal(questionContextHref("case a", { kind: "cluster", id: "cluster/1" }), "/investigation/case%20a/evidence?cluster=cluster%2F1");
});

test("source destinations preserve capture, citation, search, match, extraction and return context", () => {
  assert.equal(sourceHref("case a", "source/1"), "/investigation/case%20a/sources/source%2F1");
  assert.equal(sourceHref("case a", "source/1", "capture/1", "observation/1", "/investigation/case%20a/brief", "  harbor  ", 2, "extraction/1"), "/investigation/case%20a/sources/source%2F1?capture=capture%2F1&citation=observation%2F1&return=%2Finvestigation%2Fcase%2520a%2Fbrief&find=harbor&match=2&extraction=extraction%2F1");
  assert.equal(sourceHref("case", "source", undefined, undefined, undefined, "x", -1), "/investigation/case/sources/source?find=x");
});

test("review synthesis keeps exact identifier candidates connected to every observation", () => {
  const rows = [
    { observation_id: "one", source_title: "Notice A", statement: "The account @HarborLine posted.", quote: "@HarborLine", } ,
    { observation_id: "two", source_title: "Notice B", statement: "The same handle @harborline appeared again; contact user@example.com.", quote: "@harborline", },
  ] as Evidence[];
  assert.deepEqual(researchRecordCandidates(rows), [
    { kind: "account", name: "@HarborLine", observation_ids: ["one", "two"], rationale: "Exact account-shaped identifier surfaced in selected retained observations; verify what the identifier refers to before saving." },
    { kind: "account", name: "user@example.com", observation_ids: ["two"], rationale: "Exact account-shaped identifier surfaced in selected retained observations; verify what the identifier refers to before saving." },
  ]);
  assert.equal(synthesisText(rows), "Notice A: The account @HarborLine posted.\nNotice B: The same handle @harborline appeared again; contact user@example.com.");
});

const shell = {
  me: { account_id: "analyst", email: "a@example.test", verified: true, status: "active", orgs: [
    { org_id: "org-a", name: "A", role: "owner", workspaces: [{ workspace_id: "case-a", name: "A", access: "admin" }] },
    { org_id: "org-b", name: "B", role: "member", workspaces: [{ workspace_id: "case-b", name: "B", access: "read" }] },
  ] }, context: null, empty: null, members: [], name: "Analyst", fixtures: false,
} as Shell;

test("research URLs restore the exact permitted investigation across organisations", () => {
  const selected = shellForPath(shell, "/investigation/case-b/sources/source-1");
  assert.equal(selected.context?.org.org_id, "org-b");
  assert.equal(selected.context?.workspace.workspace_id, "case-b");
  assert.equal(selected.context?.workspace.access, "read");
  assert.equal(shellForPath(selected, "/investigation/case-a/overview").context?.workspace.workspace_id, "case-a");
});

test("inaccessible research URLs never fall back to another investigation", () => {
  const active = shellForPath(shell, "/investigation/case-a/overview");
  assert.equal(shellForPath(active, "/investigation/unknown/overview").context, null);
  assert.equal(shellForPath(active, "/investigation/%zz/overview").context, null);
  const client = { ...shell, me: { ...shell.me, orgs: [{ ...shell.me.orgs[0], role: "client" as const }] } };
  assert.equal(shellForPath(client, "/investigation/case-a/overview").context, null);
});

test("closed investigations retain their own readable context and never expose writes", () => {
  const record = { org_id: "org-a", workspace: { workspace_id: "closed-case", name: "Archived investigation", access: "admin" as const, closed: true } };
  const selected = shellForPath(shell, "/investigation/closed-case/sources/source-1", record);
  assert.equal(selected.context?.workspace.workspace_id, "closed-case");
  assert.equal(selected.context?.workspace.closed, true);
  assert.equal(mayWriteResearch(selected.context?.workspace), false);
  assert.equal(shellForPath(shell, "/investigation/closed-case/overview", { ...record, workspace: { ...record.workspace, access: "none" } }).context, null);
  assert.equal(mayWriteResearch({ workspace_id: "live", name: "Live", access: "write" }), true);
  assert.equal(shellForPath(shell, "/investigation/another-case/overview", record).context, null);
  assert.equal(shellForPath(shell, "/investigation/closed-case/overview", { ...record, org_id: "outside-org" }).context, null);
});

test("connection revision changes explain assessment and evidence-side movement", () => {
  const base: ResearchConnectionRevision = {
    revision_id: "revision-1", workspace_id: "case-a", connection_id: "connection-1", revision: 1,
    from_record_id: "record-a", from_record_kind: "account", from_record_name: "@harborline", from_record_description: "Account context.", from_record_observation_ids: ["record-observation-a"], to_record_id: "record-b", to_record_kind: "person", to_record_name: "Harborline author", to_record_description: "Person context.", to_record_observation_ids: ["record-observation-b"], kind: "may_belong_to", state: "proposed", rationale: "Needs corroboration.",
    supporting_observation_ids: ["observation-a"], opposing_observation_ids: [], changed_by: "analyst", changed_at: "2026-09-17T00:00:00Z",
  };
  assert.deepEqual(connectionRevisionChanges(undefined, base), ["Initial assessment"]);
  const updated = { ...base, revision_id: "revision-2", revision: 2, state: "deferred" as const, rationale: "Keep open pending an independent source.", supporting_observation_ids: [], opposing_observation_ids: ["observation-b"] };
  assert.deepEqual(connectionRevisionChanges(base, updated), ["state: proposed → deferred", "rationale", "supporting citations", "opposing citations"]);
  assert.deepEqual(connectionRevisionEvidenceChanges(base, updated), { supportingAdded: [], supportingRemoved: ["observation-a"], opposingAdded: ["observation-b"], opposingRemoved: [] });
  assert.deepEqual(connectionRevisionObservationIds(base), ["observation-a", "record-observation-a", "record-observation-b"]);
  assert.deepEqual(connectionRevisionChanges(base, { ...base, from_record_description: "Refined context." }), ["record context"]);
});

test("assisted connection reviews preserve the nested connection route and empty write body", async () => {
  const seen: string[] = [];
  let body: unknown;
  const http = {
    get: async (path: string) => { seen.push(`GET ${path}`); return path.endsWith("/reviews") ? { items: [], next_cursor: null } : { connection_review_id: "review-1" }; },
    post: async (path: string, options?: { body?: unknown }) => { seen.push(`POST ${path}`); body = options?.body; return { connection_review_id: "review-1" }; },
  } as unknown as HttpClient;
  await listResearchConnectionReviews(http, "case/a", "connection/1", "cursor-1");
  await readResearchConnectionReview(http, "case/a", "connection/1", "review/1");
  await createResearchConnectionReview(http, "case/a", "connection/1");
  assert.deepEqual(body, {});
  assert.deepEqual(seen, [
    "GET /workspaces/case%2Fa/connections/connection%2F1/reviews",
    "GET /workspaces/case%2Fa/connections/connection%2F1/reviews/review%2F1",
    "POST /workspaces/case%2Fa/connections/connection%2F1/reviews",
  ]);
});

test("frozen brief exports include endpoint record context citations", () => {
  const snapshot: BriefSnapshot = {
    snapshot_id: "snapshot-1", workspace_id: "case-a", brief_id: "brief-1", title: "Handoff", question: "What happened?",
    current_account: "A qualified account.", alternatives: "Another account.", limitations: "One source.", next_steps: "Find another source.",
    observation_ids: ["brief-observation"], clusters: [], questions: [{ question_id: "question-1", question: "Was it independently reported?", state: "open", observation_ids: ["question-observation"] }], connections: [{
      connection_id: "connection-1", from_record_id: "record-a", from_record_kind: "account", from_record_name: "@harborline", from_record_description: "Account context.", from_record_observation_ids: ["from-record-observation"],
      to_record_id: "record-b", to_record_kind: "person", to_record_name: "Harborline author", to_record_description: "Person context.", to_record_observation_ids: ["to-record-observation"],
      kind: "may_belong_to", state: "proposed", rationale: "Needs corroboration.", supporting_observation_ids: ["supporting-observation"], opposing_observation_ids: [],
    }], events: [{ event_id: "event-1", event_revision_id: "event-revision-1", event_revision: 2, title: "East Quay disruption", description: "Several accounts may describe the same occurrence.", reported_time: "around 18:00", time_precision: "approximate", sort_date: "2026-09-17", location: "East Quay", observation_ids: ["event-observation"], participant_records: [{ record_id: "record-a", kind: "account", name: "@harborline", description: "Account context.", observation_ids: ["participant-observation"] }], location_record: { record_id: "record-b", kind: "place", name: "East Quay", description: "Place context.", observation_ids: ["place-observation"], place_geometry: { latitude: 41.0082, longitude: 28.9784, precision: "approximate", observation_ids: ["place-geometry"] } } }], event_relationships: [{ relationship_id: "event-relationship-1", from_event_id: "event-1", to_event_id: "event-2", kind: "possibly_causes", rationale: "The earlier disruption may explain the later account.", state: "proposed", supporting_observation_ids: ["relationship-support"], opposing_observation_ids: [] }],
    author: "analyst", updated_by: "analyst", frozen_by: "analyst", source_updated_at: "2026-09-17T00:00:00Z", frozen_at: "2026-09-17T00:00:00Z",
  };
  assert.deepEqual(snapshotEvidenceIds(snapshot), ["brief-observation", "question-observation", "supporting-observation", "from-record-observation", "to-record-observation", "event-observation", "participant-observation", "place-observation", "place-geometry", "relationship-support"]);
  const markdown = renderBriefSnapshotMarkdown(snapshot, [
    { observation_id: "from-record-observation", workspace_id: "case-a", source_id: "source-1", source_title: "Retained notice", capture_id: "capture-1", statement: "The account is named.", quote: "@harborline", quote_start: 0, quote_end: 11, author: "analyst", recorded_at: "2026-09-17T00:00:00Z" },
    { observation_id: "supporting-observation", workspace_id: "case-a", source_id: "source-2", source_title: "Second notice", capture_id: "capture-2", statement: "The author uses the handle.", quote: "@harborline", quote_start: 0, quote_end: 11, author: "analyst", recorded_at: "2026-09-17T00:00:00Z" },
    { observation_id: "relationship-support", workspace_id: "case-a", source_id: "source-3", source_title: "Timing notice", capture_id: "capture-3", statement: "The disruption preceded the later account.", quote: "before the later notice", quote_start: 0, quote_end: 23, author: "analyst", recorded_at: "2026-09-17T00:00:00Z" },
    { observation_id: "place-geometry", workspace_id: "case-a", source_id: "source-4", source_title: "Map notice", capture_id: "capture-4", statement: "The notice places the disruption at East Quay.", quote: "East Quay", quote_start: 0, quote_end: 9, author: "analyst", recorded_at: "2026-09-17T00:00:00Z" },
  ] as Evidence[]);
  assert.match(markdown, /from record description: Account context\./);
  assert.match(markdown, /from record observations:\n    - \*\*Retained notice\*\* — The account is named\./);
  assert.match(markdown, /@harborline/);
  assert.match(markdown, /to record description: Person context\./);
  assert.match(markdown, /supporting observations:\n    - \*\*Second notice\*\* — The author uses the handle\./);
  assert.match(markdown, /Events at freeze/);
  assert.match(markdown, /East Quay disruption/);
  assert.match(markdown, /event revision: `event-revision-1` \(revision 2\)/);
  assert.match(markdown, /participant record observations/);
  assert.match(markdown, /map context: 41\.0082, 28\.9784 \(approximate\)/);
  assert.match(markdown, /map context observations/);
  assert.match(markdown, /questions at freeze/i);
  assert.match(markdown, /  - observations:\n    - Observation `question-observation`/);
  assert.match(markdown, /Event relationships at freeze/);
  assert.match(markdown, /relationship-support/);
});

test("recipient handoff exports stay useful without source access or internal identifiers", () => {
  const handoff: BriefRecipientHandoff = {
    snapshot_id: "snapshot-internal",
    workspace_id: "workspace-internal",
    visibility: "recipient",
    redactions: ["citations", "source_and_capture_details", "internal_identifiers", "review_comments"],
    title: "East Quay handoff",
    question: "What happened?",
    current_account: "A qualified account.",
    alternatives: "Another account.",
    limitations: "One source.",
    next_steps: "Find another source.",
    clusters: [{ kind: "claim", title: "Disruption grouping", description: "A qualified grouping." }],
    questions: [{ question: "Was it independently reported?", state: "open" }],
    connections: [{ from_name: "@harborline", to_name: "East Quay", kind: "located_at", state: "proposed", rationale: "Needs corroboration." }],
    events: [{ title: "East Quay disruption", time_precision: "approximate", reported_time: "around 18:00", description: "Several accounts may describe the same occurrence." }],
    event_relationships: [{ from_title: "East Quay disruption", to_title: "Later account", kind: "possibly_causes", state: "proposed", rationale: "Keep the relationship qualified." }],
    source_updated_at: "2026-09-17T00:00:00Z",
    frozen_at: "2026-09-17T00:00:00Z",
  };
  const markdown = renderBriefRecipientHandoffMarkdown(handoff);
  assert.match(markdown, /# East Quay handoff/);
  assert.match(markdown, /A qualified account\./);
  assert.match(markdown, /East Quay disruption/);
  assert.match(markdown, /Event relationships at freeze/);
  assert.match(markdown, /Later account/);
  for (const forbidden of ["snapshot-internal", "workspace-internal", "source_id", "capture_id", "observation_id", "review_comments"]) assert.doesNotMatch(markdown, new RegExp(forbidden));
});

test("snapshot activity reads the focused handoff audit endpoint", async () => {
  let seenPath = "";
  let seenParams: Record<string, string | number | boolean | undefined> | undefined;
  const http = {
    get: async (path: string, options?: { params?: Record<string, string | number | boolean | undefined> }) => {
      seenPath = path;
      seenParams = options?.params;
      return { entries: [], facets: [] };
    },
  } as unknown as HttpClient;
  await readBriefSnapshotActivity(http, "case a", "snapshot/1", { facet: "brief", after: "cursor-1" });
  assert.equal(seenPath, "/workspaces/case%20a/brief/snapshots/snapshot%2F1/activity");
  assert.deepEqual(seenParams, { after: "cursor-1", limit: 50, facet: "brief" });
});

test("frozen question comparison exposes citation movement", () => {
  const previous: BriefSnapshot["questions"][number] = { question_id: "question-1", question: "Was it independently reported?", state: "open", observation_ids: ["question-old"] };
  const current = { ...previous, state: "answered" as const, observation_ids: ["question-new"] };
  assert.deepEqual(snapshotQuestionObservationChanges(previous, current), { added: ["question-new"], removed: ["question-old"] });
});

test("frozen brief comparison explains connection evidence and record-context movement", () => {
  const previous: BriefSnapshot["connections"][number] = {
    connection_id: "connection-1", from_record_id: "record-a", from_record_kind: "account", from_record_name: "@harborline", from_record_description: "Account context.", from_record_observation_ids: ["from-old"],
    to_record_id: "record-b", to_record_kind: "person", to_record_name: "Harborline author", to_record_description: "Person context.", to_record_observation_ids: [],
    kind: "may_belong_to", state: "proposed", rationale: "Needs corroboration.", supporting_observation_ids: ["support-old"], opposing_observation_ids: [],
  };
  const current = { ...previous, from_record_description: "Refined account context.", from_record_observation_ids: ["from-new"], supporting_observation_ids: ["support-new"], opposing_observation_ids: ["oppose-new"] };
  assert.deepEqual(snapshotConnectionChanges(previous, current), ["from record description", "from record citations", "supporting citations", "opposing citations"]);
  assert.deepEqual(snapshotConnectionEvidenceChanges(previous, current), { supportingAdded: ["support-new"], supportingRemoved: ["support-old"], opposingAdded: ["oppose-new"], opposingRemoved: [] });
  assert.deepEqual(snapshotConnectionRecordObservationChanges(previous, current), { fromAdded: ["from-new"], fromRemoved: ["from-old"], toAdded: [], toRemoved: [] });
});
