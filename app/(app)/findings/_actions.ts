"use server";

import { clientFor } from "@/lib/root";
import { decideFinding, reassessFinding } from "@/lib/services/findings";
import type { FindingState, Severity } from "@/lib/services/findings";
import { issueReport, toggleSection } from "@/lib/services/reports";
import { toFormState, type FormState } from "../../(auth)/_form-state";

/** `reason` is REQUIRED for `dismissed` and optional for `resolved` — a fix
 *  needs no argument, because the thing is gone.
 *
 *  There is no transition back to `open`, and the type says so rather than the
 *  server having to: a finding reopens by being SEEN again, which is a fact
 *  about the estate rather than an opinion. */
export async function decideFindingAction(
  workspaceId: string,
  findingId: string,
  state: Exclude<FindingState, "open">,
  reason?: string,
): Promise<FormState> {
  try {
    await decideFinding(await clientFor("findings"), workspaceId, findingId, { state, reason });
  } catch (error) {
    return toFormState(error);
  }
  return { status: "ok" };
}

/** `basis` is REQUIRED. Replacing somebody else's assessment is a disagreement,
 *  and one with no stated reason records that somebody disagreed without saying
 *  why they were right — which is the half a client's report would need. */
export async function reassessFindingAction(
  workspaceId: string,
  findingId: string,
  severity: Severity,
  basis: string,
): Promise<FormState> {
  try {
    await reassessFinding(await clientFor("findings"), workspaceId, findingId, { severity, basis });
  } catch (error) {
    return toFormState(error);
  }
  return { status: "ok" };
}

/** Turning `coverage` off is a 400 whose message IS the thesis, so the refusal
 *  is returned rather than swallowed — but the screen does not offer that
 *  toggle at all, which is the better half of the same rule. */
export async function toggleSectionAction(
  workspaceId: string,
  reportId: string,
  section: string,
  enabled: boolean,
): Promise<FormState> {
  try {
    await toggleSection(await clientFor("reports"), workspaceId, reportId, section, enabled);
  } catch (error) {
    return toFormState(error);
  }
  return { status: "ok" };
}

/** NOT UNDOABLE. It freezes bytes somebody may already hold. */
export async function issueReportAction(
  workspaceId: string,
  reportId: string,
): Promise<FormState> {
  try {
    await issueReport(await clientFor("reports"), workspaceId, reportId);
  } catch (error) {
    return toFormState(error);
  }
  return { status: "ok" };
}
