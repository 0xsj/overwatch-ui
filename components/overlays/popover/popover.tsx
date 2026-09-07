"use client";

import { Popover as Primitive } from "radix-ui";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/kernel";
import surface from "../../surface.module.css";
import s from "./popover.module.css";

export type PopoverProps = ComponentPropsWithoutRef<typeof Primitive.Root>;
export type PopoverTriggerProps = ComponentPropsWithoutRef<typeof Primitive.Trigger>;
export type PopoverAnchorProps = ComponentPropsWithoutRef<typeof Primitive.Anchor>;
export type PopoverCloseProps = ComponentPropsWithoutRef<typeof Primitive.Close>;
export type PopoverContentProps = ComponentPropsWithoutRef<typeof Primitive.Content>;

export function Popover(props: PopoverProps) {
  return <Primitive.Root {...props} />;
}

export function PopoverTrigger(props: PopoverTriggerProps) {
  return <Primitive.Trigger {...props} />;
}

/** Position against something other than the trigger — a table row, a canvas
 *  node — when the thing that opens it is not the thing it is about. */
export function PopoverAnchor(props: PopoverAnchorProps) {
  return <Primitive.Anchor {...props} />;
}

export function PopoverClose(props: PopoverCloseProps) {
  return <Primitive.Close {...props} />;
}

export function PopoverContent({
  className,
  align = "start",
  sideOffset = 6,
  collisionPadding = 8,
  ...props
}: PopoverContentProps) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        align={align}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(surface.elevated, s.content, className)}
        {...props}
      />
    </Primitive.Portal>
  );
}
