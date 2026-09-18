"use server";

/* ─── Every read the browser makes, in one file ────────────────────────────
   A server action is the fetcher and `lib/services` is what it calls, which
   keeps three properties the client would otherwise lose the day it started
   fetching for itself:

   The SEAM survives. `clientFor` picks the fixture adapter or the real one per
   domain and per session, and it reads an httpOnly cookie to do it. A browser
   fetching an endpoint directly would bypass all of that, and persona mode —
   the thing that makes every screen demonstrable with no server — would die
   quietly rather than loudly.

   The COOKIE stays httpOnly. `session.ts` said the day a client component needs
   an endpoint, that is "a route handler forwarding the cookie, not this
   becoming readable". A server action is that, without a second set of paths to
   keep in step with `lib/services`.

   And the READ SURFACE stays countable. One file, the same argument the icon
   re-export file makes: a surface you can list is a surface you can audit.

   Every function here is a READ. Writes live in each area's `_actions.ts`,
   because a write belongs beside the screen that decides to make it.        */

import { listRetentionCleanup, listRetentionCleanupReviews, listRetentionCleanupStatus, listRetentionReview, listSources, searchSources, readRetentionCleanupReview, readSource, readCapture, listCaptureExtractions, readCaptureExtraction, listSourceObservations, readSourceObservation, sourceRetentionReview } from "@/lib/services/sources";
import { readAssistanceHistory, readLatestAssistance } from "@/lib/services/assistance";
import { listWorkingNotes, readWorkingNote } from "@/lib/services/notes";
import { listEvidence, listEvidenceRelations, listEvidenceSyntheses, readEvidence, readEvidenceByIDs } from "@/lib/services/review";
import { listQuestions, readQuestion, readQuestionsByIDs } from "@/lib/services/questions";
import { listEvents, readEvent } from "@/lib/services/events";
import { listBriefSnapshots, readBrief, readBriefSnapshot } from "@/lib/services/brief";
import { listResearchRecords, readResearchRecord, readResearchRecordsByIDs } from "@/lib/services/research-records";
import { listResearchConnections, listResearchConnectionRevisions, readResearchConnection, readResearchConnectionRevision, readResearchConnectionsByIDs } from "@/lib/services/research-connections";
import { listResearchResolutions } from "@/lib/services/research-resolutions";
import { clientFor } from "@/lib/root";
import { getChain, getMyActivity, getOrgAudit, getWorkspaceAudit } from "@/lib/services/ledger";
import { listSessions } from "@/lib/services/identity";
import { listMembers, listWorkspaces } from "@/lib/services/tenancy";
import { listWorkspaceMembers } from "@/lib/services/access";
import { listMappings, listTools } from "@/lib/services/tooling";
import { listChecks, readChain } from "@/lib/services/checks";
import { listRuns, readRun } from "@/lib/services/runs";
import { listRules, listTargets } from "@/lib/services/targets";
import {
  listAssets, listEntities, listFragments, readCanvas, readFragment,
} from "@/lib/services/entities";
import {
  listObservations, listSubjects, readExtraction, readLineage,
} from "@/lib/services/observed";
import { readCoverage } from "@/lib/services/coverage";
import { listFindings } from "@/lib/services/findings";
import type { FindingState } from "@/lib/services/findings";
import { listReports, previewReport, readReport } from "@/lib/services/reports";
import { loadInvestigationContext } from "./_investigation-context";
import { loadShell, type Shell } from "./_shell";

export async function shellQuery(): Promise<Shell> {
  return loadShell();
}

/* tenancy */
export async function workspacesQuery(org: string) {
  return listWorkspaces(await clientFor("tenancy"), org);
}
export async function membersQuery(org: string) {
  return listMembers(await clientFor("tenancy"), org);
}
export async function workspaceMembersQuery(workspace: string) {
  return listWorkspaceMembers(await clientFor("access"), workspace);
}

/* tooling */
export async function toolsQuery(org: string) {
  return listTools(await clientFor("tooling"), org, { archived: true });
}
export async function mappingsQuery(org: string, tool: string) {
  return listMappings(await clientFor("tooling"), org, tool);
}

/* checks */
export async function checksQuery(org: string) {
  return listChecks(await clientFor("checks"), org);
}
export async function chainQuery(org: string, check: string) {
  return readChain(await clientFor("checks"), org, check);
}

/* runs */
export async function runsQuery(workspace: string) {
  return listRuns(await clientFor("runs"), workspace);
}
export async function runQuery(workspace: string, run: string) {
  return readRun(await clientFor("runs"), workspace, run);
}

/* targets and scope */
export async function targetsQuery(workspace: string, archived: boolean) {
  return listTargets(await clientFor("targets"), workspace, { archived });
}
export async function rulesQuery(workspace: string, target: string, all: boolean) {
  return listRules(await clientFor("targets"), workspace, target, { all });
}

/* the graph */
export async function entitiesQuery(workspace: string) {
  return listEntities(await clientFor("entities"), workspace);
}
export async function canvasQuery(workspace: string, root: string, limit?: number) {
  return readCanvas(await clientFor("entities"), workspace, root, { limit });
}
export async function assetsQuery(workspace: string, target?: string) {
  return listAssets(await clientFor("entities"), workspace, { target });
}
export async function fragmentsQuery(workspace: string) {
  return listFragments(await clientFor("entities"), workspace);
}
export async function fragmentQuery(workspace: string, fragment: string) {
  return readFragment(await clientFor("entities"), workspace, fragment);
}

/* observed */
export async function subjectsQuery(workspace: string) {
  return listSubjects(await clientFor("observed"), workspace);
}
export async function observationsQuery(workspace: string, subject: string) {
  return listObservations(await clientFor("observed"), workspace, { subject });
}
export async function lineageQuery(workspace: string, observation: string) {
  return readLineage(await clientFor("observed"), workspace, observation);
}
export async function extractionQuery(workspace: string, invocation: string) {
  return readExtraction(await clientFor("observed"), workspace, invocation);
}

/* coverage */
export async function coverageQuery(workspace: string, target?: string) {
  return readCoverage(await clientFor("coverage"), workspace, { target });
}

/* findings and reports */
export async function findingsQuery(workspace: string, state?: FindingState) {
  return listFindings(await clientFor("findings"), workspace, { state });
}
export async function reportsQuery(workspace: string) {
  return listReports(await clientFor("reports"), workspace);
}
export async function reportQuery(workspace: string, report: string) {
  return readReport(await clientFor("reports"), workspace, report);
}
/** The SAME render `issue` freezes — an editor built on anything else is an
 *  editor for a document nobody receives. */
export async function reportPreviewQuery(workspace: string, report: string) {
  return previewReport(await clientFor("reports"), workspace, report);
}

/* the ledgers. `after` and `facet` are part of the KEY as well as the call —
   a page is a different answer, not a stale one, so they must not share a
   cache entry with the first page. */
export async function orgAuditQuery(org: string, after?: string, facet?: string) {
  return getOrgAudit(await clientFor("ledger"), org, { after, facet, limit: 50 });
}
export async function workspaceAuditQuery(workspace: string, after?: string, facet?: string) {
  return getWorkspaceAudit(await clientFor("ledger"), workspace, { after, facet, limit: 50 });
}
export async function myActivityQuery(after?: string, facet?: string) {
  return getMyActivity(await clientFor("ledger"), { after, facet, limit: 50 });
}

/** Yours only, and it takes no id — it is not a way to read anybody else's. */
export async function sessionsQuery() {
  return listSessions(await clientFor("identity"));
}

/** One act and what it caused. Read as a story, so it arrives oldest first. */
export async function chainOfActsQuery(correlation: string) {
  return getChain(await clientFor("ledger"), correlation);
}

/* Investigation source reads retain workspace and capture identity in every call. */
export async function sourcesQuery(workspace: string, before?: string, query = "") {
  return listSources(await clientFor("sources"), workspace, before, query);
}
export async function sourceSearchQuery(workspace: string, query: string, before?: string) {
  return searchSources(await clientFor("sources"), workspace, query, before);
}
export async function retentionReviewQuery(workspace: string, state: import("@/lib/services/sources").RetentionQueueState, before?: string) {
  return listRetentionReview(await clientFor("sources"), workspace, state, before);
}
export async function retentionCleanupQuery(workspace: string) {
  return listRetentionCleanup(await clientFor("sources"), workspace);
}
export async function retentionCleanupReviewQuery(workspace: string) {
  return readRetentionCleanupReview(await clientFor("sources"), workspace);
}
export async function retentionCleanupHistoryQuery(workspace: string) {
  return listRetentionCleanupReviews(await clientFor("sources"), workspace);
}
export async function retentionCleanupStatusQuery(workspace: string, state = "", before?: string, ref?: string) {
  return listRetentionCleanupStatus(await clientFor("sources"), workspace, state, before, ref);
}
export async function sourceQuery(workspace: string, source: string) {
  return readSource(await clientFor("sources"), workspace, source);
}
export async function sourceRetentionReviewQuery(workspace: string, source: string) {
  return sourceRetentionReview(await clientFor("sources"), workspace, source);
}
export async function captureQuery(workspace: string, source: string, capture: string) {
  return readCapture(await clientFor("sources"), workspace, source, capture);
}
export async function captureExtractionsQuery(workspace: string, source: string, capture: string, before?: string) {
  return listCaptureExtractions(await clientFor("sources"), workspace, source, capture, before);
}
export async function captureExtractionQuery(workspace: string, source: string, capture: string, extraction: string) {
  return readCaptureExtraction(await clientFor("sources"), workspace, source, capture, extraction);
}
export async function latestAssistanceQuery(workspace: string, source: string, capture: string, extraction?: string) {
  return readLatestAssistance(await clientFor("sources"), workspace, source, capture, extraction);
}
export async function assistanceHistoryQuery(workspace: string, source: string, capture: string, extraction?: string) {
  return readAssistanceHistory(await clientFor("sources"), workspace, source, capture, extraction);
}
export async function sourceObservationsQuery(workspace: string, source: string, before?: string) {
  return listSourceObservations(await clientFor("sources"), workspace, source, before);
}
export async function workingNotesQuery(workspace: string) {
  return listWorkingNotes(await clientFor("notes"), workspace);
}
export async function workingNoteQuery(workspace: string, note: string) {
  return readWorkingNote(await clientFor("notes"), workspace, note);
}

export async function evidenceQuery(workspace: string, before?: string) {
  return listEvidence(await clientFor("review"), workspace, before);
}
export async function evidenceByIDQuery(workspace: string, observation: string) {
  return readEvidence(await clientFor("review"), workspace, observation);
}
export async function evidenceRelationsQuery(workspace: string, before?: string) {
  return listEvidenceRelations(await clientFor("review"), workspace, before);
}
export async function evidenceSynthesesQuery(workspace: string, before?: string) {
  return listEvidenceSyntheses(await clientFor("review"), workspace, before);
}
export async function questionsQuery(workspace: string, before?: string) {
  return listQuestions(await clientFor("questions"), workspace, before);
}
export async function questionQuery(workspace: string, question: string) {
  return readQuestion(await clientFor("questions"), workspace, question);
}
export async function questionsByIDsQuery(workspace: string, questionIDs: string[]) {
  return readQuestionsByIDs(await clientFor("questions"), workspace, questionIDs);
}
export async function eventsQuery(workspace: string, before?: string) {
  return listEvents(await clientFor("events"), workspace, before);
}
export async function eventQuery(workspace: string, event: string) {
  return readEvent(await clientFor("events"), workspace, event);
}
export async function briefQuery(workspace: string) {
  return readBrief(await clientFor("brief"), workspace);
}
export async function briefSnapshotsQuery(workspace: string, before?: string) {
  return listBriefSnapshots(await clientFor("brief"), workspace, before);
}
export async function briefSnapshotQuery(workspace: string, snapshot: string) {
  return readBriefSnapshot(await clientFor("brief"), workspace, snapshot);
}
export async function briefSnapshotEvidenceQuery(workspace: string, observationIds: string[]) {
  return evidenceByIDsQuery(workspace, observationIds);
}

export async function researchRecordsQuery(workspace: string, before?: string) {
  return listResearchRecords(await clientFor("research-records"), workspace, before);
}
export async function researchRecordQuery(workspace: string, record: string) {
  return readResearchRecord(await clientFor("research-records"), workspace, record);
}
export async function researchRecordsByIDsQuery(workspace: string, recordIDs: string[]) {
  return readResearchRecordsByIDs(await clientFor("research-records"), workspace, recordIDs);
}
export async function researchConnectionsQuery(workspace: string, before?: string) {
  return listResearchConnections(await clientFor("research-connections"), workspace, before);
}
export async function researchConnectionQuery(workspace: string, connection: string) {
  return readResearchConnection(await clientFor("research-connections"), workspace, connection);
}
export async function researchConnectionsByIDsQuery(workspace: string, connectionIDs: string[]) {
  return readResearchConnectionsByIDs(await clientFor("research-connections"), workspace, connectionIDs);
}
export async function researchConnectionRevisionsQuery(workspace: string, connection: string) {
  return listResearchConnectionRevisions(await clientFor("research-connections"), workspace, connection);
}
export async function researchConnectionRevisionQuery(workspace: string, connection: string, revision: string) {
  return readResearchConnectionRevision(await clientFor("research-connections"), workspace, connection, revision);
}
export async function researchResolutionsQuery(workspace: string, before?: string) {
  return listResearchResolutions(await clientFor("research-resolutions"), workspace, before);
}

export async function evidenceByIDsQuery(workspace: string, observationIds: string[]) {
  return readEvidenceByIDs(await clientFor("review"), workspace, observationIds);
}

export async function sourceObservationQuery(workspace: string, source: string, observation: string) {
  return readSourceObservation(await clientFor("sources"), workspace, source, observation);
}

export async function investigationContextQuery(workspace: string) {
  return loadInvestigationContext(workspace);
}
