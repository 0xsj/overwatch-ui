import type { ReactNode } from "react";
import { AppShell } from "./_components/app-shell";
import { loadShell } from "./_shell";

/** Never prerendered, and the build error is the smaller reason.
 *
 *  The chrome answers with an ACCOUNT, an org and a workspace. Baking that into
 *  static HTML puts one tenant's names into a file every other tenant is served
 *  — which is the failure §Scope cares most about, where a grant of `none` means
 *  an engagement is not visible rather than refused.
 *
 *  It surfaced as a build failure the first time NEXT_PUBLIC_API_URL pointed at
 *  the real server. Against fixtures it had been building happily, with one
 *  fixture account's org baked into all of them. */
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const shell = await loadShell();
  return <AppShell shell={shell}>{children}</AppShell>;
}
