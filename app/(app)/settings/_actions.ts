"use server";

import { revalidatePath } from "next/cache";
import { clientFor } from "@/lib/root";
import { revokeLevel, sendInvite, setLevel, withdrawInvite } from "@/lib/services/access";
import { openWorkspace } from "@/lib/services/tenancy";
import type { GrantLevel, OrgRole } from "@/lib/services/tenancy";
import { toFormState, type FormState } from "../../(auth)/_form-state";

const str = (d: FormData, k: string) => String(d.get(k) ?? "");

/** Owner and admin only, and it needs a verified address. Both refusals come
 *  back as 403 WITH a reason, because the caller already knows the org exists
 *  and what they need is the cause. */
export async function openWorkspaceAction(
  orgId: string,
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  try {
    await openWorkspace(await clientFor("tenancy"), orgId, str(data, "name"));
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/", "layout");
  return { status: "ok" };
}

/** `workspace_id` and `level` go together or not at all — 400 otherwise — so an
 *  empty engagement selection sends NEITHER rather than a level with nothing to
 *  apply it to. */
export async function sendInviteAction(
  orgId: string,
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  const workspaceId = str(data, "workspace_id");
  const level = str(data, "level") as GrantLevel;
  try {
    await sendInvite(await clientFor("access"), orgId, {
      email: str(data, "email"),
      role: str(data, "role") as OrgRole,
      ...(workspaceId && level ? { workspace_id: workspaceId, level } : {}),
    });
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/settings/members");
  return { status: "ok" };
}

export async function withdrawInviteAction(orgId: string, inviteId: string): Promise<FormState> {
  try {
    await withdrawInvite(await clientFor("access"), orgId, inviteId);
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/settings/members");
  return { status: "ok" };
}

/** Idempotent, and it covers granting and changing both — do not try to work out
 *  which, because between the read and the write somebody else may have
 *  granted. 409 above the role's ceiling, and 409 for a non-member. */
export async function setLevelAction(
  workspaceId: string,
  accountId: string,
  level: GrantLevel,
): Promise<FormState> {
  try {
    await setLevel(await clientFor("access"), workspaceId, accountId, level);
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/settings/access");
  return { status: "ok" };
}

/** A revocation DELETES the row. There is no `none` to write, so this is a
 *  separate verb rather than `setLevel(…, "none")` — which is what this file
 *  had until 2026-09-07, on reasoning the server has since decided against. */
export async function revokeLevelAction(
  workspaceId: string,
  accountId: string,
): Promise<FormState> {
  try {
    await revokeLevel(await clientFor("access"), workspaceId, accountId);
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/settings/access");
  return { status: "ok" };
}
