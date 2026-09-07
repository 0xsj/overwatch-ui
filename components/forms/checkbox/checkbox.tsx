"use client";

import { Checkbox as Primitive } from "radix-ui";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/kernel";
import s from "./checkbox.module.css";

export type CheckboxProps = ComponentPropsWithoutRef<typeof Primitive.Root>;

export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <Primitive.Root className={cn(s.checkbox, className)} {...props}>
      <Primitive.Indicator className={s.indicator}>
        {/* Two glyphs, and which one shows is decided by the state attribute
            rather than by a prop — indeterminate is a state, not a variant. */}
        <span className={s.check} aria-hidden="true">✓</span>
        <span className={s.mixed} aria-hidden="true">–</span>
      </Primitive.Indicator>
    </Primitive.Root>
  );
}
