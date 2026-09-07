"use client";

import { Building2, Check, ChevronsUpDown } from "@/components/utility";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/overlays";
import type { Me, MeOrg } from "@/lib/services/tenancy";
import { switchOrgAction } from "../_switch-actions";
import s from "./workspace-switcher.module.css";

/** A person can genuinely be in more than one org, and it is not an edge case.
 *
 *  Accepting an invitation gives you the firm AND leaves you your own personal
 *  org — registration is a chain that does not know an invitation exists, so it
 *  provisions one either way. `/v1/me` then returns two, both of which may have
 *  a workspace called `Personal`, which is exactly why `orgs[0]` was never
 *  going to hold.
 *
 *  When there is only one, this renders as a plain label. A solo hunter "has one
 *  and never thinks about it", and a dropdown with a single item is a control
 *  that teaches somebody there is a choice when there is not. */
export function OrgSwitcher({ me, current }: { me: Me; current: MeOrg }) {
  if (me.orgs.length < 2) {
    return (
      <span className={s.single}>
        <Building2 size={14} strokeWidth={1.7} className={s.icon} aria-hidden="true" />
        {current.name}
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={s.trigger}>
        <Building2 size={14} strokeWidth={1.7} className={s.icon} aria-hidden="true" />
        {current.name}
        <ChevronsUpDown size={13} strokeWidth={1.7} className={s.chevron} aria-hidden="true" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" side="bottom">
        <DropdownMenuLabel>Your organisations</DropdownMenuLabel>
        {me.orgs.map((o) => (
          <DropdownMenuItem
            key={o.org_id}
            onSelect={() => void switchOrgAction(o.org_id)}
          >
            <span className={s.tick} aria-hidden="true">
              {o.org_id === current.org_id ? <Check size={13} strokeWidth={2} /> : null}
            </span>
            <span className={s.name}>{o.name}</span>
            <span className={s.level}>{o.role}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
