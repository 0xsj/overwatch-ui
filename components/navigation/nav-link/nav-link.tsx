import { Slot } from "radix-ui";
import type { AnchorHTMLAttributes } from "react";
import { cn } from "@/lib/kernel";
import s from "./nav-link.module.css";

/** The ARIA-valid values, and they are not interchangeable. `page` means this IS
 *  the page; `true` means current without a more specific relationship — the
 *  section a page belongs to, or a selected root. */
export type NavLinkActive = boolean | "page" | "step" | "location" | "date" | "time";

export type NavLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  /** Bring your own router link. */
  asChild?: boolean;
  /** Decided by the caller. This component does not read the router — see doc.ts. */
  active?: NavLinkActive;
};

export function NavLink({ className, asChild = false, active, ...props }: NavLinkProps) {
  const Comp = asChild ? Slot.Root : "a";
  return (
    <Comp
      aria-current={active === true ? "true" : active || undefined}
      data-active={active ? "" : undefined}
      className={cn(s.link, className)}
      {...props}
    />
  );
}
