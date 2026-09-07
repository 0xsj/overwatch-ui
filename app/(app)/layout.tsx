import type { ReactNode } from "react";
import { AppShell } from "./_components/app-shell";
import { loadShell } from "./_shell";

/** Never prerendered, and the build error is the smaller reason.
 *
 *  The chrome answers with an ACCOUNT, an org and a workspace. Baking that into
 *  static HTML puts one tenant's names into a file every other tenant is served
 *  — which is the failure §Scope cares most about, where a grant of `none` means
 *  an engagement is not visible rather than refused. */
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const shell = await loadShell();
  return <AppShell shell={shell}>{children}</AppShell>;
}
