"use client";

import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/overlays";
import { Text } from "@/components/typography";
import type { Account } from "@/lib/services/shell";
import s from "./account-menu.module.css";

const PAGES = [
  { href: "/account/profile", label: "Your profile" },
  { href: "/account/preferences", label: "Preferences" },
  { href: "/account/security", label: "Security" },
  { href: "/account/activity", label: "Your record" },
] as const;

function initials(name: string): string {
  const parts = name.split(/[\s.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase();
}

export function AccountMenu({ account }: { account: Account }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={s.trigger} aria-label={`Account — ${account.email}`}>
        <span className={s.avatar} aria-hidden="true">{initials(account.name)}</span>
        <Text as="span" size="xs" tone="tertiary" className={s.who}>{account.email}</Text>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" side="top">
        <DropdownMenuLabel>{account.name}</DropdownMenuLabel>
        {PAGES.map(({ href, label }) => (
          <DropdownMenuItem key={href} asChild>
            <Link href={href}>{label}</Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {/* No session exists to end, and an item that does nothing is worse than
            one that is plainly not ready. It is disabled and says why. */}
        <DropdownMenuItem destructive disabled>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
