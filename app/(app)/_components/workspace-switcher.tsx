"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Target as WorkspaceIcon } from "@/components/utility";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/overlays";
import type { MeOrg, MeWorkspace } from "@/lib/services/tenancy";
import s from "./workspace-switcher.module.css";

/** Every workspace in this list is one the caller can see.
 *
 *  There is no filtering to do here and that is the point: the server omits a
 *  workspace the caller has no grant on, and this component must never
 *  reconstruct the list from anywhere else. A count that includes an invisible
 *  engagement is the same disclosure as showing its name. */
export function WorkspaceSwitcher({ org, current }: { org: MeOrg; current: MeWorkspace }) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={s.trigger}>
        <WorkspaceIcon size={14} strokeWidth={1.7} className={s.icon} aria-hidden="true" />
        {current.name}
        <ChevronsUpDown size={13} strokeWidth={1.7} className={s.chevron} aria-hidden="true" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" side="bottom">
        <DropdownMenuLabel>{org.name}</DropdownMenuLabel>
        {org.workspaces.map((w) => (
          <DropdownMenuItem
            key={w.workspace_id}
            onSelect={() => router.push(`/home/overview?workspace=${w.workspace_id}`)}
          >
            <span className={s.tick} aria-hidden="true">
              {w.workspace_id === current.workspace_id ? (
                <Check size={13} strokeWidth={2} />
              ) : null}
            </span>
            <span className={s.name}>{w.name}</span>
            <span className={s.level}>{w.access}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/settings/workspaces")}>
          All engagements
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
