import { cva, type VariantProps } from "class-variance-authority";
import s from "./heading.module.css";

export const headingVariants = cva(s.heading, {
  variants: { scale: { d0: s.d0, d1: s.d1, d2: s.d2, h1: s.h1, h2: s.h2, h3: s.h3, label: s.label } },
  defaultVariants: { scale: "h2" },
});

export type HeadingVariants = VariantProps<typeof headingVariants>;
