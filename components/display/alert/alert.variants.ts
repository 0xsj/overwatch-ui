import { cva, type VariantProps } from "class-variance-authority";
import s from "./alert.module.css";

export const alertVariants = cva(s.alert, {
  variants: {
    tone: { neutral: "", accent: s.accent, warn: s.warn, crit: s.crit, info: s.info },
  },
  defaultVariants: { tone: "neutral" },
});

export type AlertVariants = VariantProps<typeof alertVariants>;
