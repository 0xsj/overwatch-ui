import type { ResearchRecordKind } from "./index";
import type { ResearchConnectionKind } from "../research-connections";

export type RecordCandidatePrefill = { kind: ResearchRecordKind; name: string; description?: string };
export type RelationshipPrefill = { kind: ResearchConnectionKind; related: RecordCandidatePrefill; description?: string };

export const recordHref = (workspace: string, observation?: string | string[], candidate?: RecordCandidatePrefill, relationship?: RelationshipPrefill, returnTo?: string) => {
  const params = new URLSearchParams();
  for (const id of Array.isArray(observation) ? observation : observation ? [observation] : []) params.append("observation", id);
  if (candidate) {
    params.set("candidate_kind", candidate.kind);
    params.set("candidate_name", candidate.name);
    if (candidate.description) params.set("candidate_description", candidate.description);
  }
  if (relationship) {
    params.set("relationship_kind", relationship.kind);
    params.set("related_kind", relationship.related.kind);
    params.set("related_name", relationship.related.name);
    if (relationship.related.description) params.set("related_description", relationship.related.description);
    if (relationship.description) params.set("relationship_description", relationship.description);
  }
  if (returnTo) params.set("return", returnTo);
  const path = `/investigation/${encodeURIComponent(workspace)}/records`;
  return `${path}${params.size ? `?${params}` : ""}`;
};
