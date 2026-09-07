"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mark } from "@/components/chrome";
import { NavLink } from "@/components/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/overlays";
import { HOME, SECTIONS, sectionFor } from "../_navigation";
import s from "./rail.module.css";

export function Rail() {
  const active = sectionFor(usePathname()).id;

  return (
    <nav className={s.rail} aria-label="Sections">
      <Link href={HOME} className={s.logo} aria-label="Overwatch">
        <Mark />
      </Link>

      {SECTIONS.map(({ id, label, sub, Icon, pages }) => (
        <Tooltip key={id}>
          <TooltipTrigger asChild>
            {/* `true`, not `page`: the rail marks the current SECTION, and
                /findings/report is not the Findings link's page. */}
            <NavLink asChild active={id === active}>
              <Link href={pages[0].href} className={s.button} aria-label={label}>
                <Icon size={17} strokeWidth={1.7} aria-hidden="true" />
              </Link>
            </NavLink>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10} className={s.tip}>
            <span className={s.tipName}>{label}</span>
            <span className={s.tipSub}>{sub}</span>
          </TooltipContent>
        </Tooltip>
      ))}
    </nav>
  );
}
