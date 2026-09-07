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
   *  **Optional because the server currently never sends it** — walked
   *  2026-09-07: `root/tools.go`'s `asTool` builds the response without the
   *  field, so it arrives `null` on every tool including one stored with
   *  `[0, 1]`. The stored value is right and only the projection drops it. Read
   *  it through `successCodes` rather than directly, so a screen cannot render
   *  "exit 0 only" for a tool the server would accept `1` from. */
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
  created_at: string;
};

export type MappingState = "draft" | "live" | "retired";

/** `promote: true` writes it live in one call. `correction` gets no endpoint of
 *  its own — §Scope calls it *"a person fixing a mapping"*, and that is this
 *  request with an author, not a second noun. */
export type MappingInput = { field: string; expression: string; promote: boolean };

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
