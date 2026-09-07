"use client";

import { Tooltip as Primitive } from "radix-ui";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/kernel";
import surface from "../../surface.module.css";
import s from "./tooltip.module.css";

export type TooltipProviderProps = ComponentPropsWithoutRef<typeof Primitive.Provider>;
export type TooltipProps = ComponentPropsWithoutRef<typeof Primitive.Root>;
export type TooltipTriggerProps = ComponentPropsWithoutRef<typeof Primitive.Trigger>;
export type TooltipContentProps = ComponentPropsWithoutRef<typeof Primitive.Content>;

export function TooltipProvider({ delayDuration = 400, ...props }: TooltipProviderProps) {
  return <Primitive.Provider delayDuration={delayDuration} {...props} />;
}

export function Tooltip(props: TooltipProps) {
  return <Primitive.Root {...props} />;
}

export function TooltipTrigger(props: TooltipTriggerProps) {
  return <Primitive.Trigger {...props} />;
}

export function TooltipContent({
  className,
  sideOffset = 6,
  collisionPadding = 8,
  ...props
}: TooltipContentProps) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(surface.elevated, s.content, className)}
        {...props}
      />
    </Primitive.Portal>
  );
}
