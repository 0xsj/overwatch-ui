"use server";

import { clientFor } from "@/lib/root";
import { getCheck, saveCheck } from "@/lib/services/pipeline";

/** A settled drag, written through.
 *
 *  A pin is a CONSTRAINT and not a render — the same rule as the entity canvas.
 *  Somebody who moved a node stated where it belongs, so it has to survive a
 *  reload and a re-layout of everything around it. The layout honours a pin
 *  outright and arranges the unpinned steps around it.
 *
 *  Read-modify-write, because `PUT /checks/{id}` takes the whole check and this
 *  action knows one step. Nothing serves any of it yet, so a lost update is not
 *  reachable — when it is, this becomes a PATCH on the step. */
export async function pinStepAction(
  checkId: string,
  stepId: string,
  at: { x: number; y: number },
): Promise<void> {
  try {
    const client = await clientFor("pipeline");
    const check = await getCheck(client, checkId);
    await saveCheck(client, {
      ...check,
      steps: check.steps.map((s) => (s.step_id === stepId ? { ...s, pin: at } : s)),
    });
  } catch {
    // A pin that did not save is a node in the wrong place next time, not a
    // failure worth interrupting a drag for.
  }
}
