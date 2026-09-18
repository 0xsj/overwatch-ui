import type { ResearchConnectionKind } from "./index";

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
