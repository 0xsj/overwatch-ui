"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/chrome";
import { NavLink } from "@/components/navigation";
import { AccountMenu } from "./account-menu";
import { useSidebarHidden } from "@/lib/runtime";
import { Heading, Text } from "@/components/typography";
import { navHref, sectionFor, sectionsFor } from "../_navigation";
import { useShell } from "../_hooks";
import s from "./sidebar.module.css";

export function Sidebar({ email, name }: { email: string; name: string }) {
  const pathname = usePathname();
  const hidden = useSidebarHidden();
  /* The section's pages, narrowed to what this role can reach. A `client` gets
     the report and no siblings — the rest answer 404 by design. */
  const shell = useShell();
  const role = shell?.context?.org.role ?? (shell?.me.orgs.length && shell.me.orgs.every((org) => org.role === "client") ? "client" : undefined);
  const allowed = sectionsFor(role);
  const here = sectionFor(pathname);
  /* NO FALLBACK to the section the URL names. A client who pastes a link into
     `/home` would otherwise get Home's four links in the sidebar, every one of
     which answers 404 — a menu of doors that are all walls. When the current
     section is not theirs, the nav offers what is. */
  const section = allowed.find((x) => x.id === here.id) ?? allowed[0] ?? here;

  const pages = section.id === "investigation" && !shell?.context ? section.pages.filter((page) => page.href === "/investigation") : section.pages;

  return (
    <aside className={s.sidebar} aria-label={section.label} inert={hidden}>
      <div className={s.head}>
        <Heading level={2} scale="h3">{section.label}</Heading>
        <Text size="xs" tone="tertiary" className={s.sub}>{section.sub}</Text>
      </div>

      <nav className={s.nav} aria-label={`${section.label} pages`}>
        {pages.map(({ href: path, label }) => {
          const href = navHref(path, shell?.context?.workspace.workspace_id);
          return (
            <NavLink key={path} asChild active={href === pathname ? "page" : pathname.startsWith(`${href}/`) && path !== "/investigation"}>
              <Link href={href} className={s.link}>{label}</Link>
            </NavLink>
          );
        })}
      </nav>

      <div className={s.foot}>
        <AccountMenu email={email} name={name} />
        <ThemeToggle className={s.theme} />
      </div>
    </aside>
  );
}
