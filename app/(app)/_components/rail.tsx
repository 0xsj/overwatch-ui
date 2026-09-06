"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mark } from "@/components/chrome";
import { HOME, SECTIONS, sectionFor } from "../_navigation";
import s from "./rail.module.css";

export function Rail() {
  const active = sectionFor(usePathname()).id;

  return (
    <nav className={s.rail} aria-label="Sections">
      <Link href={HOME} className={s.logo} aria-label="Overwatch">
        <Mark />
      </Link>

      {SECTIONS.map(({ id, label, Icon, pages }) => (
        <Link
          key={id}
          href={pages[0].href}
          className={s.button}
          aria-label={label}
          aria-current={id === active ? "true" : undefined}
        >
          <Icon size={17} strokeWidth={1.7} aria-hidden="true" />
          <span className={s.tip} aria-hidden="true">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
