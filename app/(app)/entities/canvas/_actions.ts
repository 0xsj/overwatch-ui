"use server";

import { http } from "@/lib/root";
import { clearPins, putPin } from "@/lib/services/entities";

/** Fired after a drag settles, never during it. The canvas has already moved the
 *  node; this is the write that makes it survive a reload, and the screen does
 *  not wait for it. */
export async function pinNode(rootId: string, nodeId: string, x: number, y: number) {
  await putPin(http, rootId, nodeId, { x, y });
}

export async function relayout(rootId: string) {
  await clearPins(http, rootId);
}
