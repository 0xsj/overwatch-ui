import type { ElementType, HTMLAttributes } from "react";
import { cn } from "@/lib/kernel";
import s from "./visually-hidden.module.css";

export type VisuallyHiddenProps = HTMLAttributes<HTMLElement> & {
  as?: Extract<ElementType, "span" | "div" | "p" | "li" | "legend">;
};

export function VisuallyHidden({ as: Tag = "span", className, ...props }: VisuallyHiddenProps) {
  return <Tag className={cn(s.hidden, className)} {...props} />;
}
