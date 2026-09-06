import { cva, type VariantProps } from "class-variance-authority";
import s from "./stat.module.css";

export const statVariants = cva(s.note, {
  variants: {
    tone: { neutral: "", accent: s.accent, warn: s.warn, crit: s.crit, info: s.info },
  },
  defaultVariants: { tone: "neutral" },
});

export type StatVariants = VariantProps<typeof statVariants>;
