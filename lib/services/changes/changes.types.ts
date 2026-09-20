import type { Kind } from "@/lib/kernel";

export type ChangeKind = "added" | "changed" | "gone";

/** A typed difference between the two latest completed runs for a target.
 *
 * This is deliberately not an observation and not an asset. It is a small
 * projection for the reader who wants to know what moved since the last
 * comparison. `previous_value` and `current_value` are both present on a
 * change, while an added or gone row has only the side that exists. */
export type Change = {
  change_id: string;
  kind: ChangeKind;
  target_id: string;
  target_name: string;
  subject_kind: Kind;
  subject_value: string;
  field: string;
  previous_value?: string;
  current_value?: string;
  summary: string;
  current_run_id: string;
  previous_run_id: string;
  changed_at: string;
};

export type ChangePage = {
  changes: Change[];
  seen_at?: string;
  comparisons?: {
    target_id: string;
    target_name: string;
    current_run_at: string;
    previous_run_at: string;
  }[];
};
