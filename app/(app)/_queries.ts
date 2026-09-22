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

import { listRetentionCleanup, listRetentionCleanupReviews, listRetentionCleanupStatus, listRetentionReview, listSourceAlerts, listSourceIntake, listSources, searchSources, readRetentionCleanupReview, readSource, readCapture, listCaptureExtractions, readCaptureExtraction, listSourceObservations, readSourceObservation, listCitationShares, readSharedCitation, readSourceWatch, readSourceAlertDelivery, sourceRetentionReview } from "@/lib/services/sources";
import { readAssistanceHistory, readAssistanceProviderPolicy, readAssistanceProviderRuns, readLatestAssistance } from "@/lib/services/assistance";
import { readHealth } from "@/lib/services/health";
import { listWorkingNotes, listWorkingNotesPage, readWorkingNote, type NoteContextKind } from "@/lib/services/notes";
import { listEvidence, listEvidenceBoard, listEvidenceClusterCoverage, listEvidenceClusters, listEvidenceComparisons, listEvidenceQuestionSuggestions, listEvidenceRelations, listEvidenceSourceLinks, listEvidenceSyntheses, readEvidence, readEvidenceByIDs, type BoardReviewState } from "@/lib/services/review";
import { listQuestions, readQuestion, readQuestionsByIDs } from "@/lib/services/questions";
import { listEventAccounts, listEventClusters, listEventRelationships, listEventRevisions, listEvents, readEvent, readEventRevision } from "@/lib/services/events";
import { listBriefDrafts, listBriefRecipientHandoffs, listBriefSnapshots, listBriefSnapshotComments, listBriefSnapshotShares, readBrief, readBriefRecipientHandoff, readBriefSharedHandoff, readBriefSnapshot, readBriefSnapshotActivity, readBriefSnapshotReview } from "@/lib/services/brief";
import { listResearchRecords, readResearchRecord, readResearchRecordNeighborhood, readResearchRecordsByIDs, readResearchRecordSummary, type ResearchRecordCitationFilter, type ResearchRecordKind, type ResearchRecordResolutionFilter } from "@/lib/services/research-records";
import { listResearchConnections, listResearchConnectionReviews, listResearchConnectionRevisions, readResearchConnection, readResearchConnectionReview, readResearchConnectionRevision, readResearchConnectionSummary, readResearchConnectionsByIDs, type ResearchConnectionReviewFilter, type ResearchConnectionState } from "@/lib/services/research-connections";
import { listResearchResolutions, readResearchResolutionImpact } from "@/lib/services/research-resolutions";
import { listResearchResolutionSets, readResearchResolutionSetImpact } from "@/lib/services/research-resolution-sets";
import { clientFor } from "@/lib/root";
import { isAppError } from "@/lib/kernel";
import { getChain, getMyActivity, getOrgAudit, getWorkspaceAudit, getWorkspaceLogs } from "@/lib/services/ledger";
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
import { listChanges } from "@/lib/services/changes";
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

/* Home → What’s new is a projection, not a browser-side diff. The server
   compares completed runs and keeps the distinction between a value that
   disappeared and a field that was never measured. */
export async function changesQuery(workspace: string) {
  return listChanges(await clientFor("changes"), workspace);
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
export async function workspaceLogsQuery(workspace: string, after?: string) {
  return getWorkspaceLogs(await clientFor("ledger"), workspace, { after, limit: 50 });
}

export async function briefSnapshotActivityQuery(workspace: string, snapshot: string, after?: string, facet?: string) {
  return readBriefSnapshotActivity(await clientFor("brief"), workspace, snapshot, { after, facet });
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
export async function sourceIntakeQuery(workspace: string, status = "", before?: string) {
  return listSourceIntake(await clientFor("sources"), workspace, status, before);
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
  try {
    return await readSource(await clientFor("sources"), workspace, source);
  } catch (error) {
    // A stale source link is an expected read outcome for a deep link. Keep it
    // distinct from transport and server failures so the client can render a
    // useful unavailable state without generating a server-action 500.
    if (isAppError(error) && error.status === 404) return null;
    throw error;
  }
}
export async function sourceWatchQuery(workspace: string, source: string) {
  return readSourceWatch(await clientFor("sources"), workspace, source);
}
export async function sourceAlertsQuery(workspace: string, before?: string) {
  return listSourceAlerts(await clientFor("sources"), workspace, before);
}
export async function sourceAlertDeliveryQuery(workspace: string) {
  return readSourceAlertDelivery(await clientFor("sources"), workspace);
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

export async function assistanceProviderPolicyQuery(workspace: string) {
  return readAssistanceProviderPolicy(await clientFor("sources"), workspace);
}
export async function assistanceProviderRunsQuery(workspace: string) {
  return readAssistanceProviderRuns(await clientFor("sources"), workspace);
}
export async function healthQuery(workspace: string) {
  return readHealth(await clientFor("health"), workspace);
}
export async function sourceObservationsQuery(workspace: string, source: string, before?: string) {
  return listSourceObservations(await clientFor("sources"), workspace, source, before);
}
export async function workingNotesQuery(workspace: string) {
  return listWorkingNotes(await clientFor("notes"), workspace);
}
export async function workingNotesPageQuery(workspace: string, before?: string, query = "", contextKind?: NoteContextKind) {
  return listWorkingNotesPage(await clientFor("notes"), workspace, before, query, contextKind);
}
export async function workingNoteQuery(workspace: string, note: string) {
  return readWorkingNote(await clientFor("notes"), workspace, note);
}

export async function evidenceQuery(workspace: string, before?: string) {
  return listEvidence(await clientFor("review"), workspace, before);
}
export async function evidenceBoardQuery(workspace: string, before?: string, query = "", source = "", state: BoardReviewState | "" = "", record = "", event = "", dateFrom = "", dateTo = "", unresolved = false) {
  return listEvidenceBoard(await clientFor("review"), workspace, before, query, source, state, record, event, dateFrom, dateTo, unresolved);
}
export async function evidenceByIDQuery(workspace: string, observation: string) {
  return readEvidence(await clientFor("review"), workspace, observation);
}
export async function evidenceRelationsQuery(workspace: string, before?: string) {
  return listEvidenceRelations(await clientFor("review"), workspace, before);
}
export async function evidenceSourceLinksQuery(workspace: string, before?: string) {
  return listEvidenceSourceLinks(await clientFor("review"), workspace, before);
}
export async function evidenceClustersQuery(workspace: string, before?: string) {
  return listEvidenceClusters(await clientFor("review"), workspace, before);
}
export async function evidenceClusterCoverageQuery(workspace: string, before?: string) {
  return listEvidenceClusterCoverage(await clientFor("review"), workspace, before);
}
export async function evidenceSynthesesQuery(workspace: string, before?: string) {
  return listEvidenceSyntheses(await clientFor("review"), workspace, before);
}
export async function evidenceComparisonsQuery(workspace: string, before?: string) {
  return listEvidenceComparisons(await clientFor("review"), workspace, before);
}
export async function evidenceQuestionSuggestionsQuery(workspace: string, before?: string) {
  return listEvidenceQuestionSuggestions(await clientFor("review"), workspace, before);
}
export async function questionsQuery(workspace: string, before?: string, state?: import("@/lib/services/questions").QuestionState | "") {
  return listQuestions(await clientFor("questions"), workspace, before, state);
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
export async function eventRevisionsQuery(workspace: string, event: string) {
  return listEventRevisions(await clientFor("events"), workspace, event);
}
export async function eventAccountsQuery(workspace: string, event: string) {
  return listEventAccounts(await clientFor("events"), workspace, event);
}
export async function eventClustersQuery(workspace: string, before?: string) {
  return listEventClusters(await clientFor("events"), workspace, before);
}
export async function eventRelationshipsQuery(workspace: string, before?: string) {
  return listEventRelationships(await clientFor("events"), workspace, before);
}
export async function eventRevisionQuery(workspace: string, event: string, revision: string) {
  return readEventRevision(await clientFor("events"), workspace, event, revision);
}
export async function eventsByIDsQuery(workspace: string, eventIDs: string[]) {
  const http = await clientFor("events");
  return Promise.all(eventIDs.map((event) => readEvent(http, workspace, event)));
}
export async function briefQuery(workspace: string) {
  return readBrief(await clientFor("brief"), workspace);
}
export async function briefDraftsQuery(workspace: string, before?: string) {
  return listBriefDrafts(await clientFor("brief"), workspace, before);
}
export async function briefSnapshotsQuery(workspace: string, before?: string) {
  return listBriefSnapshots(await clientFor("brief"), workspace, before);
}
export async function briefSnapshotQuery(workspace: string, snapshot: string) {
  return readBriefSnapshot(await clientFor("brief"), workspace, snapshot);
}
export async function briefSnapshotReviewQuery(workspace: string, snapshot: string) {
  return readBriefSnapshotReview(await clientFor("brief"), workspace, snapshot);
}
export async function briefSnapshotCommentsQuery(workspace: string, snapshot: string) {
  return listBriefSnapshotComments(await clientFor("brief"), workspace, snapshot);
}
export async function briefRecipientHandoffsQuery(workspace: string, before?: string) {
  return listBriefRecipientHandoffs(await clientFor("brief"), workspace, before);
}
export async function briefRecipientHandoffQuery(workspace: string, snapshot: string) {
  return readBriefRecipientHandoff(await clientFor("brief"), workspace, snapshot);
}
export async function briefSharedHandoffQuery(workspace: string, token: string) {
  return readBriefSharedHandoff(await clientFor("brief"), workspace, token);
}
export async function briefSnapshotSharesQuery(workspace: string, snapshot: string) {
  return listBriefSnapshotShares(await clientFor("brief"), workspace, snapshot);
}
export async function briefSnapshotEvidenceQuery(workspace: string, observationIds: string[]) {
  return evidenceByIDsQuery(workspace, observationIds);
}

export async function researchRecordsQuery(workspace: string, before?: string, query = "", kind?: ResearchRecordKind, citation: ResearchRecordCitationFilter = "", resolution: ResearchRecordResolutionFilter = "") {
  return listResearchRecords(await clientFor("research-records"), workspace, before, query, kind, citation, resolution);
}
export async function researchRecordQuery(workspace: string, record: string) {
  return readResearchRecord(await clientFor("research-records"), workspace, record);
}
export async function researchRecordNeighborhoodQuery(workspace: string, record: string, depth: 1 | 2 = 1) {
  return readResearchRecordNeighborhood(await clientFor("research-records"), workspace, record, depth);
}
export async function researchRecordSummaryQuery(workspace: string) {
  return readResearchRecordSummary(await clientFor("research-records"), workspace);
}
export async function researchRecordsByIDsQuery(workspace: string, recordIDs: string[]) {
  return readResearchRecordsByIDs(await clientFor("research-records"), workspace, recordIDs);
}
export async function researchConnectionsQuery(workspace: string, before?: string, state: ResearchConnectionState | "" = "", review: ResearchConnectionReviewFilter = "") {
  return listResearchConnections(await clientFor("research-connections"), workspace, before, state, review);
}
export async function researchConnectionSummaryQuery(workspace: string) {
  return readResearchConnectionSummary(await clientFor("research-connections"), workspace);
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
export async function researchConnectionReviewsQuery(workspace: string, connection: string, before?: string) {
  return listResearchConnectionReviews(await clientFor("research-connections"), workspace, connection, before);
}
export async function researchConnectionReviewQuery(workspace: string, connection: string, review: string) {
  return readResearchConnectionReview(await clientFor("research-connections"), workspace, connection, review);
}
export async function researchResolutionsQuery(workspace: string, before?: string) {
  return listResearchResolutions(await clientFor("research-resolutions"), workspace, before);
}
export async function researchResolutionImpactQuery(workspace: string, resolution: string) {
  return readResearchResolutionImpact(await clientFor("research-resolutions"), workspace, resolution);
}
export async function researchResolutionSetsQuery(workspace: string, before?: string) {
  return listResearchResolutionSets(await clientFor("research-resolutions"), workspace, before);
}
export async function researchResolutionSetImpactQuery(workspace: string, resolutionSet: string) {
  return readResearchResolutionSetImpact(await clientFor("research-resolutions"), workspace, resolutionSet);
}

export async function evidenceByIDsQuery(workspace: string, observationIds: string[]) {
  return readEvidenceByIDs(await clientFor("review"), workspace, observationIds);
}

export async function sourceObservationQuery(workspace: string, source: string, observation: string) {
  return readSourceObservation(await clientFor("sources"), workspace, source, observation);
}
export async function sourceObservationSharesQuery(workspace: string, source: string, observation: string) {
  return listCitationShares(await clientFor("sources"), workspace, source, observation);
}
export async function sharedCitationQuery(workspace: string, token: string) {
  return readSharedCitation(await clientFor("sources"), workspace, token);
}

export async function investigationContextQuery(workspace: string) {
  try {
    return await loadInvestigationContext(workspace);
  } catch (error) {
    // The route layout already turns an unavailable investigation into the
    // shared not-found boundary. The client chrome asks for the same context
    // while it hydrates, so a stale deep link must be a successful `null`
    // answer there rather than a server-action 500 in the browser console.
    if (isAppError(error) && error.status === 404) return null;
    throw error;
  }
}
