import type { HttpClient } from "@/lib/http";

export type HealthProbe = {
  kind: string;
  measured: boolean;
  because?: string;
  looked?: number;
  found?: number;
};

export type HealthSymptom = {
  kind: string;
  says: string;
  subject: string;
  subject_id?: string;
  detail?: string;
  count: number;
  since?: string;
};

export type HealthReport = {
  at: string;
  trustworthy: boolean;
  probes: HealthProbe[];
  symptoms: HealthSymptom[];
};

const base = (workspace: string) => `/workspaces/${encodeURIComponent(workspace)}/health`;

export function readHealth(http: HttpClient, workspace: string) {
  return http.get<HealthReport>(base(workspace));
}
