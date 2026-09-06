import { cva, type VariantProps } from "class-variance-authority";
import s from "./chip.module.css";

export const chipVariants = cva(s.chip, {
  variants: {
    tone: { neutral: "", accent: s.accent, warn: s.warn, crit: s.crit, info: s.info },
    mono: { true: s.mono },
  },
  defaultVariants: { tone: "neutral" },
});

export type ChipVariants = VariantProps<typeof chipVariants>;
