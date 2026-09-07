"use client";

import { RadioGroup as Primitive } from "radix-ui";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/kernel";
import s from "./radio-group.module.css";

export type RadioGroupProps = ComponentPropsWithoutRef<typeof Primitive.Root>;
export type RadioProps = ComponentPropsWithoutRef<typeof Primitive.Item>;

export function RadioGroup({ className, ...props }: RadioGroupProps) {
  return <Primitive.Root className={cn(s.group, className)} {...props} />;
}

export function Radio({ className, ...props }: RadioProps) {
  return (
    <Primitive.Item className={cn(s.radio, className)} {...props}>
      <Primitive.Indicator className={s.indicator} />
    </Primitive.Item>
  );
}
