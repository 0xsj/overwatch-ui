import type { FeedKind } from "@/lib/kernel";

/** How much noise a tool makes, and it replaces the fixture's `loud: boolean`.
 *
 *  Three, not two, because `light` is a real position: httpx at recon volume is
 *  what a crawler does, and calling it loud would put ordinary HTTP behind the
 *  same gate as template-driven probing. The run gate reads intensity off the
 *  chain, so a check's loudness is never stored twice. */
export type Intensity = "passive" | "light" | "loud";

export type Tool = {
  tool_id: string;
  org_id: string;
  name: string;
  argv: string;
  intensity: Intensity;
  /** ABSENT on a SOURCE tool — one seeded from the target's scope rather than
   *  fed by another. Absent means "nothing upstream", never "any kind", and the
   *  client must not send `"*"`. */
  consumes?: FeedKind;
  produces?: FeedKind;
  /** Which exit codes mean the tool ANSWERED — `decisions/0033`. Absent means
   *  `[0]`; nuclei wants `[0, 1]`, because it exits 1 when it finds nothing,
   *  and treating that as a failure would turn "no vulnerabilities" into an
   *  error.
   *
   *  **Optional because rows written before 2026-09-07 answer `null`.** The
   *  projection dropped the field for a while — `asTool` built the response
   *  without it, so every tool read back as `null` whatever was stored. That is
   *  fixed and both the create response and the list carry it now; the
   *  optionality remains because the old rows do.
   *
   *  Read it through `successCodes` rather than directly, so a screen cannot
   *  render "exit 0 only" for a tool the server would accept `1` from — one
   *  helper rather than two inlined `?? [0]`, so the day the guess stops being
   *  a guess there is one place that changes. This is the first backend bug a
   *  client note found. */
  success_exit_codes?: number[] | null;
  archived: boolean;
  created_at: string;
};

export type ToolInput = {
  name: string;
  argv: string;
  intensity: Intensity;
  /** Send the field absent, not `""`, for a source tool. */
  consumes?: FeedKind;
  produces?: FeedKind;
  success_exit_codes?: number[];
};

/** A mapping is tool output -> a field, versioned and promotable — §Scope. */
export type Mapping = {
  mapping_id: string;
  tool_id: string;
  field: string;
  /** A dotted path and deliberately not an expression language. */
  expression: string;
  version: number;
  /** THREE states and not a `promoted` boolean.
   *
   *      draft     written, and nothing extracts with it yet
   *      live      the one this tool's output is read through
   *      retired   superseded, and still cited by every observation it made
   *
   *  `retired` is why the boolean was wrong: it is not "not promoted". A
   *  mapping is never edited — an observation cites the version that produced
   *  it, so an expression moving under a citation would make that lineage a
   *  lie — which means correcting one is adding a version, and the old version
   *  stays reachable forever. `listMappings` returns every version, retired
   *  ones included, because they are the history the citations point at. */
  state: MappingState;
  /** What this mapping is FOR — `decisions/0040`. **Always present, including
   *  `attribute`**: omitting a default makes a client guess, and the guess is
   *  right only until the default moves. */
  role: MappingRole;
  created_at: string;
};

export type MappingState = "draft" | "live" | "retired";

/** Five roles, and each does something different to what is written.
 *
 *      subject       what every other reading in this record is ABOUT
 *      attribute     a value about that subject — THE DEFAULT
 *      derived_from  the value this record was READ OUT OF. Draws a derivation
 *      signature     what the TOOL calls this class of problem — `0041`
 *      severity      how bad the tool says it is
 *
 *  It replaced matching on the field's spelling, which is the same class of
 *  error as naming a field from the source's own key: a guess dressed as a
 *  reading.
 *
 *  **A tool that produces `finding` needs a LIVE `signature` mapping or it
 *  extracts nothing.** Signature is half a finding's identity — it is what
 *  makes a rescan a sighting rather than a new row — so without one every
 *  match on a URL collapses into a single finding whose identity is a lie. A
 *  scanner configured without it produces zero findings and looks like a clean
 *  scan, which is the worst way for this to fail. */
export type MappingRole =
  | "subject" | "attribute" | "derived_from" | "signature" | "severity";

/** `promote: true` writes it live in one call. `correction` gets no endpoint of
 *  its own — §Scope calls it *"a person fixing a mapping"*, and that is this
 *  request with an author, not a second noun. */
/** `role` absent means `attribute`. An UNKNOWN one is a 400 rather than a silent
 *  downgrade — a `derived_from` spelled wrong would otherwise become a mapping
 *  that reads a value and quietly draws nothing. */
export type MappingInput = {
  field: string;
  expression: string;
  role?: MappingRole;
  promote: boolean;
};

/** What the tool actually treats as success.
 *
 *  Absent means `[0]` — the server's own default, applied here because the
 *  projection drops the field. Never inline `tool.success_exit_codes ?? [0]` at
 *  a call site: two call sites is two defaults, and the day the projection is
 *  fixed only one of them stops being a guess. */
export function successCodes(tool: Pick<Tool, "success_exit_codes">): number[] {
  const codes = tool.success_exit_codes;
  return codes && codes.length > 0 ? codes : [0];
}
