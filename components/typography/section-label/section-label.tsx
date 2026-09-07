import type { ElementType, HTMLAttributes } from "react";
import { cn } from "@/lib/kernel";
import s from "./section-label.module.css";

export type SectionLabelProps = HTMLAttributes<HTMLElement> & {
  /** `div` by default because most of these name a VALUE rather than head a
   *  region. A heading that is not meant to be in the document outline is worse
   *  than no heading, so `h2`/`h3` has to be asked for. */
  as?: Extract<ElementType, "div" | "span" | "h2" | "h3" | "h4" | "dt" | "legend">;
};

export function SectionLabel({ as: Tag = "div", className, ...props }: SectionLabelProps) {
  return <Tag className={cn(s.label, className)} {...props} />;
}
