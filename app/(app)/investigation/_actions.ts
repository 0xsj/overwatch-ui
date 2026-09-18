"use server";

import { revalidatePath } from "next/cache";
import { clientFor } from "@/lib/root";
import { isAppError } from "@/lib/kernel";
import { getMe, openWorkspace } from "@/lib/services/tenancy";
import { addCapture, addSource, addSourceObservation, discardRetentionCleanupReview, extractCapture, fetchSource, purgeSource, saveRetentionCleanupReview, setSourcePrivacy, setSourceRetention, sweepRetentionCleanup, type AddObservation, type AddSource, type MediaType, type SetSourcePrivacy, type SetSourceRetention } from "@/lib/services/sources";
import { editWorkingNote, writeWorkingNote } from "@/lib/services/notes";
import { createEvidenceSynthesis, readEvidence, setEvidenceRelation, type SetEvidenceRelation } from "@/lib/services/review";
import { createQuestion, updateQuestion, type WriteQuestion } from "@/lib/services/questions";
import { generateAssistance, reviewAssistanceProposal, type ReviewAssistanceProposal } from "@/lib/services/assistance";
import { createEvent, updateEvent, type WriteEvent } from "@/lib/services/events";
import { createBriefSnapshot, saveBrief, type WriteBrief } from "@/lib/services/brief";
import { createResearchRecord, updateResearchRecord, type WriteResearchRecord } from "@/lib/services/research-records";
import { createResearchConnection, updateResearchConnection, type WriteResearchConnection } from "@/lib/services/research-connections";
import { createResearchResolution, reviewResearchResolution, reverseResearchResolution, type ProposeResearchResolution, type ResearchResolutionDecision } from "@/lib/services/research-resolutions";
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
async function addSourceFrom(workspace: string, body: AddSource) {
  return addSource(await clientFor("sources"), workspace, body);
}
export async function addCaptureAction(workspace: string, source: string, content: string, media: MediaType, contentBase64?: string) {
  return attempt(async () => addCapture(await clientFor("sources"), workspace, source, content, media, contentBase64));
}
export async function fetchSourceAction(workspace: string, source: string) {
  return attempt(async () => fetchSource(await clientFor("sources"), workspace, source));
}
export async function setSourceRetentionAction(workspace: string, source: string, body: SetSourceRetention) {
  return attempt(async () => setSourceRetention(await clientFor("sources"), workspace, source, body));
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
export async function saveNoteAction(workspace: string, body: string, note?: string) {
  return attempt(async () => {
    const http = await clientFor("notes");
    return note ? editWorkingNote(http, workspace, note, body) : writeWorkingNote(http, workspace, body);
  });
}

export async function setEvidenceRelationAction(workspace: string, body: SetEvidenceRelation) {
  return attempt(async () => setEvidenceRelation(await clientFor("review"), workspace, body));
}
export async function createEvidenceSynthesisAction(workspace: string, observationIds: string[]) {
  return attempt(async () => createEvidenceSynthesis(await clientFor("review"), workspace, observationIds));
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
export async function generateAssistanceAction(workspace: string, source: string, capture: string, extraction?: string) {
  return attempt(async () => generateAssistance(await clientFor("sources"), workspace, source, capture, extraction));
}
export async function reviewAssistanceProposalAction(workspace: string, operation: string, proposal: string, body: ReviewAssistanceProposal) {
  return attempt(async () => reviewAssistanceProposal(await clientFor("sources"), workspace, operation, proposal, body));
}
export async function createEventAction(workspace: string, body: WriteEvent) {
  return attempt(async () => createEvent(await clientFor("events"), workspace, body));
}
export async function updateEventAction(workspace: string, event: string, body: WriteEvent) {
  return attempt(async () => updateEvent(await clientFor("events"), workspace, event, body));
}
export async function saveBriefAction(workspace: string, body: WriteBrief) {
  return attempt(async () => saveBrief(await clientFor("brief"), workspace, body));
}
export async function freezeBriefAction(workspace: string) {
  return attempt(async () => createBriefSnapshot(await clientFor("brief"), workspace));
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
export async function createResearchResolutionAction(workspace: string, alias: string, body: ProposeResearchResolution) {
  return attempt(async () => createResearchResolution(await clientFor("research-resolutions"), workspace, alias, body));
}
export async function reviewResearchResolutionAction(workspace: string, resolution: string, decision: ResearchResolutionDecision) {
  return attempt(async () => reviewResearchResolution(await clientFor("research-resolutions"), workspace, resolution, decision));
}
export async function reverseResearchResolutionAction(workspace: string, resolution: string) {
  return attempt(async () => reverseResearchResolution(await clientFor("research-resolutions"), workspace, resolution));
}
