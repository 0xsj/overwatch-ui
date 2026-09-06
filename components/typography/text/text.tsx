import type { ElementType, HTMLAttributes } from "react";
import { cn } from "@/lib/kernel";
import { textVariants, type TextVariants } from "./text.variants";

export type TextProps = HTMLAttributes<HTMLElement> &
  TextVariants & { as?: Extract<ElementType, "p" | "span" | "div" | "li" | "dd" | "dt" | "label"> };

export function Text({ as: Tag = "p", className, size, tone, mono, measure, ...props }: TextProps) {
  return <Tag className={cn(textVariants({ size, tone, mono, measure }), className)} {...props} />;
}
