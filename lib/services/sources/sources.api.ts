import type { HttpClient } from "@/lib/http";
import type { AddObservation, AddSource, ArtifactCleanupInventory, ArtifactCleanupResult, ArtifactCleanupReview, ArtifactCleanupReviewPage, ArtifactLifecyclePage, Capture, CaptureSummary, ManualObservation, MediaType, Page, PurgeSource, RetentionQueuePage, RetentionQueueState, SetSourcePrivacy, SetSourceRetention, SourceDetail, SourceExtraction, SourceExtractionPage, SourceRetentionReview, SourceSearchPage, SourceSummary } from "./sources.types";

const base = (workspace: string) => `/workspaces/${encodeURIComponent(workspace)}/sources`;
const sourcePath = (workspace: string, source: string) => `${base(workspace)}/${encodeURIComponent(source)}`;
const retentionReviewPath = (workspace: string) => `/workspaces/${encodeURIComponent(workspace)}/retention-review`;
const retentionCleanupPath = (workspace: string) => `/workspaces/${encodeURIComponent(workspace)}/retention-cleanup`;
const retentionCleanupStatusPath = (workspace: string) => `${retentionCleanupPath(workspace)}/status`;

export function listSources(http: HttpClient, workspace: string, before?: string, query = "") {
  return http.get<Page<SourceSummary>>(base(workspace), { params: { before, q: query.trim() || undefined, limit: 50 } });
}
export function searchSources(http: HttpClient, workspace: string, query: string, before?: string) {
  return http.get<SourceSearchPage>(`/workspaces/${encodeURIComponent(workspace)}/search`, { params: { q: query.trim(), before, limit: 50 } });
}
export function listRetentionReview(http: HttpClient, workspace: string, state: RetentionQueueState = "", before?: string) {
  return http.get<RetentionQueuePage>(retentionReviewPath(workspace), { params: { before, state: state || undefined, limit: 50 } });
}
export function listRetentionCleanup(http: HttpClient, workspace: string) {
  return http.get<ArtifactCleanupInventory>(retentionCleanupPath(workspace), { params: { limit: 100 } });
}
export function readRetentionCleanupReview(http: HttpClient, workspace: string) {
  return http.get<ArtifactCleanupReview>(`${retentionCleanupPath(workspace)}/review`);
}
export function saveRetentionCleanupReview(http: HttpClient, workspace: string, selectedRefs: string[]) {
  return http.put<ArtifactCleanupReview>(`${retentionCleanupPath(workspace)}/review`, { body: { selected_refs: selectedRefs } });
}
export function listRetentionCleanupReviews(http: HttpClient, workspace: string) {
  return http.get<ArtifactCleanupReviewPage>(`${retentionCleanupPath(workspace)}/reviews`, { params: { limit: 50 } });
}
export function discardRetentionCleanupReview(http: HttpClient, workspace: string, reviewId: string, reason: string) {
  return http.post<ArtifactCleanupReview>(`${retentionCleanupPath(workspace)}/review/discard`, { body: { review_id: reviewId, reason } });
}
export function listRetentionCleanupStatus(http: HttpClient, workspace: string, state = "", before?: string, ref?: string) {
  return http.get<ArtifactLifecyclePage>(retentionCleanupStatusPath(workspace), { params: { state: state || undefined, before, ref: ref || undefined, limit: 50 } });
}
export function sweepRetentionCleanup(http: HttpClient, workspace: string, selectedRefs: string[], reviewId = "", limit = 100) {
  return http.post<ArtifactCleanupResult>(retentionCleanupPath(workspace), { body: { confirm: true, limit, selected_refs: selectedRefs, review_id: reviewId || undefined } });
}
export function addSource(http: HttpClient, workspace: string, body: AddSource) {
  return http.post<SourceSummary>(base(workspace), { body });
}
export function readSource(http: HttpClient, workspace: string, source: string) {
  return http.get<SourceDetail>(sourcePath(workspace, source));
}
export function setSourceRetention(http: HttpClient, workspace: string, source: string, body: SetSourceRetention) {
  return http.put<SourceDetail>(`${sourcePath(workspace, source)}/retention`, { body });
}
export function setSourcePrivacy(http: HttpClient, workspace: string, source: string, body: SetSourcePrivacy) {
  return http.put<SourceDetail>(`${sourcePath(workspace, source)}/privacy`, { body });
}
export function sourceRetentionReview(http: HttpClient, workspace: string, source: string) {
  return http.get<SourceRetentionReview>(`${sourcePath(workspace, source)}/retention-review`);
}
export function purgeSource(http: HttpClient, workspace: string, source: string, reason: string) {
  return http.post<PurgeSource>(`${sourcePath(workspace, source)}/purge`, { body: { confirm: true, reason } });
}
export function readCapture(http: HttpClient, workspace: string, source: string, capture: string) {
  return http.get<Capture>(`${sourcePath(workspace, source)}/captures/${encodeURIComponent(capture)}`);
}
export function addCapture(http: HttpClient, workspace: string, source: string, content: string, media_type: MediaType, content_base64?: string) {
  return http.post<CaptureSummary>(`${sourcePath(workspace, source)}/captures`, { body: { media_type, ...(content_base64 ? { content_base64 } : { content }) } });
}
export function fetchSource(http: HttpClient, workspace: string, source: string) {
  return http.post<CaptureSummary>(`${sourcePath(workspace, source)}/fetch`, { body: {} });
}
export function listCaptureExtractions(http: HttpClient, workspace: string, source: string, capture: string, before?: string) {
  return http.get<SourceExtractionPage>(`${sourcePath(workspace, source)}/captures/${encodeURIComponent(capture)}/extractions`, { params: { before, limit: 50 } });
}
export function extractCapture(http: HttpClient, workspace: string, source: string, capture: string) {
  return http.post<SourceExtraction>(`${sourcePath(workspace, source)}/captures/${encodeURIComponent(capture)}/extract`, { body: {} });
}
export function readCaptureExtraction(http: HttpClient, workspace: string, source: string, capture: string, extraction: string) {
  return http.get<SourceExtraction>(`${sourcePath(workspace, source)}/captures/${encodeURIComponent(capture)}/extractions/${encodeURIComponent(extraction)}`);
}
export function listSourceObservations(http: HttpClient, workspace: string, source: string, before?: string) {
  return http.get<Page<ManualObservation>>(`${sourcePath(workspace, source)}/observations`, { params: { before, limit: 50 } });
}
export function addSourceObservation(http: HttpClient, workspace: string, source: string, body: AddObservation) {
  return http.post<ManualObservation>(`${sourcePath(workspace, source)}/observations`, { body });
}

export function readSourceObservation(http: HttpClient, workspace: string, source: string, observation: string) {
  return http.get<ManualObservation>(`${sourcePath(workspace, source)}/observations/${encodeURIComponent(observation)}`);
}
