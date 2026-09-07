"use server";

import { revalidatePath } from "next/cache";
import { clientFor } from "@/lib/root";
import { readChain, saveChain } from "@/lib/services/checks";
import { previewRun, startRun } from "@/lib/services/runs";
import type { RunDetail } from "@/lib/services/runs";
import { toFormState, type FormState } from "../../../(auth)/_form-state";

/** A settled drag, written through as a PIN.
 *
 *  Read-modify-write against the whole chain, because `PUT …/chain` takes the
 *  whole graph. The server diffs rather than replacing, so step ids survive —
 *  which matters because a run records which step produced which invocation, and
 *  an id that churned under it would make that record point at nothing.
 *
 *  `x`, `y` and `pinned` are flat, not an optional `pin` object: `(0, 0)` and
 *  "never moved" are different facts and one nullable object cannot carry both
 *  once somebody drags a node to the origin. */
export async function pinStepAction(
  orgId: string,
  checkId: string,
  stepId: string,
  at: { x: number; y: number },
): Promise<void> {
  try {
    const client = await clientFor("checks");
    const chain = await readChain(client, orgId, checkId);
    await saveChain(client, orgId, checkId, {
      steps: chain.steps.map((s) =>
        s.step_id === stepId
          ? { step_id: s.step_id, tool_id: s.tool_id, x: at.x, y: at.y, pinned: true }
          : { step_id: s.step_id, tool_id: s.tool_id, x: s.x, y: s.y, pinned: s.pinned },
      ),
      flows: chain.flows.map((f) => ({ from: f.from, to: f.to })),
    });
  } catch {
    // A pin that did not save is a node in the wrong place next time, not a
    // failure worth interrupting a drag for.
  }
}

/** The plan, written nothing.
 *
 *  The same walk `startRun` does — preview and plan are one function on the
 *  server, so there is no second shape to drift. `tools/add` promises nothing
 *  runs until a person has read the command; this is the other half of that
 *  promise, and it is the thing that makes the scope model visible. */
export async function previewAction(
  workspaceId: string,
  checkId: string,
  targetId: string,
): Promise<{ plan: RunDetail } | FormState> {
  try {
    return { plan: await previewRun(await clientFor("runs"), workspaceId, {
      check_id: checkId, target_id: targetId,
    }) };
  } catch (error) {
    return toFormState(error);
  }
}

/** 202, and it answers with the PLAN rather than a result. Nothing has spawned;
 *  every step already has an invocation row and the gate has already been asked.
 *  The caller renders that immediately and then polls. */
export async function startRunAction(
  workspaceId: string,
  checkId: string,
  targetId: string,
): Promise<{ plan: RunDetail } | FormState> {
  try {
    const plan = await startRun(await clientFor("runs"), workspaceId, {
      check_id: checkId, target_id: targetId,
    });
    revalidatePath("/tools/checks");
    return { plan };
  } catch (error) {
    return toFormState(error);
  }
}
