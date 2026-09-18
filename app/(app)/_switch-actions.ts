"use server";

import { clientFor } from "@/lib/root";
import { getMe } from "@/lib/services/tenancy";
import { redirect } from "next/navigation";
import { selectOrg, selectWorkspace } from "./_selection";

export async function switchOrgAction(orgId: string): Promise<void> {
  await selectOrg(orgId);
  redirect("/investigation");
}

export async function switchWorkspaceAction(workspaceId: string): Promise<void> {
  const me = await getMe(await clientFor("tenancy"));
  const org = me.orgs.find((one) => one.workspaces.some((workspace) => workspace.workspace_id === workspaceId));
  if (!org) redirect("/investigation");
  await selectOrg(org.org_id);
  await selectWorkspace(workspaceId);
  if (org.role === "client") redirect("/findings/report");
  redirect(`/investigation/${encodeURIComponent(workspaceId)}/overview`);
}
