import type { ResearchConnectionKind } from "./index";
import type { QuestionDraft } from "../questions/navigation";

export type ConnectionPrefill = {
  fromRecordId: string;
  toRecordId: string;
  kind: ResearchConnectionKind;
  rationale: string;
  supportingObservationIds?: string[];
  returnTo?: string;
};

export const connectionHref = (workspace: string, prefill: ConnectionPrefill) => {
  const params = new URLSearchParams({
    from_record: prefill.fromRecordId,
    to_record: prefill.toRecordId,
    kind: prefill.kind,
    state: "proposed",
    rationale: prefill.rationale,
  });
  for (const id of prefill.supportingObservationIds ?? []) params.append("supporting_observation", id);
  if (prefill.returnTo) params.set("return", prefill.returnTo);
  return `/investigation/${encodeURIComponent(workspace)}/connections?${params}`;
};

export type ConnectionQuestionDraftInput = {
  connectionId: string;
  fromName: string;
  toName: string;
  kindLabel: string;
  stateLabel: string;
  rationale: string;
  supportingObservationIds?: string[];
  opposingObservationIds?: string[];
};

export const connectionQuestionDraft = (input: ConnectionQuestionDraftInput): QuestionDraft => {
  const relationship = `${input.kindLabel.toLowerCase()} relationship between “${input.fromName}” and “${input.toName}”`;
  const rationale = input.rationale.trim() || "The relationship remains unresolved.";
  return {
    prompt: `What would establish or challenge the ${relationship}?`,
    context: `Relationship under review: ${input.kindLabel}. Current assessment: ${input.stateLabel}. ${rationale} Look for evidence that would distinguish support from contradiction rather than treating the relationship as established.`,
    observation_ids: [...new Set([...(input.supportingObservationIds ?? []), ...(input.opposingObservationIds ?? [])])].slice(0, 8),
    origin: { kind: "connection", id: input.connectionId },
  };
};
