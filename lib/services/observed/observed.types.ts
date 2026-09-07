import type { Kind } from "@/lib/kernel";

/** What ONE SOURCE SAID, with lineage back to the bytes — §Scope's load-bearing
 *  word. Never a `fact`. */
export type Observation = {
  observation_id: string;
  subject_kind: Kind;
  subject_value: string;
  field: string;
  value: string;
  invocation_id: string;
  artifact_id: string;
  mapping_id: string;
  mapping_version: number;
  /** BOTH times, always. `observed_at` is when the TOOL ran; `recorded_at` is
   *  when this row was written. A re-extraction moves the second and never the
   *  first, and a client showing only one cannot tell them apart. */
  observed_at: string;
  recorded_at: string;
};

/** Stands in for the asset list and is deliberately NOT one. An asset is a
 *  fragment in a role carrying an accepted attribution — `0009` — and this is
 *  just "things observations are about". */
export type Subject = {
  subject_kind: Kind;
  subject_value: string;
  observations: number;
  fields: number;
  last_seen: string;
};

/** PRODUCT.md's central claim as a response: *"every value walks backwards to
 *  the parser version, the raw bytes, the exact command, and the scope rule that
 *  allowed the command to run."*
 *
 *  Four steps, and **each is independently absent**. An invocation nothing
 *  refused has no rule to cite, and rendering that as an error would make the
 *  commonest case look broken. */
export type Lineage = {
  observation: Observation;
  mapping?: {
    mapping_id: string;
    field: string;
    expression: string;
    version: number;
    state: string;
  };
  artifact?: {
    artifact_id: string;
    stream: string;
    hash: string;
    bytes: number;
    truncated: boolean;
  };
  invocation?: {
    invocation_id: string;
    run_id: string;
    tool_id: string;
    argv: string[];
    binary?: string;
    state: string;
    exit?: number;
    started_at?: string;
  };
  rule?: {
    rule_id: string;
    pattern: string;
    polarity: string;
    gate: string;
    /** TRUE and the rule is still returned. `0030` keeps a rule forever
     *  precisely so a citation made at the time still resolves — dropping it
     *  would BE the citation dangling. */
    superseded: boolean;
  };
};

/** The Extraction Quality panel. The three numbers travel TOGETHER, because a
 *  ratio without its denominator is what `0011` refuses.
 *
 *  `fields_seen = mapped + left_alone`, all counted in PATHS so the identity
 *  holds. `observations` is the separate question — one flattened path can
 *  become many observations, so it is not a fourth term of the same sum. */
export type Extraction = {
  fields_seen: number;
  mapped: number;
  left_alone: number;
  observations: number;
  fields: number;
  /** A field nobody mapped is RECORDED rather than guessed — `decisions/0035`.
   *  This is the list that makes the mapping editor's next job obvious. */
  left_alone_paths: { path: string; seen: number; sample?: string }[];
};
