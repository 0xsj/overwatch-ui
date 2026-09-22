"use server";

import { revalidatePath } from "next/cache";
import { clientFor } from "@/lib/root";
import { markChangesSeen } from "@/lib/services/changes";
import { markSourceAlertSeen, refreshSourceGapAlerts, saveSourceAlertDelivery, type SourceAlertKind } from "@/lib/services/sources";
import { addTarget, archiveTarget, reopenTarget } from "@/lib/services/targets";
import type { TargetKind } from "@/lib/services/targets";
import { toFormState, type FormState } from "../../(auth)/_form-state";

const str = (d: FormData, k: string) => String(d.get(k) ?? "").trim();

/** `write` — adding something to look at is the ordinary work of an
 *  engagement. A target is an ORGANISATION or a PERSON and nothing else: a
 *  hostname is something a tool said about one, and the distance between them
 *  is the attribution question. */
export async function addTargetAction(
  workspaceId: string,
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  try {
    await addTarget(await clientFor("targets"), workspaceId, {
      name: str(data, "name"),
      kind: str(data, "kind") as TargetKind,
    });
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/home/targets");
  return { status: "ok" };
}

/** ADMIN, not write — it hides a record, which is nearer editing scope than the
 *  ordinary work of an engagement. */
export async function archiveTargetAction(
  workspaceId: string,
  targetId: string,
): Promise<FormState> {
  try {
    await archiveTarget(await clientFor("targets"), workspaceId, targetId);
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/home/targets");
  return { status: "ok" };
}

export async function reopenTargetAction(
  workspaceId: string,
  targetId: string,
): Promise<FormState> {
  try {
    await reopenTarget(await clientFor("targets"), workspaceId, targetId);
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/home/targets");
  return { status: "ok" };
}

/** The watermark belongs to the current account and engagement. The backend
 * supplies server time and revalidates the page's server cache. */
export async function markChangesSeenAction(workspaceId: string): Promise<{ seen_at: string }> {
  const result = await markChangesSeen(await clientFor("changes"), workspaceId);
  revalidatePath("/home/whats-new");
  return result;
}

export async function markSourceAlertSeenAction(workspaceId: string, alertId: string): Promise<{ seen_at: string }> {
  const result = await markSourceAlertSeen(await clientFor("sources"), workspaceId, alertId);
  revalidatePath("/home/alerts");
  return result;
}

export async function refreshSourceGapAlertsAction(workspaceId: string): Promise<{ active_gap_count: number }> {
  const result = await refreshSourceGapAlerts(await clientFor("sources"), workspaceId);
  revalidatePath("/home/alerts");
  return result;
}

export async function saveSourceAlertDeliveryAction(workspaceId: string, input: { email_enabled: boolean; kinds: SourceAlertKind[] }) {
  const result = await saveSourceAlertDelivery(await clientFor("sources"), workspaceId, input);
  revalidatePath("/home/alerts");
  return result;
}
