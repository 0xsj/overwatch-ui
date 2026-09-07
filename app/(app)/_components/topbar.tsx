"use client";

import Link from "next/link";
import { Building2, PanelLeft, Target as TargetIcon } from "@/components/utility";
import { Badge, Mock } from "@/components/display";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/overlays";
import type { Org, Target } from "@/lib/services/shell";
import { toggleSidebar, useSidebarHidden } from "@/lib/runtime";
import s from "./topbar.module.css";

const KIND_TONE = { engagement: "warn", programme: "info", personal: "neutral" } as const;

export function Topbar({
  org,
  target,
  fixtures,
}: {
  org: Org;
  target: Target;
  fixtures: boolean;
}) {
  const sidebarHidden = useSidebarHidden();
  const action = sidebarHidden ? "Show sidebar" : "Hide sidebar";

  return (
    <header className={s.top}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={s.panel}
            onClick={toggleSidebar}
            aria-label={action}
            aria-expanded={!sidebarHidden}
          >
            <PanelLeft size={15} strokeWidth={1.7} aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start">
          {action}&nbsp;&nbsp;<kbd className={s.kbd}>^Z</kbd>
        </TooltipContent>
      </Tooltip>

      <Breadcrumb className={s.crumbs}>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/settings/organisation">
                <Building2 size={14} strokeWidth={1.7} className={s.icon} aria-hidden="true" />
                {org.name}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>

          <BreadcrumbSeparator />

          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/home/targets">
                <TargetIcon size={14} strokeWidth={1.7} className={s.icon} aria-hidden="true" />
                {target.name}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>

          <BreadcrumbItem>
            <Badge
              tone={KIND_TONE[target.kind]}
              mono
              className={s.kind}
              title={target.ends_at ? `Runs to ${target.ends_at}.` : undefined}
            >
              {target.kind}
            </Badge>
          </BreadcrumbItem>

          {fixtures ? (
            <BreadcrumbItem>
              <Mock
                note="This build has no server configured, so every name, count and record in it comes from a fixture."
                className={s.mock}
              />
            </BreadcrumbItem>
          ) : null}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
