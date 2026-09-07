import { cookies } from "next/headers";

/** Which org and workspace are open, in cookies.
 *
 *  A layout cannot read its own page's `searchParams` — Next does not hand them
 *  down — so a `?org=` on a link would change the page and leave the chrome
 *  pointing at the previous one. The switchers therefore write a cookie and the
 *  layout reads it, which also survives a reload and a direct link to a deep
 *  screen.
 *
 *  These are a PREFERENCE and never a permission. Whatever they name is checked
 *  against `/v1/me` on every read, and an id the caller cannot see falls back to
 *  the first they can — because a workspace they lost access to is absent from
 *  `/v1/me` entirely, and pinning to it must not produce an empty screen. */
const ORG = "ow_org";
const WORKSPACE = "ow_workspace";

const OPTIONS = { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" } as const;

export async function currentSelection(): Promise<{ org?: string; workspace?: string }> {
  const jar = await cookies();
  return { org: jar.get(ORG)?.value, workspace: jar.get(WORKSPACE)?.value };
}

export async function selectOrg(orgId: string): Promise<void> {
  const jar = await cookies();
  jar.set(ORG, orgId, OPTIONS);
  // A workspace belongs to one org, so keeping the old one would pin the chrome
  // to an engagement that is not in the org now open.
  jar.delete(WORKSPACE);
}

export async function selectWorkspace(workspaceId: string): Promise<void> {
  (await cookies()).set(WORKSPACE, workspaceId, OPTIONS);
}
