export type ReviewBoundaryKind = "proposal" | "accepted" | "authored";

export const reviewBoundaryCopy: Record<ReviewBoundaryKind, { label: string; tone: "neutral" | "accent" | "warn"; text: string }> = {
  proposal: { label: "AI proposal · review required", tone: "warn", text: "This output is a review lead, not evidence, a record, a relationship, or a conclusion." },
  accepted: { label: "Accepted assistance · still not evidence", tone: "accent", text: "Acceptance retains the reviewed assistance output. Record a cited observation separately before it becomes evidence." },
  authored: { label: "Analyst-authored step", tone: "neutral", text: "Only the statement and exact passage you explicitly save enter the investigation record; keep the citation and qualification visible." },
};
