"use server";

import { redirect } from "next/navigation";
import { selectOrg, selectWorkspace } from "./_selection";

export async function switchOrgAction(orgId: string): Promise<void> {
  await selectOrg(orgId);
  redirect("/home/overview");
}

export async function switchWorkspaceAction(workspaceId: string): Promise<void> {
  await selectWorkspace(workspaceId);
  redirect("/home/overview");
}
