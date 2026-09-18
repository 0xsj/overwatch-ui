"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Mark } from "@/components/chrome";
import { NavLink } from "@/components/navigation";
import { ChevronDown } from "@/components/utility";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/overlays";
import { HOME, navHref, sectionFor, sectionsFor, type NavSection } from "../_navigation";
import { useShell } from "../_hooks";
import s from "./rail.module.css";

export function Rail() {
  const pathname = usePathname();
  const active = sectionFor(pathname).id;
  const shell = useShell();
  const role = shell?.context?.org.role ?? (shell?.me.orgs.length && shell.me.orgs.every((org) => org.role === "client") ? "client" : undefined);
  const sections = sectionsFor(role);
  const workspace = shell?.context?.workspace.workspace_id;
  const legacy = sections.filter((section) => section.id !== "investigation" && section.id !== "settings");
  const [expansion, setExpansion] = useState<{ path: string; open: boolean } | null>(null);
  const legacyActive = legacy.some((section) => section.id === active);
  const open = expansion?.path === pathname ? expansion.open : legacyActive;

  const item = ({ id, label, sub, Icon, pages }: NavSection) => <Tooltip key={id}>
    <TooltipTrigger asChild>
      <NavLink asChild active={id === active}>
        <Link href={navHref(pages[0].href, workspace)} className={s.button} aria-label={label}>
          <Icon size={17} strokeWidth={1.7} aria-hidden="true" />
        </Link>
      </NavLink>
    </TooltipTrigger>
    <TooltipContent side="right" sideOffset={10} className={s.tip}><span className={s.tipName}>{label}</span><span className={s.tipSub}>{sub}</span></TooltipContent>
  </Tooltip>;

  return <nav className={s.rail} aria-label="Sections">
    <Link href={HOME} className={s.logo} aria-label="Overwatch"><Mark /></Link>
    {role === "client" ? sections.map(item) : <>
      {sections.filter((section) => section.id === "investigation").map(item)}
      <Tooltip>
        <TooltipTrigger asChild><button type="button" className={s.button} aria-label="Collection and legacy views" aria-expanded={open} aria-controls="legacy-sections" data-current={legacyActive || undefined} onClick={() => setExpansion({ path: pathname, open: !open })}><ChevronDown size={17} aria-hidden="true" className={open ? s.expanded : undefined} /></button></TooltipTrigger>
        <TooltipContent side="right"><span className={s.tipName}>Collection & legacy views</span><span className={s.tipSub}>Tool settings, activity, entities, and security research.</span></TooltipContent>
      </Tooltip>
      {open ? <div className={s.legacy} id="legacy-sections" aria-label="Collection and legacy sections">{legacy.map(item)}</div> : null}
      <div className={s.settings}>{sections.filter((section) => section.id === "settings").map(item)}</div>
    </>}
  </nav>;
}
