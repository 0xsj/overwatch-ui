import type { EventRelationship, TimelineEvent } from "./index";

export type TemporalOrder = "before" | "after" | "same_order_hint" | "indeterminate";

export type TemporalComparison = {
  left: TimelineEvent;
  right: TimelineEvent;
  order: TemporalOrder;
  orderBasis: "ordering_date" | "explicit_relationship" | "none";
  relationship?: EventRelationship;
  relationshipDirection?: "direct" | "reverse";
};

export function sequenceEvents(events: TimelineEvent[]) {
  return events.slice().sort((left, right) => {
    if (left.sort_date && right.sort_date) return left.sort_date.localeCompare(right.sort_date) || left.created_at.localeCompare(right.created_at) || left.event_id.localeCompare(right.event_id);
    if (left.sort_date) return -1;
    if (right.sort_date) return 1;
    return left.created_at.localeCompare(right.created_at) || left.event_id.localeCompare(right.event_id);
  });
}

export function compareEvents(left: TimelineEvent, right: TimelineEvent, relationships: EventRelationship[]): TemporalComparison {
  const direct = relationships.find((one) => one.from_event_id === left.event_id && one.to_event_id === right.event_id);
  const reverse = relationships.find((one) => one.from_event_id === right.event_id && one.to_event_id === left.event_id);
  const relationship = direct ?? reverse;
  if (left.sort_date && right.sort_date && left.sort_date !== right.sort_date) {
    return { left, right, order: left.sort_date < right.sort_date ? "before" : "after", orderBasis: "ordering_date", ...(relationship ? { relationship, relationshipDirection: direct ? "direct" : "reverse" } : {}) };
  }
  if (relationship?.kind === "precedes") {
    const directOrder = direct ? "before" : "after";
    return { left, right, order: directOrder, orderBasis: "explicit_relationship", relationship, relationshipDirection: direct ? "direct" : "reverse" };
  }
  if (left.sort_date && right.sort_date && left.sort_date === right.sort_date) {
    return { left, right, order: "same_order_hint", orderBasis: "ordering_date", ...(relationship ? { relationship, relationshipDirection: direct ? "direct" : "reverse" } : {}) };
  }
  return { left, right, order: "indeterminate", orderBasis: relationship ? "explicit_relationship" : "none", ...(relationship ? { relationship, relationshipDirection: direct ? "direct" : "reverse" } : {}) };
}
