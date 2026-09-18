"use server";

import { revalidatePath } from "next/cache";
import { clientFor } from "@/lib/root";
import { addRule, supersedeRule } from "@/lib/services/targets";
import type { RuleInput } from "@/lib/services/targets";
import { KINDS, type Kind } from "@/lib/kernel";
import {
  decideAttribution, judgeFragment, markRead, readFragment,
} from "@/lib/services/entities";
import type { ClaimState, FragmentDetail, JudgementState } from "@/lib/services/entities";
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

/** The drawer's own read, and the reason it needs one: the table row is a
 *  `Fragment`, and BOTH EDGE KINDS live on the detail. `decisions/0040` gave the
 *  graph its second kind — a derivation, *"read out of"* — and a drawer built on
 *  the list row can only ever show the first. */
export async function readFragmentAction(
  workspaceId: string,
  fragmentId: string,
): Promise<{ detail: FragmentDetail } | FormState> {
  try {
    return {
      detail: await readFragment(await clientFor("entities"), workspaceId, fragmentId),
    };
  } catch (error) {
    return toFormState(error);
  }
}

/** ADMIN — `0019` puts "edit scope" at that rung in as many words. 201.
 *
 *  A kind decides its own gate: nothing is ever spawned against a repository,
 *  so `kinds` and `gate` cannot disagree and the server rejects it when they
 *  do. `tools` qualifies a SPAWN rule only — a range in scope for passive
 *  collection is not thereby in scope for a loud scan — and is absent on a
 *  claim rule rather than empty or wildcard. */
export async function addRuleAction(
  workspaceId: string,
  targetId: string,
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  const gate = String(data.get("gate") ?? "spawn") as RuleInput["gate"];
  const kinds = data.getAll("kinds").map(String).filter((k): k is Kind =>
    (KINDS as readonly string[]).includes(k),
  );
  const tools = data.getAll("tools").map(String) as RuleInput["tools"];
  try {
    await addRule(await clientFor("targets"), workspaceId, targetId, {
      pattern: String(data.get("pattern") ?? "").trim(),
      polarity: String(data.get("polarity") ?? "include") as RuleInput["polarity"],
      gate,
      kinds,
      // ABSENT on a claim rule. There are no processes on that gate, so an
      // empty array would be a claim about intensity nobody made.
      tools: gate === "spawn" ? tools : undefined,
    });
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/surface/scope");
  return { status: "ok" };
}

/** DELETE at the wire and a SUPERSEDE underneath — `decisions/0030`. There is
 *  no edit and the row keeps its id forever, because an invocation's refusal
 *  and a finding's scope proof both still resolve it afterwards. 204. */
export async function supersedeRuleAction(
  workspaceId: string,
  targetId: string,
  ruleId: string,
): Promise<FormState> {
  try {
    await supersedeRule(await clientFor("targets"), workspaceId, targetId, ruleId);
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/surface/scope");
  return { status: "ok" };
}
