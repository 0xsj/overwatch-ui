import type { HTMLAttributes } from "react";
import { cn } from "@/lib/kernel";
import { headingVariants, type HeadingVariants } from "./heading.variants";

export type HeadingProps = HTMLAttributes<HTMLHeadingElement> &
  HeadingVariants & { level: 1 | 2 | 3 | 4 | 5 | 6 };

export function Heading({ level, scale, className, ...props }: HeadingProps) {
  const Tag = `h${level}` as const;
  return <Tag className={cn(headingVariants({ scale }), className)} {...props} />;
}
