"use client";

import Link from "next/link";
import { Avatar } from "@/components/display";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/overlays";
import { Text } from "@/components/typography";
import { signOutAction } from "../_actions";
import s from "./account-menu.module.css";

const PAGES = [
  { href: "/account/profile", label: "Your profile" },
  { href: "/account/preferences", label: "Preferences" },
  { href: "/account/security", label: "Security" },
  { href: "/account/activity", label: "Your record" },
] as const;


export function AccountMenu({ email, name }: { email: string; name: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={s.trigger} aria-label={`Account — ${email}`}>
        <Avatar name={name} />
        <Text as="span" size="xs" tone="tertiary" className={s.who}>{email}</Text>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" side="top">
        <DropdownMenuLabel>{name}</DropdownMenuLabel>
        {PAGES.map(({ href, label }) => (
          <DropdownMenuItem key={href} asChild>
            <Link href={href}>{label}</Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => void signOutAction()}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
