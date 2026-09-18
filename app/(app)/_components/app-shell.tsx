"use client";

import { useShell } from "../_hooks";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { keys } from "@/lib/query";
import { shellQuery } from "../_queries";
import type { Shell } from "../_shell";
import { useSidebarHidden, useSidebarShortcut } from "@/lib/runtime";
import { Rail } from "./rail";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { VerifyBanner } from "./verify-banner";
import s from "./app-shell.module.css";

export function AppShell({ shell: seed, children }: { shell: Shell; children: ReactNode }) {
  const sidebarHidden = useSidebarHidden();
  useSidebarShortcut();

  /* SEEDED, not fetched. The layout already has this answer, so `initialData`
     puts it in the cache under the key every screen reads — one request
     becomes zero, and the chrome does not flash between navigations.
     `staleTime: Infinity` because the shell changes only when somebody
     switches engagement or their access changes, and both of those invalidate
     this key explicitly rather than waiting for a clock. */
  useQuery({
    queryKey: keys.shell(),
    queryFn: shellQuery,
    initialData: seed,
    staleTime: Infinity,
  });

  const shell = useShell() ?? seed;

  return (
    <div className={s.app} data-sidebar-hidden={sidebarHidden || undefined}>
      <a href="#content" className={s.skip}>Skip to content</a>
      <Rail />
      <Sidebar email={shell.me.email} name={shell.name} />
      <div className={s.main}>
        <Topbar shell={shell} />
        <div className={s.body}>
          <main id="content" className={s.wrap} tabIndex={-1}>
            {shell.me.verified ? null : <VerifyBanner email={shell.me.email} />}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
