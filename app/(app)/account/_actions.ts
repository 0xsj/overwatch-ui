"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { anonymousClient, clientFor, endSession } from "@/lib/root";
import {
  changePassword,
  closeAccount,
  listSessions,
  rename,
  requestEmailChange,
  requestVerification,
  revokeSession,
  type MeSession,
} from "@/lib/services/identity";
import { toFormState, type FormState } from "../../(auth)/_form-state";

const str = (d: FormData, k: string) => String(d.get(k) ?? "");

/** 202 for an address that exists, one that does not, and one that is not an
 *  address — so the copy cannot say "sent" conditionally. */
export async function resendVerificationAction(
  email: string,
  _prev: FormState,
): Promise<FormState> {
  try {
    await requestVerification(anonymousClient("identity"), email);
    return { status: "ok" };
  } catch (error) {
    return toFormState(error);
  }
}

/** No current password, and that is deliberate. A display name is not a
 *  credential and nothing recovers through it; asking for a password to change
 *  it would train people to type their password into any form that asks. */
export async function renameAction(_prev: FormState, data: FormData): Promise<FormState> {
  try {
    await rename(await clientFor("identity"), { name: str(data, "name") });
  } catch (error) {
    return toFormState(error);
  }
  // The response does not echo the new name, so there is nothing to render from
  // it. Re-read instead of trusting a value the server did not send back.
  revalidatePath("/", "layout");
  return { status: "ok" };
}

/** Ends every OTHER session and keeps this one, so the caller stays signed in
 *  with the same bearer. Do not sign them out. */
export async function changePasswordAction(
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  try {
    await changePassword(await clientFor("identity"), {
      current_password: str(data, "current_password"),
      password: str(data, "password"),
    });
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/account/security");
  return { status: "ok" };
}

/** Prove-then-switch. This answers 202 and changes NOTHING — so the caller gets
 *  back the address it is waiting on, and renders that as pending rather than as
 *  current. */
export async function requestEmailChangeAction(
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  const email = str(data, "email").trim();
  try {
    await requestEmailChange(await clientFor("identity"), {
      email,
      current_password: str(data, "current_password"),
    });
  } catch (error) {
    return toFormState(error);
  }
  return { status: "ok", pendingEmail: email };
}

export async function listSessionsAction(): Promise<MeSession[]> {
  return listSessions(await clientFor("identity"));
}

/** A session that is not yours answers 404, the same as one that does not
 *  exist. No error state distinguishes them. */
export async function revokeSessionAction(id: string): Promise<FormState> {
  try {
    await revokeSession(await clientFor("identity"), id);
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/account/security");
  return { status: "ok" };
}

/** The response signs the caller out — every session goes, including the one
 *  that made the request — so the local cookie goes too and the route leaves the
 *  application entirely. Re-fetching anything afterwards would 401.
 *
 *  The 409 is the interesting path: it NAMES the orgs where somebody would be
 *  stranded, and that message is the only place the person is told what to do.
 *  It is returned unchanged. */
export async function closeAccountAction(
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  try {
    await closeAccount(await clientFor("identity"), str(data, "current_password"));
  } catch (error) {
    return toFormState(error);
  }
  await endSession();
  redirect("/");
}
