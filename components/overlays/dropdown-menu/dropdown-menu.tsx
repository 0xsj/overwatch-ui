"use client";

import { DropdownMenu as Primitive } from "radix-ui";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/kernel";
import surface from "../../surface.module.css";
import s from "./dropdown-menu.module.css";

export type DropdownMenuProps = ComponentPropsWithoutRef<typeof Primitive.Root>;
export type DropdownMenuTriggerProps = ComponentPropsWithoutRef<typeof Primitive.Trigger>;
export type DropdownMenuContentProps = ComponentPropsWithoutRef<typeof Primitive.Content>;
export type DropdownMenuItemProps = ComponentPropsWithoutRef<typeof Primitive.Item> & {
  /** For the one item that removes something. Never more than one per menu. */
  destructive?: boolean;
};
export type DropdownMenuLabelProps = ComponentPropsWithoutRef<typeof Primitive.Label>;
export type DropdownMenuSeparatorProps = ComponentPropsWithoutRef<typeof Primitive.Separator>;

export function DropdownMenu(props: DropdownMenuProps) {
  return <Primitive.Root {...props} />;
}

export function DropdownMenuTrigger(props: DropdownMenuTriggerProps) {
  return <Primitive.Trigger {...props} />;
}

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  collisionPadding = 8,
  ...props
}: DropdownMenuContentProps) {
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

export function DropdownMenuItem({ className, destructive = false, ...props }: DropdownMenuItemProps) {
  return <Primitive.Item className={cn(s.item, destructive && s.destructive, className)} {...props} />;
}

export function DropdownMenuLabel({ className, ...props }: DropdownMenuLabelProps) {
  return <Primitive.Label className={cn(s.label, className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: DropdownMenuSeparatorProps) {
  return <Primitive.Separator className={cn(s.separator, className)} {...props} />;
}
