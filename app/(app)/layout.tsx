import type { ReactNode } from "react";
import { QueryProvider } from "@/lib/query";
import { AppShell } from "./_components/app-shell";
import { loadShell } from "./_shell";

/** Never prerendered, and the build error is the smaller reason.
 *
 *  The chrome answers with an ACCOUNT, an org and a workspace. Baking that into
 *  static HTML puts one tenant's names into a file every other tenant is served
 *  — which is the failure §Scope cares most about, where a grant of `none` means
 *  an engagement is not visible rather than refused. */
export const dynamic = "force-dynamic";

/** The one read still done on the server, and it is here for two reasons that
 *  are not "server components are nice".
 *
 *  It is the AUTH GATE: `loadShell` redirects to the door on a 401, and doing
 *  that in the browser means an unauthenticated visitor renders the chrome,
 *  then a page, then bounces — three frames of somebody else's furniture.
 *
 *  And it SEEDS the cache. Every screen reads `keys.shell()` for the open
 *  engagement; without a seed each one would open by asking for the answer the
 *  chrome is already holding, and the switcher would flicker on every
 *  navigation. Seeded once here, the rest of the application is client-side. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const shell = await loadShell();
  return (
    <QueryProvider>
      <AppShell shell={shell}>{children}</AppShell>
    </QueryProvider>
  );
}
