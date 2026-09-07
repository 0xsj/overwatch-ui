import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/kernel";
import s from "./badge.module.css";
import { badgeVariants, type BadgeVariants } from "./badge.variants";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  BadgeVariants & { glyph?: ReactNode };

export function Badge({ glyph, tone, mono, className, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, mono }), className)} {...props}>
      {glyph ? <span className={s.glyph} aria-hidden="true">{glyph}</span> : null}
      {children}
    </span>
  );
}
