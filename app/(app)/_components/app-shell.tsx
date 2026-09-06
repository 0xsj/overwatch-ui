"use client";

import type { ReactNode } from "react";
import type { ShellContext } from "@/lib/services/shell";
import { useSidebarHidden, useSidebarShortcut } from "@/lib/runtime";
import { Rail } from "./rail";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import s from "./app-shell.module.css";

export function AppShell({ context, children }: { context: ShellContext; children: ReactNode }) {
  const sidebarHidden = useSidebarHidden();
  useSidebarShortcut();

  return (
    <div className={s.app} data-sidebar-hidden={sidebarHidden || undefined}>
      <a href="#content" className={s.skip}>Skip to content</a>
      <Rail />
      <Sidebar account={context.account} />
      <div className={s.main}>
        <Topbar org={context.org} target={context.target} />
        <div className={s.body}>
          <main id="content" className={s.wrap} tabIndex={-1}>{children}</main>
        </div>
      </div>
    </div>
  );
}
