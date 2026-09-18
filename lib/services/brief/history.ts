import type { BriefSnapshotConnection, BriefSnapshotQuestion } from "./index";

export function snapshotConnectionChanges(previous: BriefSnapshotConnection | undefined, current: BriefSnapshotConnection) {
  if (!previous) return ["Added"];
  const changes: string[] = [];
  if (previous.from_record_id !== current.from_record_id || previous.to_record_id !== current.to_record_id) changes.push("endpoints");
  if (previous.from_record_kind !== current.from_record_kind || previous.from_record_name !== current.from_record_name) changes.push("from record label");
  if (previous.to_record_kind !== current.to_record_kind || previous.to_record_name !== current.to_record_name) changes.push("to record label");
  if (previous.from_record_description !== current.from_record_description) changes.push("from record description");
  if (previous.to_record_description !== current.to_record_description) changes.push("to record description");
  if (!sameIDs(previous.from_record_observation_ids, current.from_record_observation_ids)) changes.push("from record citations");
  if (!sameIDs(previous.to_record_observation_ids, current.to_record_observation_ids)) changes.push("to record citations");
  if (previous.kind !== current.kind) changes.push(`relationship: ${previous.kind} → ${current.kind}`);
  if (previous.state !== current.state) changes.push(`state: ${previous.state} → ${current.state}`);
  if (previous.rationale !== current.rationale) changes.push("rationale");
  if (!sameIDs(previous.supporting_observation_ids, current.supporting_observation_ids)) changes.push("supporting citations");
  if (!sameIDs(previous.opposing_observation_ids, current.opposing_observation_ids)) changes.push("opposing citations");
  return changes.length ? changes : ["metadata only"];
}

export function snapshotConnectionEvidenceChanges(previous: BriefSnapshotConnection | undefined, current: BriefSnapshotConnection) {
  return {
    supportingAdded: difference(current.supporting_observation_ids, previous?.supporting_observation_ids ?? []),
    supportingRemoved: difference(previous?.supporting_observation_ids ?? [], current.supporting_observation_ids),
    opposingAdded: difference(current.opposing_observation_ids, previous?.opposing_observation_ids ?? []),
    opposingRemoved: difference(previous?.opposing_observation_ids ?? [], current.opposing_observation_ids),
  };
}

export function snapshotConnectionRecordObservationChanges(previous: BriefSnapshotConnection | undefined, current: BriefSnapshotConnection) {
  return {
    fromAdded: difference(current.from_record_observation_ids, previous?.from_record_observation_ids ?? []),
    fromRemoved: difference(previous?.from_record_observation_ids ?? [], current.from_record_observation_ids),
    toAdded: difference(current.to_record_observation_ids, previous?.to_record_observation_ids ?? []),
    toRemoved: difference(previous?.to_record_observation_ids ?? [], current.to_record_observation_ids),
  };
}

export function snapshotQuestionObservationChanges(previous: BriefSnapshotQuestion | undefined, current: BriefSnapshotQuestion) {
  return {
    added: difference(current.observation_ids, previous?.observation_ids ?? []),
    removed: difference(previous?.observation_ids ?? [], current.observation_ids),
  };
}

function sameIDs(left: string[], right: string[]) {
  return left.length === right.length && left.every((id) => right.includes(id));
}

function difference(left: string[], right: string[]) {
  return left.filter((id) => !right.includes(id));
}
