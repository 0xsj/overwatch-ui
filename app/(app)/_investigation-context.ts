import { clientFor } from "@/lib/root";
import { AppError } from "@/lib/kernel";
import { getMe, listWorkspaces } from "@/lib/services/tenancy";
import type { InvestigationContext } from "./_route-context";

/** /me omits closed workspaces; their authorized listing preserves read access. */
export async function loadInvestigationContext(workspace: string): Promise<InvestigationContext> {
  const http = await clientFor("tenancy");
  const me = await getMe(http);
  const orgs = me.orgs.filter((org) => org.role !== "client");
  for (const org of orgs) {
    const open = org.workspaces.find((one) => one.workspace_id === workspace);
    if (open && open.access !== "none") return { org_id: org.org_id, workspace: { ...open, closed: false } };
  }
  const listings = await Promise.all(orgs.map(async (org) => ({ org, rows: await listWorkspaces(http, org.org_id) })));
  for (const { org, rows } of listings) {
    const record = rows.find((one) => one.workspace_id === workspace);
    if (record && record.access !== "none") return { org_id: org.org_id, workspace: record };
  }
  throw new AppError({ kind: "not_found", status: 404, message: "Investigation unavailable." });
}
