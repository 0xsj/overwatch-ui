"use server";

import { revalidatePath } from "next/cache";
import { clientFor } from "@/lib/root";
import { addMapping, addTool, archiveTool, promoteMapping } from "@/lib/services/tooling";
import type { Intensity } from "@/lib/services/tooling";
import { normaliseKind, type FeedKind } from "@/lib/kernel";
import { toFormState, type FormState } from "../../(auth)/_form-state";

const str = (d: FormData, k: string) => String(d.get(k) ?? "").trim();

/** A feed field, and EMPTY MEANS ABSENT.
 *
 *  Not `"*"` and not `"any"`. A tool with no `consumes` is a SOURCE — seeded
 *  from the target's scope rather than fed by another tool — and a wildcard
 *  would say the opposite: that anything at all may flow into it. The server
 *  reads `""` as none for exactly this reason, so the field is sent empty and
 *  never omitted-by-accident. */
function feed(raw: string): FeedKind | undefined {
  if (!raw) return undefined;
  if (raw === "finding") return "finding";
  return normaliseKind(raw) ?? undefined;
}

/** The exit codes, as typed.
 *
 *  `0` alone is the default and is what an empty box means. Anything else is a
 *  claim about a specific program — nuclei exits 1 when it finds nothing — and
 *  getting it wrong turns a real answer into a failure, so the field is offered
 *  rather than inferred. */
function codes(raw: string): number[] | undefined {
  const parsed = raw
    .split(/[,\s]+/)
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 255);
  return parsed.length > 0 ? parsed : undefined;
}

export async function addToolAction(
  orgId: string,
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  try {
    await addTool(await clientFor("tooling"), orgId, {
      name: str(data, "name"),
      argv: str(data, "argv"),
      intensity: str(data, "intensity") as Intensity,
      consumes: feed(str(data, "consumes")),
      produces: feed(str(data, "produces")),
      success_exit_codes: codes(str(data, "success_exit_codes")),
    });
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/tools/installed");
  return { status: "ok" };
}

/** 409 while a live check still runs it, **and the refusal names the checks**.
 *  That message is the whole UI for this failure: "cannot archive" with no
 *  reason is a dead end, and the fix — edit those chains first — is the
 *  caller's. So it is returned rather than swallowed. */
export async function archiveToolAction(orgId: string, toolId: string): Promise<FormState> {
  try {
    await archiveTool(await clientFor("tooling"), orgId, toolId);
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/tools/installed");
  return { status: "ok" };
}

/** Adding a version, which is also what a CORRECTION is.
 *
 *  A mapping is never edited: an observation cites the version that produced
 *  it, so an expression moving under a citation would make that lineage a lie.
 *  `promote` decides whether the new version goes live immediately or sits as a
 *  draft — and either way the old one is retired rather than gone. */
export async function addMappingAction(
  orgId: string,
  toolId: string,
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  try {
    await addMapping(await clientFor("tooling"), orgId, toolId, {
      field: str(data, "field"),
      expression: str(data, "expression"),
      promote: data.get("promote") === "on",
    });
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/tools/installed");
  return { status: "ok" };
}

export async function promoteMappingAction(
  orgId: string,
  toolId: string,
  mappingId: string,
): Promise<FormState> {
  try {
    await promoteMapping(await clientFor("tooling"), orgId, toolId, mappingId);
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/tools/installed");
  return { status: "ok" };
}
