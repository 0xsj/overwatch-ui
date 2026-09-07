import { cva, type VariantProps } from "class-variance-authority";
import s from "./toggle.module.css";

export const toggleVariants = cva(s.toggle, {
  variants: {
    size: { sm: s.sm, md: s.md, icon: s.icon },
    shape: { square: s.square, pill: s.pill },
  },
  defaultVariants: { size: "md", shape: "square" },
});

export type ToggleVariants = VariantProps<typeof toggleVariants>;
