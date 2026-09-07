import { Separator as SeparatorPrimitive } from "radix-ui";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/kernel";
import s from "./separator.module.css";

export type SeparatorProps = ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root> & {
  /** For a rule inside a component, where the full line is too loud. */
  subtle?: boolean;
};

export function Separator({ className, subtle = false, ...props }: SeparatorProps) {
  return (
    <SeparatorPrimitive.Root
      className={cn(s.separator, subtle && s.subtle, className)}
      {...props}
    />
  );
}
