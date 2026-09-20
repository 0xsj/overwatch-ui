/** Every cache key in one file, built by a function rather than typed at a call
 *  site.
 *
 *  A key is what makes two components share a fetch and what makes a write
 *  invalidate the right reads. Spelled by hand at each call site, two spellings
 *  of the same key are two caches that disagree, and the symptom is a screen
 *  that will not update after a mutation — which reads as a stale server rather
 *  than as a typo.
 *
 *  The shape is hierarchical on purpose: invalidating `runs.all(ws)` reaches
 *  every run query in that engagement, including `runs.one(ws, id)`, because
 *  React Query matches keys by prefix. */
export const keys = {
  sources: {
    all: (workspace: string) => ["sources", workspace] as const,
    list: (workspace: string, query?: string) => query ? ["sources", workspace, "list", query.trim()] as const : ["sources", workspace, "list"] as const,
    intake: (workspace: string, status = "") => ["sources", workspace, "intake", status] as const,
    search: (workspace: string, query: string) => ["sources", workspace, "search", query.trim()] as const,
    retentionQueue: (workspace: string, state: string) => ["sources", workspace, "retention-queue", state] as const,
    retentionCleanup: (workspace: string) => ["sources", workspace, "retention-cleanup"] as const,
    retentionCleanupReview: (workspace: string) => ["sources", workspace, "retention-cleanup-review"] as const,
    retentionCleanupHistory: (workspace: string) => ["sources", workspace, "retention-cleanup-history"] as const,
    retentionCleanupStatus: (workspace: string, state = "", ref = "") => ["sources", workspace, "retention-cleanup-status", state, ref] as const,
    one: (workspace: string, source: string) => ["sources", workspace, "one", source] as const,
    watch: (workspace: string, source: string) => ["sources", workspace, "watch", source] as const,
    alerts: (workspace: string) => ["sources", workspace, "alerts"] as const,
    retentionReview: (workspace: string, source: string) => ["sources", workspace, "retention-review", source] as const,
    capture: (workspace: string, source: string, capture: string) => ["sources", workspace, "capture", source, capture] as const,
    captureCompare: (workspace: string, source: string, earlier: string, later: string) => ["sources", workspace, "capture-compare", source, earlier, later] as const,
    extractions: (workspace: string, source: string, capture: string) => ["sources", workspace, "extractions", source, capture] as const,
    extraction: (workspace: string, source: string, capture: string, extraction: string) => ["sources", workspace, "extraction", source, capture, extraction] as const,
    observation: (workspace: string, source: string, observation: string) => ["sources", workspace, "observation", source, observation] as const,
    observations: (workspace: string, source: string) => ["sources", workspace, "observations", source] as const,
    observationShares: (workspace: string, source: string, observation: string) => ["sources", workspace, "observation-shares", source, observation] as const,
    sharedCitation: (workspace: string, token: string) => ["sources", workspace, "shared-citation", token] as const,
  },
  notes: {
    all: (workspace: string) => ["notes", workspace] as const,
    list: (workspace: string) => ["notes", workspace, "list"] as const,
    page: (workspace: string, query = "", contextKind = "") => contextKind ? ["notes", workspace, "page", query.trim(), contextKind] as const : ["notes", workspace, "page", query.trim()] as const,
    one: (workspace: string, note: string) => ["notes", workspace, "one", note] as const,
  },
  evidence: {
    all: (workspace: string) => ["evidence", workspace] as const,
    list: (workspace: string) => ["evidence", workspace, "list"] as const,
    board: (workspace: string, query = "", source = "", state = "", record = "", event = "", dateFrom = "", dateTo = "", unresolved = false) => ["evidence", workspace, "board", query.trim(), source, state, record, event, dateFrom, dateTo, unresolved] as const,
    relations: (workspace: string) => ["evidence", workspace, "relations"] as const,
    sourceLinks: (workspace: string) => ["evidence", workspace, "source-links"] as const,
    clusters: (workspace: string) => ["evidence", workspace, "clusters"] as const,
    clusterCoverage: (workspace: string) => ["evidence", workspace, "cluster-coverage"] as const,
    clusterEvidence: (workspace: string, cluster: string, observationIDs: string[]) => ["evidence", workspace, "cluster-evidence", cluster, ...observationIDs.slice().sort()] as const,
    reviewEvidence: (workspace: string, observationIDs: string[]) => ["evidence", workspace, "review-evidence", ...observationIDs.slice().sort()] as const,
    syntheses: (workspace: string) => ["evidence", workspace, "syntheses"] as const,
    synthesisEvidence: (workspace: string, synthesis: string) => ["evidence", workspace, "synthesis-evidence", synthesis] as const,
    comparisons: (workspace: string) => ["evidence", workspace, "comparisons"] as const,
    comparisonEvidence: (workspace: string, comparison: string) => ["evidence", workspace, "comparison-evidence", comparison] as const,
    questionSuggestions: (workspace: string) => ["evidence", workspace, "question-suggestions"] as const,
    recordEvidence: (workspace: string, observationIDs: string[]) => ["evidence", workspace, "record-evidence", ...observationIDs.slice().sort()] as const,
    connectionEvidence: (workspace: string, observationIDs: string[]) => ["evidence", workspace, "connection-evidence", ...observationIDs.slice().sort()] as const,
    connectionHistoryEvidence: (workspace: string, connection: string, observationIDs: string[]) => ["evidence", workspace, "connection-history-evidence", connection, ...observationIDs.slice().sort()] as const,
  },
  questions: {
    all: (workspace: string) => ["questions", workspace] as const,
    list: (workspace: string, state = "") => ["questions", workspace, "list", state] as const,
    one: (workspace: string, question: string) => ["questions", workspace, "one", question] as const,
    byIDs: (workspace: string, questionIDs: string[]) => ["questions", workspace, "by-ids", ...questionIDs.slice().sort()] as const,
    evidence: (workspace: string, question: string, observationIDs: string[]) => ["questions", workspace, "evidence", question, ...observationIDs.slice().sort()] as const,
  },
  assistance: {
    all: (workspace: string) => ["assistance", workspace] as const,
    policy: (workspace: string) => ["assistance", workspace, "policy"] as const,
    one: (workspace: string, operation: string) => ["assistance", workspace, "one", operation] as const,
    capture: (workspace: string, source: string, capture: string, extraction = "") => ["assistance", workspace, "capture", source, capture, extraction] as const,
    history: (workspace: string, source: string, capture: string, extraction = "") => ["assistance", workspace, "history", source, capture, extraction] as const,
  },
  events: {
    all: (workspace: string) => ["events", workspace] as const,
    list: (workspace: string) => ["events", workspace, "list"] as const,
    one: (workspace: string, event: string) => ["events", workspace, "one", event] as const,
    byIDs: (workspace: string, eventIDs: string[]) => ["events", workspace, "by-ids", ...eventIDs.slice().sort()] as const,
    revisions: (workspace: string, event: string) => ["events", workspace, "revisions", event] as const,
    revision: (workspace: string, event: string, revision: string) => ["events", workspace, "revision", event, revision] as const,
    revisionEvidence: (workspace: string, event: string, revision: string) => ["events", workspace, "revision-evidence", event, revision] as const,
    evidence: (workspace: string, event: string, observationIDs: string[]) => ["events", workspace, "evidence", event, ...observationIDs.slice().sort()] as const,
    accounts: (workspace: string, event: string) => ["events", workspace, "accounts", event] as const,
    clusters: (workspace: string) => ["events", workspace, "clusters"] as const,
    relationships: (workspace: string) => ["events", workspace, "relationships"] as const,
  },
  brief: {
    one: (workspace: string) => ["brief", workspace] as const,
    drafts: (workspace: string) => ["brief", workspace, "drafts"] as const,
    briefEvidence: (workspace: string, brief: string, observationIDs: string[]) => ["brief", workspace, "brief-evidence", brief, ...observationIDs.slice().sort()] as const,
    snapshotListEvidence: (workspace: string, observationIDs: string[]) => ["brief", workspace, "snapshot-list-evidence", ...observationIDs.slice().sort()] as const,
    snapshots: (workspace: string) => ["brief", workspace, "snapshots"] as const,
    handoffs: (workspace: string) => ["brief", workspace, "handoffs"] as const,
    handoff: (workspace: string, snapshot: string) => ["brief", workspace, "handoff", snapshot] as const,
    sharedHandoff: (workspace: string, token: string) => ["brief", workspace, "shared-handoff", token] as const,
    snapshot: (workspace: string, snapshot: string) => ["brief", workspace, "snapshot", snapshot] as const,
    snapshotActivity: (workspace: string, snapshot: string) => ["brief", workspace, "snapshot", snapshot, "activity"] as const,
    snapshotReview: (workspace: string, snapshot: string) => ["brief", workspace, "snapshot", snapshot, "review"] as const,
    snapshotComments: (workspace: string, snapshot: string) => ["brief", workspace, "snapshot", snapshot, "comments"] as const,
    snapshotShares: (workspace: string, snapshot: string) => ["brief", workspace, "snapshot", snapshot, "shares"] as const,
    snapshotEvidence: (workspace: string, snapshot: string) => ["brief", workspace, "snapshot", snapshot, "evidence"] as const,
    comparisonEvidence: (workspace: string, snapshots: string[]) => ["brief", workspace, "comparison-evidence", ...snapshots.slice().sort()] as const,
  },
  records: {
    all: (workspace: string) => ["research-records", workspace] as const,
    list: (workspace: string, query = "", kind = "", citation = "", resolution = "") => query.trim() || kind || citation || resolution ? ["research-records", workspace, "list", query.trim(), kind, citation, resolution] as const : ["research-records", workspace, "list"] as const,
    summary: (workspace: string) => ["research-records", workspace, "summary"] as const,
    one: (workspace: string, record: string) => ["research-records", workspace, "one", record] as const,
    byIDs: (workspace: string, recordIDs: string[]) => ["research-records", workspace, "by-ids", ...recordIDs.slice().sort()] as const,
  },
  connections: {
    all: (workspace: string) => ["research-connections", workspace] as const,
    list: (workspace: string, state = "", review = "") => state || review ? ["research-connections", workspace, "list", state, review] as const : ["research-connections", workspace, "list"] as const,
    summary: (workspace: string) => ["research-connections", workspace, "summary"] as const,
    one: (workspace: string, connection: string) => ["research-connections", workspace, "one", connection] as const,
    byIDs: (workspace: string, connectionIDs: string[]) => ["research-connections", workspace, "by-ids", ...connectionIDs.slice().sort()] as const,
    revisions: (workspace: string, connection: string) => ["research-connections", workspace, "revisions", connection] as const,
    revision: (workspace: string, connection: string, revision: string) => ["research-connections", workspace, "revision", connection, revision] as const,
    revisionEvidence: (workspace: string, connection: string, revision: string) => ["research-connections", workspace, "revision-evidence", connection, revision] as const,
    reviews: (workspace: string, connection: string) => ["research-connections", workspace, "reviews", connection] as const,
  },
  resolutions: {
    all: (workspace: string) => ["research-resolutions", workspace] as const,
    list: (workspace: string) => ["research-resolutions", workspace, "list"] as const,
    impact: (workspace: string, resolution: string) => ["research-resolutions", workspace, "impact", resolution] as const,
  },
  resolutionSets: {
    all: (workspace: string) => ["research-resolution-sets", workspace] as const,
    list: (workspace: string) => ["research-resolution-sets", workspace, "list"] as const,
    impact: (workspace: string, resolutionSet: string) => ["research-resolution-sets", workspace, "impact", resolutionSet] as const,
  },
  investigationContext: (workspace: string) => ["investigation-context", workspace] as const,
  shell: () => ["shell"] as const,

  tenancy: {
    workspaces: (org: string) => ["tenancy", "workspaces", org] as const,
    members: (org: string) => ["tenancy", "members", org] as const,
  },

  access: {
    invites: (org: string) => ["access", "invites", org] as const,
    grants: (workspace: string) => ["access", "grants", workspace] as const,
  },

  tooling: {
    all: (org: string) => ["tooling", org] as const,
    tools: (org: string) => ["tooling", org, "tools"] as const,
    mappings: (org: string, tool: string) => ["tooling", org, "tools", tool, "mappings"] as const,
  },

  checks: {
    all: (org: string) => ["checks", org] as const,
    list: (org: string) => ["checks", org, "list"] as const,
    chain: (org: string, check: string) => ["checks", org, "chain", check] as const,
  },

  runs: {
    all: (workspace: string) => ["runs", workspace] as const,
    list: (workspace: string) => ["runs", workspace, "list"] as const,
    one: (workspace: string, run: string) => ["runs", workspace, "one", run] as const,
  },

  targets: {
    all: (workspace: string) => ["targets", workspace] as const,
    list: (workspace: string, archived: boolean) =>
      ["targets", workspace, "list", archived] as const,
    scope: (workspace: string, target: string, all: boolean) =>
      ["targets", workspace, "scope", target, all] as const,
  },

  entities: {
    all: (workspace: string) => ["entities", workspace] as const,
    list: (workspace: string) => ["entities", workspace, "list"] as const,
    canvas: (workspace: string, root: string, limit?: number) =>
      ["entities", workspace, "canvas", root, limit ?? null] as const,
    assets: (workspace: string, target?: string) =>
      ["entities", workspace, "assets", target ?? null] as const,
    fragments: (workspace: string) => ["entities", workspace, "fragments"] as const,
    fragment: (workspace: string, id: string) =>
      ["entities", workspace, "fragment", id] as const,
  },
  health: {
    one: (workspace: string) => ["health", workspace] as const,
  },

  changes: {
    list: (workspace: string) => ["changes", workspace, "list"] as const,
  },

  observed: {
    all: (workspace: string) => ["observed", workspace] as const,
    subjects: (workspace: string) => ["observed", workspace, "subjects"] as const,
    observations: (workspace: string, subject: string) =>
      ["observed", workspace, "observations", subject] as const,
    lineage: (workspace: string, observation: string) =>
      ["observed", workspace, "lineage", observation] as const,
    extraction: (workspace: string, invocation: string) =>
      ["observed", workspace, "extraction", invocation] as const,
  },

  findings: {
    all: (workspace: string) => ["findings", workspace] as const,
    list: (workspace: string, state?: string) =>
      ["findings", workspace, "list", state ?? null] as const,
  },

  reports: {
    all: (workspace: string) => ["reports", workspace] as const,
    list: (workspace: string) => ["reports", workspace, "list"] as const,
    one: (workspace: string, report: string) =>
      ["reports", workspace, "one", report] as const,
    preview: (workspace: string, report: string) =>
      ["reports", workspace, "preview", report] as const,
  },

  coverage: (workspace: string, target?: string) =>
    ["coverage", workspace, target ?? null] as const,

  ledger: {
    org: (org: string, after?: string, facet?: string) =>
      ["ledger", "org", org, after ?? null, facet ?? null] as const,
    workspace: (workspace: string, after?: string, facet?: string) =>
      ["ledger", "workspace", workspace, after ?? null, facet ?? null] as const,
    logs: (workspace: string, after?: string) =>
      ["ledger", "logs", workspace, after ?? null] as const,
    mine: (after?: string, facet?: string) =>
      ["ledger", "mine", after ?? null, facet ?? null] as const,
    chain: (correlation: string) => ["ledger", "chain", correlation] as const,
  },

  identity: {
    sessions: () => ["identity", "sessions"] as const,
  },
} as const;
