"use server";

import { revalidatePath } from "next/cache";
import { clientFor } from "@/lib/root";
import { acceptInvite } from "@/lib/services/access";
import { toFormState, type FormState } from "../../(auth)/_form-state";

export async function acceptInviteAction(
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  try {
    await acceptInvite(await clientFor("access"), String(data.get("token") ?? ""));
  } catch (error) {
    return toFormState(error);
  }
  // The chrome now has a second org in it, and every screen reads the shell.
  revalidatePath("/", "layout");
  return { status: "ok" };
}
