import { test } from "node:test";
import assert from "node:assert/strict";
import { citedParts, quoteAt, quoteOccurrences } from "../lib/services/sources/citation.ts";
import { diffText } from "../lib/services/sources/diff.ts";
import { duplicateCaptureVersion } from "../lib/services/sources/history.ts";
import { mayWriteResearch, shellForPath } from "../app/(app)/_route-context.ts";
import type { Shell } from "../app/(app)/_shell.ts";
import { renderBriefSnapshotMarkdown, snapshotEvidenceIds } from "../lib/services/brief/export.ts";
import { snapshotConnectionChanges, snapshotConnectionEvidenceChanges, snapshotConnectionRecordObservationChanges, snapshotQuestionObservationChanges } from "../lib/services/brief/history.ts";
import { filterBriefPickerRows, unresolvedBriefPickerIDs } from "../lib/services/brief/picker.ts";
import { filterLoadedRows, unresolvedIDs } from "../lib/query/filter.ts";
import type { BriefSnapshot } from "../lib/services/brief/index.ts";
import type { Evidence } from "../lib/services/review/index.ts";
import { readEvidenceByIDs } from "../lib/services/review/index.ts";
import type { InvestigationQuestion } from "../lib/services/questions/index.ts";
import { readQuestionsByIDs } from "../lib/services/questions/index.ts";
import type { ResearchConnectionRevision } from "../lib/services/research-connections/index.ts";
import { readResearchConnectionsByIDs } from "../lib/services/research-connections/index.ts";
import type { ResearchRecord } from "../lib/services/research-records/index.ts";
import { readResearchRecordsByIDs } from "../lib/services/research-records/index.ts";
import { connectionRevisionChanges, connectionRevisionEvidenceChanges, connectionRevisionObservationIds } from "../lib/services/research-connections/history.ts";
import { recordHref } from "../lib/services/research-records/navigation.ts";
import { connectionHref } from "../lib/services/research-connections/navigation.ts";
import { eventHref } from "../lib/services/events/navigation.ts";
import { noteHref } from "../lib/services/notes/navigation.ts";
import { questionHref } from "../lib/services/questions/navigation.ts";
import { sourceHref } from "../lib/services/sources/navigation.ts";
import { listSources, searchSources } from "../lib/services/sources/sources.api.ts";
import { textOccurrences } from "../lib/services/sources/search.ts";
import { researchRecordCandidates, synthesisText } from "../lib/services/research-records/candidates.ts";
import { readAssistanceHistory, readLatestAssistance } from "../lib/services/assistance/index.ts";
import { createEvidenceSynthesis, listEvidenceSyntheses } from "../lib/services/review/index.ts";
import type { HttpClient } from "../lib/http/port.ts";

test("citations use code points across emoji, accents and repeated passages", () => {
  const content = "🚉 İzmir — service paused.\n🚉 İzmir — service paused.";
  const quote = "İzmir — service paused.";
  const positions = quoteOccurrences(content, quote);
  assert.deepEqual(positions, [2, 28]);
  const parts = citedParts(content, positions[1], positions[1] + Array.from(quote).length, quote);
  assert.equal(parts?.cited, quote);
  assert.equal(parts?.before, "🚉 İzmir — service paused.\n🚉 ");
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

test("graph destinations preserve explicit record and connection selection", () => {
  assert.equal(`/investigation/${encodeURIComponent("case a")}/records?record=${encodeURIComponent("record/1")}`, "/investigation/case%20a/records?record=record%2F1");
  assert.equal(`/investigation/${encodeURIComponent("case a")}/connections?connection=${encodeURIComponent("connection/1")}`, "/investigation/case%20a/connections?connection=connection%2F1");
});

test("timeline destinations preserve exact event selection", () => {
  assert.equal(eventHref("case a", "event/1"), "/investigation/case%20a/timeline?event=event%2F1");
  assert.equal(eventHref("case a"), "/investigation/case%20a/timeline");
});

test("working note destinations preserve exact selection and return context", () => {
  assert.equal(noteHref("case a", "note/1"), "/investigation/case%20a/notes?note=note%2F1");
  assert.equal(noteHref("case a", "note/1", "/investigation/case%20a/brief"), "/investigation/case%20a/notes?note=note%2F1&return=%2Finvestigation%2Fcase%2520a%2Fbrief");
  assert.equal(noteHref("case a"), "/investigation/case%20a/notes");
});

test("question destinations preserve exact selection and return context", () => {
  assert.equal(questionHref("case a", "question/1"), "/investigation/case%20a/questions?question=question%2F1");
  assert.equal(questionHref("case a", "question/1", "/investigation/case%20a/brief"), "/investigation/case%20a/questions?question=question%2F1&return=%2Finvestigation%2Fcase%2520a%2Fbrief");
  assert.equal(questionHref("case a"), "/investigation/case%20a/questions");
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

test("frozen brief exports include endpoint record context citations", () => {
  const snapshot: BriefSnapshot = {
    snapshot_id: "snapshot-1", workspace_id: "case-a", brief_id: "brief-1", title: "Handoff", question: "What happened?",
    current_account: "A qualified account.", alternatives: "Another account.", limitations: "One source.", next_steps: "Find another source.",
    observation_ids: ["brief-observation"], questions: [{ question_id: "question-1", question: "Was it independently reported?", state: "open", observation_ids: ["question-observation"] }], connections: [{
      connection_id: "connection-1", from_record_id: "record-a", from_record_kind: "account", from_record_name: "@harborline", from_record_description: "Account context.", from_record_observation_ids: ["from-record-observation"],
      to_record_id: "record-b", to_record_kind: "person", to_record_name: "Harborline author", to_record_description: "Person context.", to_record_observation_ids: ["to-record-observation"],
      kind: "may_belong_to", state: "proposed", rationale: "Needs corroboration.", supporting_observation_ids: ["supporting-observation"], opposing_observation_ids: [],
    }],
    author: "analyst", updated_by: "analyst", frozen_by: "analyst", source_updated_at: "2026-09-17T00:00:00Z", frozen_at: "2026-09-17T00:00:00Z",
  };
  assert.deepEqual(snapshotEvidenceIds(snapshot), ["brief-observation", "question-observation", "supporting-observation", "from-record-observation", "to-record-observation"]);
  const markdown = renderBriefSnapshotMarkdown(snapshot, [
    { observation_id: "from-record-observation", workspace_id: "case-a", source_id: "source-1", source_title: "Retained notice", capture_id: "capture-1", statement: "The account is named.", quote: "@harborline", quote_start: 0, quote_end: 11, author: "analyst", recorded_at: "2026-09-17T00:00:00Z" },
    { observation_id: "supporting-observation", workspace_id: "case-a", source_id: "source-2", source_title: "Second notice", capture_id: "capture-2", statement: "The author uses the handle.", quote: "@harborline", quote_start: 0, quote_end: 11, author: "analyst", recorded_at: "2026-09-17T00:00:00Z" },
  ] as Evidence[]);
  assert.match(markdown, /from record description: Account context\./);
  assert.match(markdown, /from record observations:\n    - \*\*Retained notice\*\* — The account is named\./);
  assert.match(markdown, /@harborline/);
  assert.match(markdown, /to record description: Person context\./);
  assert.match(markdown, /supporting observations:\n    - \*\*Second notice\*\* — The author uses the handle\./);
  assert.match(markdown, /questions at freeze/i);
  assert.match(markdown, /  - observations:\n    - Observation `question-observation`/);
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
