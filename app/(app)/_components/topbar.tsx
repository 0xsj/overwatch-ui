"use client";

import Link from "next/link";
import { Building2, PanelLeft, Target as TargetIcon } from "lucide-react";
import { Chip } from "@/components/display";
import type { Org, Target } from "@/lib/services/shell";
import { toggleSidebar, useSidebarHidden } from "@/lib/runtime";
import s from "./topbar.module.css";

const KIND_TONE = { engagement: "warn", programme: "info", personal: "neutral" } as const;

export function Topbar({ org, target }: { org: Org; target: Target }) {
  const sidebarHidden = useSidebarHidden();
  const action = sidebarHidden ? "Show sidebar" : "Hide sidebar";

  return (
    <header className={s.top}>
      <button
        type="button"
        className={s.panel}
        onClick={toggleSidebar}
        aria-label={action}
        aria-expanded={!sidebarHidden}
      >
        <PanelLeft size={15} strokeWidth={1.7} aria-hidden="true" />
        <span className={s.tip} aria-hidden="true">{action}&nbsp;&nbsp;^Z</span>
      </button>

      <nav className={s.crumbs} aria-label="Where you are">
        <Link href="/settings/organisation" className={s.crumb}>
          <Building2 size={14} strokeWidth={1.7} className={s.icon} aria-hidden="true" />
          {org.name}
        </Link>

        <span className={s.slash} aria-hidden="true">/</span>

        <Link href="/home/targets" className={s.crumb}>
          <TargetIcon size={14} strokeWidth={1.7} className={s.icon} aria-hidden="true" />
          {target.name}
        </Link>

        <Chip
          tone={KIND_TONE[target.kind]}
          mono
          className={s.kind}
          title={target.ends_at ? `Runs to ${target.ends_at}.` : undefined}
        >
          {target.kind}
        </Chip>
      </nav>
    </header>
  );
}
