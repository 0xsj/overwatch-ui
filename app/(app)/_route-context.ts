import type { Shell } from "./_shell";
import type { MeWorkspace } from "@/lib/services/tenancy";

export type InvestigationContext = { org_id: string; workspace: MeWorkspace & { closed: boolean } };

export function researchWorkspaceFromPath(pathname: string): string | null {
  const match = /^\/investigation\/([^/]+)\/(overview|sources|evidence|questions|timeline|brief|notes|records|connections)(?:\/|$)/.exec(pathname);
  if (!match) return null;
  try { return decodeURIComponent(match[1]); } catch { return null; }
}

/** A research deep link must never borrow another investigation's name or data. */
export function shellForPath(shell: Shell, pathname: string, record?: InvestigationContext | null): Shell {
  const match = /^\/investigation\/([^/]+)\/(overview|sources|evidence|questions|timeline|brief|notes|records|connections)(?:\/|$)/.exec(pathname);
  if (!match) return shell;
  let workspaceId: string;
  try { workspaceId = decodeURIComponent(match[1]); } catch { return { ...shell, context: null }; }
  const org = shell.me.orgs.find((one) => one.workspaces.some((workspace) => workspace.workspace_id === workspaceId))
    ?? (record?.workspace.workspace_id === workspaceId ? shell.me.orgs.find((one) => one.org_id === record.org_id) : undefined);
  const workspace = org?.workspaces.find((one) => one.workspace_id === workspaceId)
    ?? (record?.org_id === org?.org_id && record?.workspace.workspace_id === workspaceId ? record.workspace : undefined);
  if (!org || !workspace || workspace.access === "none" || org.role === "client") return { ...shell, context: null };
  return { ...shell, context: { account: { id: shell.me.account_id, email: shell.me.email, verified: shell.me.verified }, org, workspace } };
}

export function mayWriteResearch(workspace?: MeWorkspace & { closed?: boolean }): boolean {
  return Boolean(workspace && !workspace.closed && (workspace.access === "write" || workspace.access === "admin"));
}
