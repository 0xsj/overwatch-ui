"use server";

import { revalidatePath } from "next/cache";
import { clientFor } from "@/lib/root";
import { decideAttribution, judgeFragment, markRead } from "@/lib/services/entities";
import type { ClaimState, JudgementState } from "@/lib/services/entities";
import { toFormState, type FormState } from "../../(auth)/_form-state";

/** A person LOOKED. It deliberately does not touch the judgement — two acts,
 *  two calls, because somebody can read a thing and decline to rule on it,
 *  which is the commonest thing an analyst does. */
export async function markReadAction(
  workspaceId: string,
  fragmentId: string,
): Promise<FormState> {
  try {
    await markRead(await clientFor("entities"), workspaceId, fragmentId);
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/surface/assets");
  return { status: "ok" };
}

/** **Dismissal requires a reason; triage does not.** The server answers 400
 *  with *"dismissing needs a reason — a dismissal with no reason reads as
 *  `never looked at` in six months"*, and that sentence is returned rather
 *  than replaced with a generic required-field message. */
export async function judgeAction(
  workspaceId: string,
  fragmentId: string,
  state: JudgementState,
  reason?: string,
): Promise<FormState> {
  try {
    await judgeFragment(await clientFor("entities"), workspaceId, fragmentId, { state, reason });
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/surface/assets");
  return { status: "ok" };
}

/** ADMIN, not write: accepting a claim puts something on a client's asset list.
 *  It never rewrites who proposed it. */
export async function decideAction(
  workspaceId: string,
  attributionId: string,
  state: ClaimState,
  note?: string,
): Promise<FormState> {
  try {
    await decideAttribution(await clientFor("entities"), workspaceId, attributionId, { state, note });
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/surface/assets");
  return { status: "ok" };
}
