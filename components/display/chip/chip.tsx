import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/kernel";
import s from "./chip.module.css";
import { chipVariants, type ChipVariants } from "./chip.variants";

export type ChipProps = HTMLAttributes<HTMLSpanElement> &
  ChipVariants & { glyph?: ReactNode };

export function Chip({ glyph, tone, mono, className, children, ...props }: ChipProps) {
  return (
    <span className={cn(chipVariants({ tone, mono }), className)} {...props}>
      {glyph ? <span className={s.glyph} aria-hidden="true">{glyph}</span> : null}
      {children}
    </span>
  );
}
