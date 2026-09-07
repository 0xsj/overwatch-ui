import { cva, type VariantProps } from "class-variance-authority";
import s from "./badge.module.css";

export const badgeVariants = cva(s.badge, {
  variants: {
    tone: { neutral: "", accent: s.accent, warn: s.warn, crit: s.crit, info: s.info },
    mono: { true: s.mono },
  },
  defaultVariants: { tone: "neutral" },
});

export type BadgeVariants = VariantProps<typeof badgeVariants>;
