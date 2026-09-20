import type { InvestigationQuestion } from "@/lib/services/questions";
import type { ResearchRecord } from "@/lib/services/research-records";
import type { EvidenceCluster, EvidenceRelation } from "./index";

export type RecordCoverageStatus = "no_evidence" | "needs_corroboration" | "contradiction_found" | "unresolved" | "review_incomplete" | "covered";

export type RecordCoverage = {
  record_id: string;
  observation_count: number;
  reviewed_observation_count: number;
  supporting_count: number;
  contradicting_count: number;
  repeating_count: number;
  unresolved_count: number;
  internal_reviewed_pairs: number;
  possible_internal_pairs: number;
  unreviewed_internal_pairs: number;
  status: RecordCoverageStatus;
};

export type QuestionGapStatus = "resolved" | "no_evidence" | "not_compared" | "partially_compared" | "conflicted" | "reviewed";

export type QuestionGap = {
  question_id: string;
  cited_observation_count: number;
  compared_observation_count: number;
  unresolved_relation_count: number;
  contradicting_relation_count: number;
  status: QuestionGapStatus;
  is_gap: boolean;
};

export type ClusterCoverageStatus = "no_evidence" | "needs_corroboration" | "contradiction_found" | "unresolved" | "review_incomplete" | "covered";

export type ClusterCoverage = {
  cluster_id: string;
  observation_count: number;
  reviewed_observation_count: number;
  supporting_count: number;
  contradicting_count: number;
  repeating_count: number;
  unresolved_count: number;
  internal_reviewed_pairs: number;
  possible_internal_pairs: number;
  unreviewed_internal_pairs: number;
  status: ClusterCoverageStatus;
};

/** Coverage is limited to pair decisions whose two observations are inside
 * the authored cluster. It describes review completeness, not truth. */
export function clusterCoverage(cluster: EvidenceCluster, relations: EvidenceRelation[]): ClusterCoverage {
  const observationIDs = new Set(cluster.observation_ids);
  const internal = relations.filter((relation) => observationIDs.has(relation.left_observation_id) && observationIDs.has(relation.right_observation_id));
  const reviewedIDs = new Set(internal.flatMap((relation) => [relation.left_observation_id, relation.right_observation_id]));
  const possible = cluster.observation_ids.length * Math.max(0, cluster.observation_ids.length - 1) / 2;
  const counts = {
    supporting_count: internal.filter((relation) => relation.kind === "supports").length,
    contradicting_count: internal.filter((relation) => relation.kind === "contradicts").length,
    repeating_count: internal.filter((relation) => relation.kind === "repeats").length,
    unresolved_count: internal.filter((relation) => relation.kind === "unresolved").length,
  };
  const unreviewed = Math.max(0, possible - internal.length);
  let status: ClusterCoverageStatus = "covered";
  if (!cluster.observation_ids.length) status = "no_evidence";
  else if (cluster.observation_ids.length < 2) status = "needs_corroboration";
  else if (counts.contradicting_count) status = "contradiction_found";
  else if (counts.unresolved_count) status = "unresolved";
  else if (unreviewed) status = "review_incomplete";
  return {
    cluster_id: cluster.cluster_id,
    observation_count: cluster.observation_ids.length,
    reviewed_observation_count: reviewedIDs.size,
    ...counts,
    internal_reviewed_pairs: internal.length,
    possible_internal_pairs: possible,
    unreviewed_internal_pairs: unreviewed,
    status,
  };
}

export function recordCoverage(record: ResearchRecord, relations: EvidenceRelation[]): RecordCoverage {
  const observationIDs = new Set(record.observation_ids);
  const touched = relations.filter((relation) => observationIDs.has(relation.left_observation_id) || observationIDs.has(relation.right_observation_id));
  const internal = touched.filter((relation) => observationIDs.has(relation.left_observation_id) && observationIDs.has(relation.right_observation_id));
  const reviewedIDs = new Set(touched.flatMap((relation) => [relation.left_observation_id, relation.right_observation_id].filter((id) => observationIDs.has(id))));
  const possible = record.observation_ids.length * Math.max(0, record.observation_ids.length - 1) / 2;
  const counts = {
    supporting_count: touched.filter((relation) => relation.kind === "supports").length,
    contradicting_count: touched.filter((relation) => relation.kind === "contradicts").length,
    repeating_count: touched.filter((relation) => relation.kind === "repeats").length,
    unresolved_count: touched.filter((relation) => relation.kind === "unresolved").length,
  };
  const unreviewed = Math.max(0, possible - internal.length);
  let status: RecordCoverageStatus = "covered";
  if (!record.observation_ids.length) status = "no_evidence";
  else if (counts.contradicting_count) status = "contradiction_found";
  else if (record.observation_ids.length < 2) status = "needs_corroboration";
  else if (counts.unresolved_count) status = "unresolved";
  else if (unreviewed) status = "review_incomplete";
  return {
    record_id: record.record_id,
    observation_count: record.observation_ids.length,
    reviewed_observation_count: reviewedIDs.size,
    ...counts,
    internal_reviewed_pairs: internal.length,
    possible_internal_pairs: possible,
    unreviewed_internal_pairs: unreviewed,
    status,
  };
}

export function questionGap(question: InvestigationQuestion, relations: EvidenceRelation[]): QuestionGap {
  const observationIDs = new Set(question.observation_ids);
  const relevant = relations.filter((relation) => observationIDs.has(relation.left_observation_id) || observationIDs.has(relation.right_observation_id));
  const compared = new Set(relevant.flatMap((relation) => [relation.left_observation_id, relation.right_observation_id].filter((id) => observationIDs.has(id))));
  const unresolved = relevant.filter((relation) => relation.kind === "unresolved").length;
  const contradicting = relevant.filter((relation) => relation.kind === "contradicts").length;
  let status: QuestionGapStatus = "resolved";
  if (question.state === "open") {
    if (!question.observation_ids.length) status = "no_evidence";
    else if (!compared.size) status = "not_compared";
    else if (contradicting) status = "conflicted";
    else if (compared.size < observationIDs.size || unresolved) status = "partially_compared";
    else status = "reviewed";
  }
  return {
    question_id: question.question_id,
    cited_observation_count: observationIDs.size,
    compared_observation_count: compared.size,
    unresolved_relation_count: unresolved,
    contradicting_relation_count: contradicting,
    status,
    is_gap: status === "no_evidence" || status === "not_compared" || status === "partially_compared" || status === "conflicted",
  };
}
