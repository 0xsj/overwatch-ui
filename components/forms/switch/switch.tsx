"use client";

import { Switch as Primitive } from "radix-ui";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/kernel";
import s from "./switch.module.css";

export type SwitchProps = ComponentPropsWithoutRef<typeof Primitive.Root>;

export function Switch({ className, ...props }: SwitchProps) {
  return (
    <Primitive.Root className={cn(s.switch, className)} {...props}>
      <Primitive.Thumb className={s.thumb} />
    </Primitive.Root>
  );
}
