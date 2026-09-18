import type { Evidence } from "@/lib/services/review";
import type { BriefSnapshot } from "./index";

export function snapshotEvidenceIds(snapshot: BriefSnapshot) {
  return [...new Set([
    ...snapshot.observation_ids,
    ...snapshot.questions.flatMap((question) => question.observation_ids),
    ...snapshot.connections.flatMap((connection) => [
      ...connection.supporting_observation_ids,
      ...connection.opposing_observation_ids,
      ...connection.from_record_observation_ids,
      ...connection.to_record_observation_ids,
    ]),
  ])];
}

function block(value: string | undefined) {
  return value?.trim() || "Not recorded.";
}

function quote(value: string) {
  return value.split("\n").map((line) => `> ${line}`).join("\n");
}

function citationList(ids: string[], evidence: Evidence[], indent: string) {
  return ids.map((id) => {
    const found = evidence.find((one) => one.observation_id === id);
    if (!found) return `${indent}- Observation \`${id}\` (citation details were not loaded)`;
    const quoted = quote(found.quote).split("\n").map((line) => `${indent}  ${line}`).join("\n");
    return `${indent}- **${found.source_title}** — ${found.statement}\n${indent}  - observation: \`${id}\`\n${indent}  - capture: \`${found.capture_id}\`\n${quoted}`;
  }).join("\n");
}

/** Renders only the frozen snapshot. It never reads the live working brief or
 * current question records, so the downloaded handoff cannot drift after the
 * researcher freezes it. */
export function renderBriefSnapshotMarkdown(snapshot: BriefSnapshot, evidence: Evidence[]) {
  const cited = snapshot.observation_ids.map((id) => {
    const found = evidence.find((one) => one.observation_id === id);
    if (!found) return `- Observation \`${id}\` (citation details were not loaded)`;
    return `- **${found.source_title}** — ${found.statement}\n  - observation: \`${id}\`\n  - capture: \`${found.capture_id}\`\n  ${quote(found.quote)}`;
  });
  const questions = snapshot.questions.map((question) => {
    const resolution = question.resolution ? ` — ${question.resolution}` : "";
    const citations = question.observation_ids.length ? `\n  - observations:\n${citationList(question.observation_ids, evidence, "    ")}` : "";
    return `- **${question.state}** ${question.question}${resolution}\n  - question: \`${question.question_id}\`${citations}`;
  });
  const connections = snapshot.connections.map((connection) => {
    const supporting = connection.supporting_observation_ids.length ? `\n  - supporting observations:\n${citationList(connection.supporting_observation_ids, evidence, "    ")}` : "";
    const opposing = connection.opposing_observation_ids.length ? `\n  - opposing observations:\n${citationList(connection.opposing_observation_ids, evidence, "    ")}` : "";
    const fromDescription = connection.from_record_description ? `\n  - from record description: ${connection.from_record_description}` : "";
    const fromObservations = connection.from_record_observation_ids.length ? `\n  - from record observations:\n${citationList(connection.from_record_observation_ids, evidence, "    ")}` : "";
    const toDescription = connection.to_record_description ? `\n  - to record description: ${connection.to_record_description}` : "";
    const toObservations = connection.to_record_observation_ids.length ? `\n  - to record observations:\n${citationList(connection.to_record_observation_ids, evidence, "    ")}` : "";
    return `- **${connection.state}** ${connection.from_record_name} → ${connection.to_record_name} (${connection.kind})\n  - connection: \`${connection.connection_id}\`\n  - from record: \`${connection.from_record_id}\` (${connection.from_record_kind})${fromDescription}${fromObservations}\n  - to record: \`${connection.to_record_id}\` (${connection.to_record_kind})${toDescription}${toObservations}\n  - rationale: ${connection.rationale}${supporting}${opposing}`;
  });
  return [
    `# ${snapshot.title}`,
    "",
    `Frozen handoff: ${snapshot.frozen_at}`,
    `Frozen by: ${snapshot.frozen_by}`,
    `Source brief updated: ${snapshot.source_updated_at}`,
    `Snapshot: ${snapshot.snapshot_id}`,
    "",
    "> This is a researcher-authored handoff snapshot. It is not an automatically generated conclusion.",
    "",
    "## Investigation question",
    "",
    block(snapshot.question),
    "",
    "## Current account",
    "",
    block(snapshot.current_account),
    "",
    "## Alternatives",
    "",
    block(snapshot.alternatives),
    "",
    "## Limitations",
    "",
    block(snapshot.limitations),
    "",
    "## Next steps",
    "",
    block(snapshot.next_steps),
    "",
    "## Cited observations",
    "",
    cited.length ? cited.join("\n") : "No observations cited.",
    "",
    "## Connections at freeze",
    "",
    connections.length ? connections.join("\n") : "No connections linked.",
    "",
    "## Questions at freeze",
    "",
    questions.length ? questions.join("\n") : "No questions linked.",
    "",
  ].join("\n");
}

export function downloadBriefSnapshotMarkdown(snapshot: BriefSnapshot, evidence: Evidence[]) {
  const body = renderBriefSnapshotMarkdown(snapshot, evidence);
  const blob = new Blob([body], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${snapshot.title.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "brief-snapshot"}-${snapshot.snapshot_id.slice(0, 8)}.md`;
  link.click();
  URL.revokeObjectURL(url);
}
