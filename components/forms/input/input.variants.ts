import { cva, type VariantProps } from "class-variance-authority";
import s from "./input.module.css";

export const inputVariants = cva(s.input, {
  variants: { mono: { true: s.mono }, multiline: { true: s.textarea } },
});

export type InputVariants = VariantProps<typeof inputVariants>;
