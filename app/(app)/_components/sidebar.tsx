"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/chrome";
import { useSidebarHidden } from "@/lib/runtime";
import { Heading, Text } from "@/components/typography";
import type { Account } from "@/lib/services/shell";
import { sectionFor } from "../_navigation";
import s from "./sidebar.module.css";

function initials(name: string): string {
  const parts = name.split(/[\s.]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "");
}

export function Sidebar({ account }: { account: Account }) {
  const pathname = usePathname();
  const section = sectionFor(pathname);
  const hidden = useSidebarHidden();

  return (
    <aside className={s.sidebar} aria-label={section.label} inert={hidden}>
      <div className={s.head}>
        <Heading level={2} scale="h3">{section.label}</Heading>
        <Text size="xs" tone="tertiary" className={s.sub}>{section.sub}</Text>
      </div>

      <nav className={s.nav} aria-label={`${section.label} pages`}>
        {section.pages.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={s.link}
            aria-current={href === pathname ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className={s.foot}>
        <span className={s.avatar} aria-hidden="true">{initials(account.name).toUpperCase()}</span>
        <Text size="xs" tone="tertiary" className={s.who} title={account.email}>
          {account.email}
        </Text>
        <ThemeToggle className={s.theme} />
      </div>
    </aside>
  );
}
