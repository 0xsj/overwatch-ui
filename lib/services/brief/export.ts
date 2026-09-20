import type { Evidence } from "@/lib/services/review";
import type { BriefHandoffExport, BriefRecipientHandoff, BriefSnapshot } from "./index";

export function snapshotEvidenceIds(snapshot: BriefSnapshot) {
  return [...new Set([
    ...snapshot.observation_ids,
    ...(snapshot.clusters ?? []).flatMap((cluster) => cluster.observation_ids),
    ...snapshot.questions.flatMap((question) => question.observation_ids),
    ...snapshot.connections.flatMap((connection) => [
      ...connection.supporting_observation_ids,
      ...connection.opposing_observation_ids,
      ...connection.from_record_observation_ids,
      ...connection.to_record_observation_ids,
    ]),
    ...snapshot.events.flatMap((event) => [
      ...event.observation_ids,
      ...event.participant_records.flatMap((record) => record.observation_ids),
      ...(event.location_record?.observation_ids ?? []),
      ...(event.location_record?.place_geometry?.observation_ids ?? []),
    ]),
    ...(snapshot.event_relationships ?? []).flatMap((relationship) => [
      ...relationship.supporting_observation_ids,
      ...relationship.opposing_observation_ids,
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
  const clusters = (snapshot.clusters ?? []).map((cluster) => {
    const citations = cluster.observation_ids.length ? `\n  - grouped observations:\n${citationList(cluster.observation_ids, evidence, "    ")}` : "";
    return `- **${cluster.kind}** ${cluster.title}\n  - cluster: \`${cluster.cluster_id}\`${cluster.description ? `\n  - qualification: ${cluster.description}` : ""}${citations}`;
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
  const events = snapshot.events.map((event) => {
    const citations = event.observation_ids.length ? `\n  - event observations:\n${citationList(event.observation_ids, evidence, "    ")}` : "";
    const participants = event.participant_records.length ? `\n  - participants: ${event.participant_records.map((record) => `${record.name} (${record.kind})`).join(", ")}` : "";
    const participantCitations = event.participant_records.flatMap((record) => record.observation_ids).length ? `\n  - participant record observations:\n${citationList(event.participant_records.flatMap((record) => record.observation_ids), evidence, "    ")}` : "";
    const geometry = event.location_record?.place_geometry ? `\n  - map context: ${event.location_record.place_geometry.latitude}, ${event.location_record.place_geometry.longitude} (${event.location_record.place_geometry.precision})` : "";
    const location = event.location_record ? `\n  - place record: ${event.location_record.name} (${event.location_record.kind})${geometry}` : "";
    const locationCitations = event.location_record?.observation_ids.length ? `\n  - place record observations:\n${citationList(event.location_record.observation_ids, evidence, "    ")}` : "";
    const geometryCitations = event.location_record?.place_geometry?.observation_ids.length ? `\n  - map context observations:\n${citationList(event.location_record.place_geometry.observation_ids, evidence, "    ")}` : "";
    const revision = event.event_revision_id ? `\n  - event revision: \`${event.event_revision_id}\`${event.event_revision ? ` (revision ${event.event_revision})` : ""}` : "\n  - event revision: not pinned in this handoff";
    return `- **${event.title}** (${event.time_precision}${event.reported_time ? ` · ${event.reported_time}` : ""})\n  - event: \`${event.event_id}\`${revision}${event.location ? `\n  - location: ${event.location}` : ""}${participants}${location}${event.description ? `\n  - description: ${event.description}` : ""}${citations}${participantCitations}${locationCitations}${geometryCitations}`;
  });
  const eventRelationships = (snapshot.event_relationships ?? []).map((relationship) => {
    const supporting = relationship.supporting_observation_ids.length ? `\n  - supporting observations:\n${citationList(relationship.supporting_observation_ids, evidence, "    ")}` : "";
    const opposing = relationship.opposing_observation_ids.length ? `\n  - opposing observations:\n${citationList(relationship.opposing_observation_ids, evidence, "    ")}` : "";
    const review = relationship.review_note ? `\n  - review note: ${relationship.review_note}` : "";
    return `- **${relationship.state}** ${relationship.from_event_id} → ${relationship.to_event_id} (${relationship.kind})\n  - relationship: \`${relationship.relationship_id}\`\n  - rationale: ${relationship.rationale}${review}${supporting}${opposing}`;
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
    "## Evidence clusters at freeze",
    "",
    clusters.length ? clusters.join("\n") : "No evidence clusters linked.",
    "",
    "## Events at freeze",
    "",
    events.length ? events.join("\n") : "No events linked.",
    "",
    "## Event relationships at freeze",
    "",
    eventRelationships.length ? eventRelationships.join("\n") : "No event relationships linked.",
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

export function downloadBriefRecipientHandoffMarkdown(exported: BriefHandoffExport) {
  const blob = new Blob([exported.content], { type: `${exported.content_type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = exported.filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** The fixture adapter uses the same renderer contract as the browser export
 * path, while the live API renders its equivalent from the frozen domain
 * snapshot without hydrating source evidence. */
export function renderBriefRecipientHandoffMarkdown(handoff: BriefRecipientHandoff) {
  const block = (value?: string) => value?.trim() || "Not recorded.";
  const list = <T>(rows: T[], empty: string, render: (row: T) => string) => rows.length ? rows.map(render).join("\n") : empty;
  return [
    `# ${handoff.title}`,
    "",
    "Recipient-safe frozen handoff",
    "",
    `Frozen at: ${handoff.frozen_at}`,
    `Source brief updated: ${handoff.source_updated_at}`,
    "",
    "> This export preserves the authored handoff while omitting citations, source and capture details, internal identifiers, and reviewer conversation.",
    "",
    "## Investigation question",
    "",
    block(handoff.question),
    "",
    "## Current account",
    "",
    block(handoff.current_account),
    "",
    "## Alternatives",
    "",
    block(handoff.alternatives),
    "",
    "## Limitations",
    "",
    block(handoff.limitations),
    "",
    "## Next steps",
    "",
    block(handoff.next_steps),
    "",
    "## Evidence clusters at freeze",
    "",
    list(handoff.clusters, "No evidence clusters were included.", (cluster) => `- **${cluster.kind}** ${cluster.title}${cluster.description ? ` — ${cluster.description}` : ""}`),
    "",
    "## Questions at freeze",
    "",
    list(handoff.questions, "No questions were included.", (question) => `- **${question.state}** ${question.question}${question.resolution ? ` — ${question.resolution}` : ""}`),
    "",
    "## Connections at freeze",
    "",
    list(handoff.connections, "No connections were included.", (connection) => `- **${connection.state}** ${connection.from_name} → ${connection.to_name} (${connection.kind}) — ${connection.rationale}`),
    "",
    "## Events at freeze",
    "",
    list(handoff.events, "No events were included.", (event) => `- **${event.title}** (${event.time_precision}${event.reported_time ? ` — ${event.reported_time}` : ""})${event.description ? `\n  ${event.description}` : ""}`),
    "",
    "## Event relationships at freeze",
    "",
    list(handoff.event_relationships ?? [], "No event relationships were included.", (relationship) => `- **${relationship.state}** ${relationship.from_title} → ${relationship.to_title} (${relationship.kind}) — ${relationship.rationale}`),
    "",
  ].join("\n");
}
