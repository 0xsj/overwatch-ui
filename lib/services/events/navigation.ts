import type { QuestionDraft } from "../questions/navigation";

export const eventHref = (workspace: string, event?: string) => {
  const path = `/investigation/${encodeURIComponent(workspace)}/timeline`;
  return event ? `${path}?event=${encodeURIComponent(event)}` : path;
};

export const eventRevisionHref = (workspace: string, event: string, revision: string) =>
  `/investigation/${encodeURIComponent(workspace)}/timeline/${encodeURIComponent(event)}/revisions/${encodeURIComponent(revision)}`;

export const eventRelationshipHref = (workspace: string, relationship: string) =>
  `/investigation/${encodeURIComponent(workspace)}/timeline?relationship=${encodeURIComponent(relationship)}`;

export type EventRelationshipQuestionDraftInput = {
  relationshipId: string;
  fromTitle: string;
  toTitle: string;
  kindLabel: string;
  stateLabel: string;
  rationale: string;
  supportingObservationIds?: string[];
  opposingObservationIds?: string[];
};

export const eventRelationshipQuestionDraft = (input: EventRelationshipQuestionDraftInput): QuestionDraft => ({
  prompt: `What would establish or challenge the ${input.kindLabel.toLowerCase()} relationship between “${input.fromTitle}” and “${input.toTitle}”?`,
  context: `Event relationship under review: ${input.kindLabel}. Current assessment: ${input.stateLabel}. ${input.rationale.trim() || "The relationship remains unresolved."} Look for evidence that would distinguish event sequence or association from coincidence or reporting-chain repetition.`,
  observation_ids: [...new Set([...(input.supportingObservationIds ?? []), ...(input.opposingObservationIds ?? [])])].slice(0, 8),
  origin: { kind: "event_relationship", id: input.relationshipId },
});
