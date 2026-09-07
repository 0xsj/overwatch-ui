"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/chrome";
import { NavLink } from "@/components/navigation";
import { AccountMenu } from "./account-menu";
import { useSidebarHidden } from "@/lib/runtime";
import { Heading, Text } from "@/components/typography";
import { sectionFor } from "../_navigation";
import s from "./sidebar.module.css";

export function Sidebar({ email, name }: { email: string; name: string }) {
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
          <NavLink key={href} asChild active={href === pathname && "page"}>
            <Link href={href} className={s.link}>{label}</Link>
          </NavLink>
        ))}
      </nav>

      <div className={s.foot}>
        <AccountMenu email={email} name={name} />
        <ThemeToggle className={s.theme} />
      </div>
    </aside>
  );
}
