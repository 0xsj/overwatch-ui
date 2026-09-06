import { cva, type VariantProps } from "class-variance-authority";
import s from "./text.module.css";

export const textVariants = cva(s.text, {
  variants: {
    size: { xs: s.xs, sm: s.sm, md: s.md, lg: s.lg },
    tone: { primary: s.primary, secondary: s.secondary, tertiary: s.tertiary, quiet: s.quiet, accent: s.accent },
    mono: { true: s.mono },
    measure: { true: s.measure },
  },
  defaultVariants: { size: "md", tone: "primary" },
});

export type TextVariants = VariantProps<typeof textVariants>;
