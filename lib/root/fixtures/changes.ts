import { bearerOf, type MemoryRoute } from "@/lib/http";
import type { Change, ChangePage } from "@/lib/services/changes";

const TARGET = "01a07bd0-700a-7000-9000-000000000001";
const CURRENT_RUN = "01a07bc3-7004-7000-9000-000000000001";
const PREVIOUS_RUN = "01a07bc3-7004-7000-9000-000000000002";
const seenAtByMarker = new Map<string, string>();

const markerKey = (token: string | null, workspace: string) => `${token ?? "fixture"}:${workspace}`;

const changes: Change[] = [
  {
    change_id: "change-01",
    kind: "added",
    target_id: TARGET,
    target_name: "Halcyon Systems Ltd",
    subject_kind: "host",
    subject_value: "staging.halcyon.example",
    field: "dns.a",
    current_value: "203.0.113.42",
    summary: "answered for the first time; certificate issued two days ago",
    current_run_id: CURRENT_RUN,
    previous_run_id: PREVIOUS_RUN,
    changed_at: "2026-09-06T22:04:19Z",
  },
  {
    change_id: "change-02",
    kind: "added",
    target_id: TARGET,
    target_name: "Halcyon Systems Ltd",
    subject_kind: "host",
    subject_value: "northbeam-cdn.example",
    field: "attribution",
    summary: "new host proposed from a certificate sharing a SAN with AS64511",
    current_run_id: CURRENT_RUN,
    previous_run_id: PREVIOUS_RUN,
    changed_at: "2026-09-06T22:04:18Z",
  },
  {
    change_id: "change-03",
    kind: "added",
    target_id: TARGET,
    target_name: "Halcyon Systems Ltd",
    subject_kind: "host",
    subject_value: "grafana.internal.halcyon.example",
    field: "certificate.transparency",
    summary: "appeared in certificate transparency; never probed",
    current_run_id: CURRENT_RUN,
    previous_run_id: PREVIOUS_RUN,
    changed_at: "2026-09-06T22:04:17Z",
  },
  {
    change_id: "change-04",
    kind: "changed",
    target_id: TARGET,
    target_name: "Halcyon Systems Ltd",
    subject_kind: "host",
    subject_value: "api.halcyon.example",
    field: "http.server",
    previous_value: "nginx/1.24.0",
    current_value: "nginx/1.25.3",
    summary: "server changed",
    current_run_id: CURRENT_RUN,
    previous_run_id: PREVIOUS_RUN,
    changed_at: "2026-09-06T22:04:23Z",
  },
  {
    change_id: "change-05",
    kind: "changed",
    target_id: TARGET,
    target_name: "Halcyon Systems Ltd",
    subject_kind: "host",
    subject_value: "legacy-sso.halcyon.example",
    field: "tls.valid",
    previous_value: "valid",
    current_value: "expired",
    summary: "certificate state changed",
    current_run_id: CURRENT_RUN,
    previous_run_id: PREVIOUS_RUN,
    changed_at: "2026-09-06T22:04:22Z",
  },
  {
    change_id: "change-06",
    kind: "changed",
    target_id: TARGET,
    target_name: "Halcyon Systems Ltd",
    subject_kind: "host",
    subject_value: "cdn.halcyon.example",
    field: "http.server",
    previous_value: "cloudflare",
    summary: "Server header stopped being sent — present yesterday, absent today",
    current_run_id: CURRENT_RUN,
    previous_run_id: PREVIOUS_RUN,
    changed_at: "2026-09-06T22:04:21Z",
  },
  {
    change_id: "change-07",
    kind: "gone",
    target_id: TARGET,
    target_name: "Halcyon Systems Ltd",
    subject_kind: "host",
    subject_value: "old-api.halcyon.example",
    field: "dns.a",
    previous_value: "203.0.113.12",
    summary: "stopped resolving after 41 days; the subject was measured again",
    current_run_id: CURRENT_RUN,
    previous_run_id: PREVIOUS_RUN,
    changed_at: "2026-09-06T22:04:20Z",
  },
  {
    change_id: "change-08",
    kind: "changed",
    target_id: TARGET,
    target_name: "Halcyon Systems Ltd",
    subject_kind: "asn",
    subject_value: "AS64511",
    field: "whois.contact",
    previous_value: "noc@northbeam.example",
    current_value: "ops@halcyon.example",
    summary: "whois contact changed",
    current_run_id: CURRENT_RUN,
    previous_run_id: PREVIOUS_RUN,
    changed_at: "2026-09-03T12:00:00Z",
  },
  {
    change_id: "change-09",
    kind: "added",
    target_id: TARGET,
    target_name: "Halcyon Systems Ltd",
    subject_kind: "repo",
    subject_value: "github.com/halcyon/edge-proxy",
    field: "repository",
    current_value: "public",
    summary: "repository surfaced from a deploy-key fingerprint match",
    current_run_id: CURRENT_RUN,
    previous_run_id: PREVIOUS_RUN,
    changed_at: "2026-09-03T11:00:00Z",
  },
  {
    change_id: "change-10",
    kind: "changed",
    target_id: TARGET,
    target_name: "Halcyon Systems Ltd",
    subject_kind: "host",
    subject_value: "assets.halcyon.example",
    field: "ports",
    previous_value: "443",
    current_value: "443, 8443",
    summary: "ports changed",
    current_run_id: CURRENT_RUN,
    previous_run_id: PREVIOUS_RUN,
    changed_at: "2026-09-05T14:00:00Z",
  },
  {
    change_id: "change-11",
    kind: "gone",
    target_id: TARGET,
    target_name: "Halcyon Systems Ltd",
    subject_kind: "host",
    subject_value: "beta.halcyon.example",
    field: "dns.status",
    previous_value: "resolving",
    summary: "NXDOMAIN for seven consecutive checks; the subject was measured again",
    current_run_id: CURRENT_RUN,
    previous_run_id: PREVIOUS_RUN,
    changed_at: "2026-09-04T09:00:00Z",
  },
  {
    change_id: "change-12",
    kind: "added",
    target_id: TARGET,
    target_name: "Halcyon Systems Ltd",
    subject_kind: "ip",
    subject_value: "198.51.100.12",
    field: "address",
    current_value: "198.51.100.12",
    summary: "new address inside the declared range",
    current_run_id: CURRENT_RUN,
    previous_run_id: PREVIOUS_RUN,
    changed_at: "2026-09-05T13:00:00Z",
  },
  {
    change_id: "change-13",
    kind: "changed",
    target_id: TARGET,
    target_name: "Halcyon Systems Ltd",
    subject_kind: "host",
    subject_value: "www.halcyon.example",
    field: "http.title",
    previous_value: "Halcyon Systems",
    current_value: "Halcyon Systems — now part of Northbeam",
    summary: "title changed",
    current_run_id: CURRENT_RUN,
    previous_run_id: PREVIOUS_RUN,
    changed_at: "2026-09-05T12:00:00Z",
  },
  {
    change_id: "change-14",
    kind: "added",
    target_id: TARGET,
    target_name: "Halcyon Systems Ltd",
    subject_kind: "email",
    subject_value: "ops@halcyon.example",
    field: "commit.author",
    current_value: "ops@halcyon.example",
    summary: "address extracted from a public commit author field",
    current_run_id: CURRENT_RUN,
    previous_run_id: PREVIOUS_RUN,
    changed_at: "2026-09-03T10:00:00Z",
  },
];

export const changeRoutes: MemoryRoute[] = [
  (req) => {
    const match = /^\/workspaces\/([^/]+)\/changes\/seen$/.exec(req.path);
    if (!(req.method === "POST" && match)) return undefined;
    const workspace = decodeURIComponent(match[1]);
    const seenAt = new Date().toISOString();
    seenAtByMarker.set(markerKey(bearerOf(req), workspace), seenAt);
    return { seen_at: seenAt };
  },
  (req) => {
    const match = /^\/workspaces\/([^/]+)\/changes$/.exec(req.path);
    if (!(req.method === "GET" && match)) return undefined;
    const workspace = decodeURIComponent(match[1]);
    const page: ChangePage = {
      changes: changes.map((change) => ({ ...change, target_id: change.target_id })),
      seen_at: seenAtByMarker.get(markerKey(bearerOf(req), workspace)),
      comparisons: [{
        target_id: TARGET,
        target_name: "Halcyon Systems Ltd",
        current_run_at: "2026-09-06T22:04:11Z",
        previous_run_at: "2026-09-05T03:00:02Z",
      }],
    };
    // The route is workspace-scoped even though this persona's fixture has one
    // workspace. Keeping the path read here makes the contract match the live
    // server and prevents a future fixture from becoming global by accident.
    void workspace;
    return page;
  },
];
