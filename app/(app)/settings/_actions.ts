"use server";

import { revalidatePath } from "next/cache";
import { clientFor } from "@/lib/root";
import {
  changeRole,
  removeMember,
  revokeInvite,
  sendInvite,
  setGrant,
} from "@/lib/services/access";
import { openWorkspace } from "@/lib/services/tenancy";
import type { GrantLevel, OrgRole } from "@/lib/services/tenancy";
import { toFormState, type FormState } from "../../(auth)/_form-state";

const str = (d: FormData, k: string) => String(d.get(k) ?? "");

/** REAL — `POST /v1/orgs/{org}/workspaces`, owner and admin only, and it needs a
 *  verified address. Both refusals come back as 403 WITH a reason, because the
 *  caller already knows the org exists and what they need is the cause. */
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

/* ─── Below here nothing is served. `lib/root` never puts a server behind
       `access`, so every one of these reaches a fixture, by design.        */

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
      // An invitation with no first grant is a real thing to send — it is how
      // you add an admin who manages people and is granted engagements
      // separately — so an empty selection is ABSENT rather than `none`.
      ...(workspaceId && level !== "none"
        ? { first_grant: { workspace_id: workspaceId, level } }
        : {}),
    });
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/settings/members");
  return { status: "ok" };
}

export async function revokeInviteAction(orgId: string, inviteId: string): Promise<void> {
  await revokeInvite(await clientFor("access"), orgId, inviteId);
  revalidatePath("/settings/members");
}

export async function changeRoleAction(
  orgId: string,
  accountId: string,
  role: OrgRole,
): Promise<FormState> {
  try {
    await changeRole(await clientFor("access"), orgId, accountId, role);
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/settings/members");
  return { status: "ok" };
}

export async function removeMemberAction(
  orgId: string,
  accountId: string,
): Promise<FormState> {
  try {
    await removeMember(await clientFor("access"), orgId, accountId);
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/settings/members");
  return { status: "ok" };
}

/** One call for add, change and revoke, because `none` is a level on the ladder
 *  rather than the absence of one. Two verbs would let a screen express
 *  "granted, at none", which is a state that must not be distinguishable from
 *  having no row — a workspace at `none` is ABSENT, not disabled. */
export async function setGrantAction(
  orgId: string,
  workspaceId: string,
  accountId: string,
  level: GrantLevel,
): Promise<FormState> {
  try {
    await setGrant(await clientFor("access"), orgId, workspaceId, accountId, level);
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/settings/access");
  return { status: "ok" };
}
