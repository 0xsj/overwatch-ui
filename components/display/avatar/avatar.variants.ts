import { cva, type VariantProps } from "class-variance-authority";
import s from "./avatar.module.css";

export const avatarVariants = cva(s.avatar, {
  variants: { size: { sm: s.sm, md: s.md, lg: s.lg } },
  defaultVariants: { size: "sm" },
});

export type AvatarVariants = VariantProps<typeof avatarVariants>;
