"use client";

import { PanelLeft } from "@/components/utility";
import { Mock } from "@/components/display";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/overlays";
import { toggleSidebar, useSidebarHidden } from "@/lib/runtime";
import type { Shell } from "../_shell";
import { OrgSwitcher } from "./org-switcher";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { AccessBadge } from "./access-badge";
import s from "./topbar.module.css";

export function Topbar({ shell }: { shell: Shell }) {
  const sidebarHidden = useSidebarHidden();
  const action = sidebarHidden ? "Show sidebar" : "Hide sidebar";
  const { context } = shell;

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
          {context ? (
            <>
              {/* A switcher rather than a link, because a person can be in more
                  than one org — accepting an invitation leaves you your own AND
                  adds you to theirs. It renders as a plain label when there is
                  only one, which is the solo hunter's whole experience of it. */}
              <BreadcrumbItem>
                <OrgSwitcher me={shell.me} current={context.org} />
              </BreadcrumbItem>

              <BreadcrumbSeparator />

              {/* The switcher rather than a link, because it is the affordance a
                  solo hunter uses constantly and the one that makes the three
                  levels visible rather than theoretical. The ORG selector is the
                  rare one — a solo hunter has one and never thinks about it. */}
              <BreadcrumbItem>
                <WorkspaceSwitcher org={context.org} current={context.workspace} />
              </BreadcrumbItem>

              {/* This chip said `engagement` until 2026-09-07, from a `kind`
                  field no endpoint has ever sent. What the server does send for
                  a workspace is the caller's own level on it, which is the more
                  useful thing to have in the chrome anyway: it is the answer to
                  "why is this button not here". */}
              <BreadcrumbItem>
                <AccessBadge level={context.workspace.access} />
              </BreadcrumbItem>
            </>
          ) : (
            <BreadcrumbItem>
              <span className={s.settling}>
                {shell.empty === "no-org"
                  ? "Setting up your organisation…"
                  : "No engagement you can see"}
              </span>
            </BreadcrumbItem>
          )}

          {shell.fixtures ? (
            <BreadcrumbItem>
              <Mock
                note="You are signed in as a fixture persona, so every name, count and record on this screen is invented. Sign out to use a real account."
                className={s.mock}
              />
            </BreadcrumbItem>
          ) : null}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
