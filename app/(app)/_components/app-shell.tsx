"use client";

import type { ReactNode } from "react";
import type { Shell } from "../_shell";
import { useSidebarHidden, useSidebarShortcut } from "@/lib/runtime";
import { Rail } from "./rail";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { VerifyBanner } from "./verify-banner";
import s from "./app-shell.module.css";

export function AppShell({ shell, children }: { shell: Shell; children: ReactNode }) {
  const sidebarHidden = useSidebarHidden();
  useSidebarShortcut();

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
