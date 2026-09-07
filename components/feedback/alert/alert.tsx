import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/kernel";
import s from "./alert.module.css";
import { alertVariants, type AlertVariants } from "./alert.variants";

const GLYPH = { neutral: "·", accent: "✓", warn: "▲", crit: "⊘", info: "i" } as const;

export type AlertProps = HTMLAttributes<HTMLDivElement> &
  AlertVariants & { glyph?: ReactNode; live?: boolean };

export function Alert({ tone, glyph, live, className, children, ...props }: AlertProps) {
  return (
    <div
      role={live === false ? undefined : tone === "crit" ? "alert" : "status"}
      aria-live={live === false ? undefined : tone === "crit" ? "assertive" : "polite"}
      className={cn(alertVariants({ tone }), className)}
      {...props}
    >
      <span className={s.glyph} aria-hidden="true">{glyph ?? GLYPH[tone ?? "neutral"]}</span>
      <div className={s.body}>{children}</div>
    </div>
  );
}
