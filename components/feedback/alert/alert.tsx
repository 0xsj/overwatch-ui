import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/kernel";
import s from "./alert.module.css";
import { alertVariants, type AlertVariants } from "./alert.variants";

const GLYPH = { neutral: "·", accent: "✓", warn: "▲", crit: "⊘", info: "i" } as const;

export type AlertProps = HTMLAttributes<HTMLDivElement> &
  AlertVariants & { glyph?: ReactNode; live?: boolean };

export function Alert({ tone, glyph, live, role, "aria-live": ariaLive, className, children, ...props }: AlertProps) {
  const resolvedRole = role ?? (tone === "crit" ? "alert" : "status");
  const resolvedLive = live === false ? undefined : ariaLive ?? (resolvedRole === "alert" ? "assertive" : resolvedRole === "status" ? "polite" : undefined);
  return (
    <div
      role={live === false ? undefined : resolvedRole}
      aria-live={resolvedLive}
      className={cn(alertVariants({ tone }), className)}
      {...props}
    >
      <span className={s.glyph} aria-hidden="true">{glyph ?? GLYPH[tone ?? "neutral"]}</span>
      <div className={s.body}>{children}</div>
    </div>
  );
}
