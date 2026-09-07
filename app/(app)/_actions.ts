"use server";

import { redirect } from "next/navigation";
import { clientFor, endSession } from "@/lib/root";
import { signOut } from "@/lib/services/identity";

/** The cookie goes first, and on purpose.
 *
 *  `DELETE /v1/sessions/current` answers 204 with or without a bearer, so there
 *  is no failure worth blocking on — but a server that is down is a reason the
 *  call throws, and being unable to reach the server must not leave somebody
 *  signed in on the machine in front of them. */
export async function signOutAction(): Promise<void> {
  const client = await clientFor("identity");
  await endSession();
  try {
    await signOut(client);
  } catch {
    // The local session is already gone. The remote one expires on its own.
  }
  redirect("/sign-in");
}
