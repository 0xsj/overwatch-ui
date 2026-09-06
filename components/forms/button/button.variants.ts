import { cva, type VariantProps } from "class-variance-authority";
import s from "./button.module.css";

export const buttonVariants = cva(s.button, {
  variants: {
    intent: {
      primary: s.primary,
      secondary: s.secondary,
      ghost: s.ghost,
      danger: s.danger,
      link: s.link,
    },
    size: { sm: s.sm, md: s.md, lg: s.lg, icon: s.icon },
  },
  defaultVariants: { intent: "secondary", size: "md" },
});

export type ButtonVariants = VariantProps<typeof buttonVariants>;
