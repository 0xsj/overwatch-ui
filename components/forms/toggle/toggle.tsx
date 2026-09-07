"use client";

import { Toggle as Primitive } from "radix-ui";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/kernel";
import { toggleVariants, type ToggleVariants } from "./toggle.variants";

export type ToggleProps = ComponentPropsWithoutRef<typeof Primitive.Root> & ToggleVariants;

export function Toggle({ className, size, shape, ...props }: ToggleProps) {
  return <Primitive.Root className={cn(toggleVariants({ size, shape }), className)} {...props} />;
}
