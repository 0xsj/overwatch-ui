"use server";

import { revalidatePath } from "next/cache";
import { clientFor } from "@/lib/root";
import { isAppError } from "@/lib/kernel";
import { getMe, openWorkspace } from "@/lib/services/tenancy";
import { addCapture, addSource, addSourceObservation, configureSourceWatch, createCitationShare, createSourceIntake, discardRetentionCleanupReview, extractCapture, fetchSource, purgeSource, reviewSourceIntake, revokeCitationShare, runSourceWatch, saveRetentionCleanupReview, setSourceDuplicatePolicy, setSourcePrivacy, setSourcePublication, setSourceRetention, sweepRetentionCleanup, type AddObservation, type AddSource, type ConfigureSourceWatch, type CreateSourceIntake, type MediaType, type ReviewSourceIntake, type SetSourceDuplicatePolicy, type SetSourcePrivacy, type SetSourcePublication, type SetSourceRetention } from "@/lib/services/sources";
import { editWorkingNote, writeWorkingNote, type NoteContext } from "@/lib/services/notes";
import { createEvidenceCluster, createEvidenceComparison, createEvidenceQuestionSuggestions, createEvidenceSynthesis, readEvidence, setEvidenceRelation, setEvidenceSourceLink, updateEvidenceCluster, type EvidenceQuestionSuggestionGap, type SetEvidenceRelation, type SetEvidenceSourceLink, type WriteEvidenceCluster } from "@/lib/services/review";
import { createQuestion, updateQuestion, type WriteQuestion } from "@/lib/services/questions";
import { generateAssistance, reviewAssistanceProposal, setAssistanceProviderPolicy, type ReviewAssistanceProposal } from "@/lib/services/assistance";
import { createEvent, createEventAccount, createEventCluster, createEventRelationship, reconcileEventAccounts, reviewEventCluster, reviewEventRelationship, updateEvent, type WriteEvent, type WriteEventAccount, type WriteEventCluster, type WriteEventRelationship } from "@/lib/services/events";
import { addBriefSnapshotComment, assignBriefSnapshotReviewer, createBriefDraft, createBriefSnapshot, createBriefSnapshotShare, revokeBriefSnapshotShare, saveBrief, submitBriefSnapshotReview, type AddSnapshotComment, type SnapshotReviewAssignment, type SnapshotReviewDecision, type WriteBrief } from "@/lib/services/brief";
import { createResearchRecord, updateResearchRecord, type WriteResearchRecord } from "@/lib/services/research-records";
import { createResearchConnection, createResearchConnectionReview, updateResearchConnection, type WriteResearchConnection } from "@/lib/services/research-connections";
import { createResearchResolution, reviewResearchResolution, reverseResearchResolution, type ProposeResearchResolution, type ResearchResolutionDecision } from "@/lib/services/research-resolutions";
import { createResearchResolutionSet, reviewResearchResolutionSet, reverseResearchResolutionSet, type ProposeResearchResolutionSet, type ResearchResolutionSetDecision } from "@/lib/services/research-resolution-sets";
import { selectOrg, selectWorkspace } from "../_selection";

async function attempt<T>(run: () => Promise<T>) {
  try { return { ok: true as const, value: await run() }; }
  catch (error) {
    return { ok: false as const, message: isAppError(error) ? error.message : "The change could not be saved. Please try again." };
  }
}

export async function createInvestigationAction(org: string, name: string) {
  const opened = await attempt(async () => openWorkspace(await clientFor("tenancy"), org, name));
  if (!opened.ok) return opened;
  const workspace = opened.value;
  await selectOrg(org);
  await selectWorkspace(workspace.workspace_id);
  revalidatePath("/", "layout");

  // The creation already succeeded. A delayed admin grant must not turn that
  // into a retryable create error or send the new workspace to a temporary 404.
  let ready = false;
  try {
    const http = await clientFor("tenancy");
    for (let check = 0; check < 3; check++) {
      if (check > 0) await new Promise((resolve) => setTimeout(resolve, check === 1 ? 100 : 250));
      const me = await getMe(http);
      ready = me.orgs.some((one) => one.workspaces.some((entry) => entry.workspace_id === workspace.workspace_id));
      if (ready) break;
    }
  } catch { /* Read availability cannot undo an acknowledged creation. */ }
  return { ok: true as const, value: { workspace, ready } };
}

/** The URL owns research context; the cookie is only continuity into legacy views. */
export async function rememberInvestigationAction(workspace: string) {
  const me = await getMe(await clientFor("tenancy"));
  const org = me.orgs.find((one) => one.workspaces.some((entry) => entry.workspace_id === workspace));
  if (!org || org.role === "client") return;
  await selectOrg(org.org_id);
  await selectWorkspace(workspace);
}

export async function addSourceAction(workspace: string, body: AddSource) {
  return attempt(() => addSourceFrom(workspace, body));
}
export async function createSourceIntakeAction(workspace: string, body: CreateSourceIntake) {
  return attempt(async () => createSourceIntake(await clientFor("sources"), workspace, body));
}
export async function reviewSourceIntakeAction(workspace: string, intake: string, body: ReviewSourceIntake) {
  return attempt(async () => reviewSourceIntake(await clientFor("sources"), workspace, intake, body));
}
async function addSourceFrom(workspace: string, body: AddSource) {
  return addSource(await clientFor("sources"), workspace, body);
}
export async function addCaptureAction(workspace: string, source: string, content: string, media: MediaType, contentBase64?: string) {
  return attempt(async () => addCapture(await clientFor("sources"), workspace, source, content, media, contentBase64));
}
export async function fetchSourceAction(workspace: string, source: string) {
  return attempt(async () => fetchSource(await clientFor("sources"), workspace, source));
}
export async function configureSourceWatchAction(workspace: string, source: string, body: ConfigureSourceWatch) {
  return attempt(async () => configureSourceWatch(await clientFor("sources"), workspace, source, body));
}
export async function runSourceWatchAction(workspace: string, source: string) {
  return attempt(async () => runSourceWatch(await clientFor("sources"), workspace, source));
}
export async function setSourceRetentionAction(workspace: string, source: string, body: SetSourceRetention) {
  return attempt(async () => setSourceRetention(await clientFor("sources"), workspace, source, body));
}
export async function setSourcePublicationAction(workspace: string, source: string, body: SetSourcePublication) {
  return attempt(async () => setSourcePublication(await clientFor("sources"), workspace, source, body));
}
export async function setSourceDuplicatePolicyAction(workspace: string, source: string, body: SetSourceDuplicatePolicy) {
  return attempt(async () => setSourceDuplicatePolicy(await clientFor("sources"), workspace, source, body));
}
export async function setSourcePrivacyAction(workspace: string, source: string, body: SetSourcePrivacy) {
  return attempt(async () => setSourcePrivacy(await clientFor("sources"), workspace, source, body));
}
export async function purgeSourceAction(workspace: string, source: string, reason: string) {
  return attempt(async () => purgeSource(await clientFor("sources"), workspace, source, reason));
}
export async function saveRetentionCleanupReviewAction(workspace: string, selectedRefs: string[]) {
  return attempt(async () => saveRetentionCleanupReview(await clientFor("sources"), workspace, selectedRefs));
}
export async function sweepRetentionCleanupAction(workspace: string, selectedRefs: string[], reviewId = "", limit = 100) {
  return attempt(async () => sweepRetentionCleanup(await clientFor("sources"), workspace, selectedRefs, reviewId, limit));
}
export async function discardRetentionCleanupReviewAction(workspace: string, reviewId: string, reason: string) {
  return attempt(async () => discardRetentionCleanupReview(await clientFor("sources"), workspace, reviewId, reason));
}
export async function extractCaptureAction(workspace: string, source: string, capture: string) {
  return attempt(async () => extractCapture(await clientFor("sources"), workspace, source, capture));
}
export async function addObservationAction(workspace: string, source: string, body: AddObservation) {
  return attempt(async () => addSourceObservation(await clientFor("sources"), workspace, source, body));
}
export async function createCitationShareAction(workspace: string, source: string, observation: string) {
  return attempt(async () => createCitationShare(await clientFor("sources"), workspace, source, observation));
}
export async function revokeCitationShareAction(workspace: string, share: string) {
  return attempt(async () => revokeCitationShare(await clientFor("sources"), workspace, share));
}
export async function saveNoteAction(workspace: string, body: string, note?: string, context?: NoteContext) {
  return attempt(async () => {
    const http = await clientFor("notes");
    return note ? editWorkingNote(http, workspace, note, body) : writeWorkingNote(http, workspace, body, context);
  });
}

export async function setEvidenceRelationAction(workspace: string, body: SetEvidenceRelation) {
  return attempt(async () => setEvidenceRelation(await clientFor("review"), workspace, body));
}
export async function setEvidenceSourceLinkAction(workspace: string, body: SetEvidenceSourceLink) {
  return attempt(async () => setEvidenceSourceLink(await clientFor("review"), workspace, body));
}
export async function createEvidenceSynthesisAction(workspace: string, observationIds: string[]) {
  return attempt(async () => createEvidenceSynthesis(await clientFor("review"), workspace, observationIds));
}
export async function createEvidenceComparisonAction(workspace: string, observationIds: string[]) {
  return attempt(async () => createEvidenceComparison(await clientFor("review"), workspace, observationIds));
}

export async function createEvidenceQuestionSuggestionsAction(workspace: string, gaps: EvidenceQuestionSuggestionGap[]) {
  return attempt(async () => createEvidenceQuestionSuggestions(await clientFor("review"), workspace, gaps));
}
export async function createEvidenceClusterAction(workspace: string, body: WriteEvidenceCluster) {
  return attempt(async () => createEvidenceCluster(await clientFor("review"), workspace, body));
}
export async function updateEvidenceClusterAction(workspace: string, cluster: string, body: WriteEvidenceCluster) {
  return attempt(async () => updateEvidenceCluster(await clientFor("review"), workspace, cluster, body));
}
export async function hydrateEvidenceAction(workspace: string, observationIds: string[]) {
  return attempt(async () => {
    const http = await clientFor("review");
    return Promise.all(observationIds.map((observation) => readEvidence(http, workspace, observation)));
  });
}
export async function createQuestionAction(workspace: string, body: WriteQuestion) {
  return attempt(async () => createQuestion(await clientFor("questions"), workspace, body));
}
export async function updateQuestionAction(workspace: string, question: string, body: WriteQuestion) {
  return attempt(async () => updateQuestion(await clientFor("questions"), workspace, question, body));
}
export async function generateAssistanceAction(workspace: string, source: string, capture: string, extraction?: string, retryOperation?: string) {
  return attempt(async () => generateAssistance(await clientFor("sources"), workspace, source, capture, extraction, retryOperation));
}
export async function reviewAssistanceProposalAction(workspace: string, operation: string, proposal: string, body: ReviewAssistanceProposal) {
  return attempt(async () => reviewAssistanceProposal(await clientFor("sources"), workspace, operation, proposal, body));
}
export async function setAssistanceProviderPolicyAction(workspace: string, allowExternal: boolean) {
  return attempt(async () => setAssistanceProviderPolicy(await clientFor("sources"), workspace, allowExternal));
}
export async function createEventAction(workspace: string, body: WriteEvent) {
  return attempt(async () => createEvent(await clientFor("events"), workspace, body));
}
export async function updateEventAction(workspace: string, event: string, body: WriteEvent) {
  return attempt(async () => updateEvent(await clientFor("events"), workspace, event, body));
}
export async function createEventAccountAction(workspace: string, event: string, body: WriteEventAccount) {
  return attempt(async () => createEventAccount(await clientFor("events"), workspace, event, body));
}
export async function reconcileEventAccountsAction(workspace: string, event: string, body: { decision: "unresolved" | "retain_event" | "prefer_account"; selected_account_id?: string; rationale: string }) {
  return attempt(async () => reconcileEventAccounts(await clientFor("events"), workspace, event, body));
}
export async function createEventClusterAction(workspace: string, body: WriteEventCluster) {
  return attempt(async () => createEventCluster(await clientFor("events"), workspace, body));
}
export async function reviewEventClusterAction(workspace: string, cluster: string, body: { state: "proposed" | "accepted" | "rejected"; note: string }) {
  return attempt(async () => reviewEventCluster(await clientFor("events"), workspace, cluster, body));
}

export async function createEventRelationshipAction(workspace: string, body: WriteEventRelationship) {
  return attempt(async () => createEventRelationship(await clientFor("events"), workspace, body));
}

export async function reviewEventRelationshipAction(workspace: string, relationship: string, body: { state: "proposed" | "accepted" | "rejected"; note: string }) {
  return attempt(async () => reviewEventRelationship(await clientFor("events"), workspace, relationship, body));
}
export async function saveBriefAction(workspace: string, body: WriteBrief) {
  return attempt(async () => saveBrief(await clientFor("brief"), workspace, body));
}
export async function createBriefDraftAction(workspace: string, observationIds: string[]) {
  return attempt(async () => createBriefDraft(await clientFor("brief"), workspace, observationIds));
}
export async function freezeBriefAction(workspace: string) {
  return attempt(async () => createBriefSnapshot(await clientFor("brief"), workspace));
}
export async function assignBriefSnapshotReviewerAction(workspace: string, snapshot: string, body: SnapshotReviewAssignment) {
  return attempt(async () => assignBriefSnapshotReviewer(await clientFor("brief"), workspace, snapshot, body));
}
export async function submitBriefSnapshotReviewAction(workspace: string, snapshot: string, body: SnapshotReviewDecision) {
  return attempt(async () => submitBriefSnapshotReview(await clientFor("brief"), workspace, snapshot, body));
}
export async function addBriefSnapshotCommentAction(workspace: string, snapshot: string, body: AddSnapshotComment) {
  return attempt(async () => addBriefSnapshotComment(await clientFor("brief"), workspace, snapshot, body));
}
export async function createBriefSnapshotShareAction(workspace: string, snapshot: string) {
  return attempt(async () => createBriefSnapshotShare(await clientFor("brief"), workspace, snapshot));
}
export async function revokeBriefSnapshotShareAction(workspace: string, share: string) {
  return attempt(async () => revokeBriefSnapshotShare(await clientFor("brief"), workspace, share));
}

export async function createResearchRecordAction(workspace: string, body: WriteResearchRecord) {
  return attempt(async () => createResearchRecord(await clientFor("research-records"), workspace, body));
}
export async function updateResearchRecordAction(workspace: string, record: string, body: WriteResearchRecord) {
  return attempt(async () => updateResearchRecord(await clientFor("research-records"), workspace, record, body));
}
export async function createResearchConnectionAction(workspace: string, body: WriteResearchConnection) {
  return attempt(async () => createResearchConnection(await clientFor("research-connections"), workspace, body));
}
export async function updateResearchConnectionAction(workspace: string, connection: string, body: WriteResearchConnection) {
  return attempt(async () => updateResearchConnection(await clientFor("research-connections"), workspace, connection, body));
}
export async function createResearchConnectionReviewAction(workspace: string, connection: string) {
  return attempt(async () => createResearchConnectionReview(await clientFor("research-connections"), workspace, connection));
}
export async function createResearchResolutionAction(workspace: string, alias: string, body: ProposeResearchResolution) {
  return attempt(async () => createResearchResolution(await clientFor("research-resolutions"), workspace, alias, body));
}
export async function reviewResearchResolutionAction(workspace: string, resolution: string, decision: ResearchResolutionDecision) {
  return attempt(async () => reviewResearchResolution(await clientFor("research-resolutions"), workspace, resolution, decision));
}
export async function reverseResearchResolutionAction(workspace: string, resolution: string) {
  return attempt(async () => reverseResearchResolution(await clientFor("research-resolutions"), workspace, resolution));
}
export async function createResearchResolutionSetAction(workspace: string, body: ProposeResearchResolutionSet) {
  return attempt(async () => createResearchResolutionSet(await clientFor("research-resolutions"), workspace, body));
}
export async function reviewResearchResolutionSetAction(workspace: string, resolutionSet: string, decision: ResearchResolutionSetDecision) {
  return attempt(async () => reviewResearchResolutionSet(await clientFor("research-resolutions"), workspace, resolutionSet, decision));
}
export async function reverseResearchResolutionSetAction(workspace: string, resolutionSet: string) {
  return attempt(async () => reverseResearchResolutionSet(await clientFor("research-resolutions"), workspace, resolutionSet));
}
