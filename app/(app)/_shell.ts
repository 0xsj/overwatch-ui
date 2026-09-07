import { redirect } from "next/navigation";
import { clientFor, usingFixtures } from "@/lib/root";
import {
  emptyReason,
  getMe,
  listMembers,
  selectShellContext,
  type Me,
  type Member,
  type ShellContext,
} from "@/lib/services/tenancy";
import { isAppError } from "@/lib/kernel";

export type Shell = {
  me: Me;
  /** `null` when there is nowhere to be — see `empty` for which nowhere. */
  context: ShellContext | null;
  empty: "no-org" | "no-workspace" | null;
  /** `/v1/me` carries no display name; the members list does. Falls back to the
   *  local part of the address, which is what the server itself does when
   *  somebody registers without a name. */
  name: string;
  members: Member[];
  fixtures: boolean;
};

/** One read for the chrome, on every page under `(app)`.
 *
 *  Two calls rather than one, and the second is deliberate: `/v1/me` answers
 *  who and where and has no display name in it, and the members list is where
 *  names live — `ALIGNMENT.md` says the grid "needs identity's directory to
 *  render names". Both are cheap and the members screen wants the second
 *  anyway. It becomes wrong at a firm with hundreds of members, and the fix
 *  then is a `/v1/me` that carries a name, not a cache here. */
export async function loadShell(wanted?: { org?: string; workspace?: string }): Promise<Shell> {
  const client = await clientFor("tenancy");

  let me: Me;
  try {
    me = await getMe(client);
  } catch (error) {
    // 401 is not an error screen. It is the answer to "who is asking" when
    // nobody is, and the destination is the door.
    if (isAppError(error) && error.status === 401) redirect("/sign-in");
    throw error;
  }

  const context = selectShellContext(me, wanted);

  let members: Member[] = [];
  if (context) {
    try {
      members = await listMembers(client, context.org.org_id);
    } catch {
      // A members list the caller may not read is not a reason to fail the
      // chrome. The screen that needs it asks again and renders its own answer.
      members = [];
    }
  }

  const self = members.find((m) => m.account_id === me.account_id);

  return {
    me,
    context,
    empty: emptyReason(me),
    name: self?.name ?? me.email.slice(0, me.email.indexOf("@")),
    members,
    fixtures: await usingFixtures("tenancy"),
  };
}
