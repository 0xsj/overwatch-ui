import type { ResearchConnectionRevision } from "./index";

export function connectionRevisionEvidenceIds(revision: ResearchConnectionRevision) {
  return [...new Set([...revision.supporting_observation_ids, ...revision.opposing_observation_ids])];
}

export function connectionRevisionContextObservationIds(revision: ResearchConnectionRevision) {
  return [...new Set([...revision.from_record_observation_ids, ...revision.to_record_observation_ids])];
}

export function connectionRevisionObservationIds(revision: ResearchConnectionRevision) {
  return [...new Set([...connectionRevisionEvidenceIds(revision), ...connectionRevisionContextObservationIds(revision)])];
}

export function connectionRevisionChanges(previous: ResearchConnectionRevision | undefined, current: ResearchConnectionRevision) {
  if (!previous) return ["Initial assessment"];
  const changes: string[] = [];
  if (previous.from_record_id !== current.from_record_id || previous.to_record_id !== current.to_record_id) changes.push("endpoints");
  if (previous.from_record_description !== current.from_record_description || previous.to_record_description !== current.to_record_description || !sameIDs(previous.from_record_observation_ids, current.from_record_observation_ids) || !sameIDs(previous.to_record_observation_ids, current.to_record_observation_ids)) changes.push("record context");
  if (previous.kind !== current.kind) changes.push(`relationship: ${previous.kind} → ${current.kind}`);
  if (previous.state !== current.state) changes.push(`state: ${previous.state} → ${current.state}`);
  if (previous.rationale !== current.rationale) changes.push("rationale");
  if (!sameIDs(previous.supporting_observation_ids, current.supporting_observation_ids)) changes.push("supporting citations");
  if (!sameIDs(previous.opposing_observation_ids, current.opposing_observation_ids)) changes.push("opposing citations");
  return changes.length ? changes : ["metadata only"];
}

export function connectionRevisionEvidenceChanges(previous: ResearchConnectionRevision | undefined, current: ResearchConnectionRevision) {
  return {
    supportingAdded: difference(current.supporting_observation_ids, previous?.supporting_observation_ids ?? []),
    supportingRemoved: difference(previous?.supporting_observation_ids ?? [], current.supporting_observation_ids),
    opposingAdded: difference(current.opposing_observation_ids, previous?.opposing_observation_ids ?? []),
    opposingRemoved: difference(previous?.opposing_observation_ids ?? [], current.opposing_observation_ids),
  };
}

function sameIDs(left: string[], right: string[]) {
  return left.length === right.length && left.every((id) => right.includes(id));
}

function difference(left: string[], right: string[]) {
  return left.filter((id) => !right.includes(id));
}
