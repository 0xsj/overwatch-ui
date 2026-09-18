"use server";

import { revalidatePath } from "next/cache";
import { clientFor } from "@/lib/root";
import { addCheck, archiveCheck, readChain, saveChain, updateCheck } from "@/lib/services/checks";
import type { ChainInput, CheckInput } from "@/lib/services/checks";
import { isTargetable, type Targetable } from "@/lib/kernel";
import { previewRun, readRun, startRun } from "@/lib/services/runs";
import type { RunDetail } from "@/lib/services/runs";
import type { Chain } from "@/lib/services/checks";
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

/** One run, opened.
 *
 *  The Executions tab listed runs and could not open one, which meant a
 *  completed run's CANDIDATES were unreachable — and those are the scope proof:
 *  *"we would have looked at these three and a rule said no"* is the sentence a
 *  client's report cites, and it lives nowhere else. `decisions/0039`. */
export async function readRunAction(
  workspaceId: string,
  runId: string,
): Promise<{ detail: RunDetail } | FormState> {
  try {
    return { detail: await readRun(await clientFor("runs"), workspaceId, runId) };
  } catch (error) {
    return toFormState(error);
  }
}

/** The seconds a person actually means, from the words they picked.
 *
 *  SECONDS on the wire, because `P1M` is not a length of time — a "monthly"
 *  check is stale after 28, 29, 30 or 31 days depending on the month it last ran
 *  in, and that ambiguity lands exactly where staleness is decided. Offering
 *  readable intervals is the client's job and this is that mapping. */
const EVERY: Record<string, number> = {
  "on request only": 0,
  "6 hours": 21600,
  "12 hours": 43200,
  "day": 86400,
  "week": 604800,
};

function inputFrom(data: FormData): CheckInput {
  const applies = data.getAll("applies_to").map(String).filter(isTargetable);
  return {
    name: String(data.get("name") ?? "").trim(),
    question: String(data.get("question") ?? "").trim(),
    applies_to: applies as Targetable[],
    interval_seconds: EVERY[String(data.get("every") ?? "")] || undefined,
    /* Enabling a check that has an interval IS the standing authorisation for
       every future scheduled run of it, INCLUDING a loud one — `0038`. There is
       deliberately no per-run kill switch: `scope` is what stops a scheduled run
       touching something it should not, and a second authority over the same act
       is what `0010` exists to prevent. */
    enabled: data.get("enabled") === "on",
    /* A FLAG, not "has no chain" — `0037` §3. A check nobody has wired a chain
       to yet is also chainless, and deriving this made an unfinished check
       report coverage it did not have. */
    human: data.get("human") === "on",
  };
}

export async function addCheckAction(
  orgId: string,
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  try {
    await addCheck(await clientFor("checks"), orgId, inputFrom(data));
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/tools/checks");
  return { status: "ok" };
}

export async function updateCheckAction(
  orgId: string,
  checkId: string,
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  try {
    await updateCheck(await clientFor("checks"), orgId, checkId, inputFrom(data));
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/tools/checks");
  return { status: "ok" };
}

export async function archiveCheckAction(orgId: string, checkId: string): Promise<FormState> {
  try {
    await archiveCheck(await clientFor("checks"), orgId, checkId);
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/tools/checks");
  return { status: "ok" };
}

/** The WHOLE graph, and a save is a diff on the server's side rather than a
 *  replace — a run records which step produced which invocation, and an id that
 *  churned under it would make that record point at nothing.
 *
 *  A step being CREATED has no id, and an edge onto it names it by INDEX. That
 *  index is meaningful only inside the request that sent it, which is why the
 *  response carries the whole saved graph with real ids and the caller adopts it
 *  rather than reconciling.
 *
 *  **A cycle is a 400 before anything is written.** A diamond — two paths
 *  joining — is not a cycle and saves fine. */
export async function saveChainAction(
  orgId: string,
  checkId: string,
  input: ChainInput,
): Promise<{ chain: Chain } | FormState> {
  try {
    return { chain: await saveChain(await clientFor("checks"), orgId, checkId, input) };
  } catch (error) {
    return toFormState(error);
  }
}
