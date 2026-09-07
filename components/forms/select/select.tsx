"use client";

import { Select as Primitive } from "radix-ui";
import type { ComponentPropsWithoutRef } from "react";
import { Check, ChevronDown } from "@/components/utility";
import { cn } from "@/lib/kernel";
import surface from "../../surface.module.css";
import s from "./select.module.css";

export type SelectProps = ComponentPropsWithoutRef<typeof Primitive.Root>;
export type SelectTriggerProps = ComponentPropsWithoutRef<typeof Primitive.Trigger> & {
  invalid?: boolean;
};
export type SelectContentProps = ComponentPropsWithoutRef<typeof Primitive.Content>;
export type SelectItemProps = ComponentPropsWithoutRef<typeof Primitive.Item>;
export type SelectGroupProps = ComponentPropsWithoutRef<typeof Primitive.Group>;
export type SelectLabelProps = ComponentPropsWithoutRef<typeof Primitive.Label>;
export type SelectSeparatorProps = ComponentPropsWithoutRef<typeof Primitive.Separator>;

export function Select(props: SelectProps) {
  return <Primitive.Root {...props} />;
}

export function SelectValue(props: ComponentPropsWithoutRef<typeof Primitive.Value>) {
  return <Primitive.Value {...props} />;
}

export function SelectTrigger({ className, invalid, children, ...props }: SelectTriggerProps) {
  return (
    <Primitive.Trigger
      data-invalid={invalid || undefined}
      aria-invalid={invalid || undefined}
      className={cn(s.trigger, className)}
      {...props}
    >
      {children}
      <Primitive.Icon asChild>
        <ChevronDown size={14} strokeWidth={1.7} className={s.chevron} aria-hidden="true" />
      </Primitive.Icon>
    </Primitive.Trigger>
  );
}

export function SelectContent({ className, position = "popper", ...props }: SelectContentProps) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        position={position}
        sideOffset={6}
        className={cn(surface.elevated, s.content, className)}
        {...props}
      >
        <Primitive.Viewport className={s.viewport}>{props.children}</Primitive.Viewport>
      </Primitive.Content>
    </Primitive.Portal>
  );
}

export function SelectItem({ className, children, ...props }: SelectItemProps) {
  return (
    <Primitive.Item className={cn(s.item, className)} {...props}>
      <span className={s.indicator}>
        <Primitive.ItemIndicator>
          <Check size={13} strokeWidth={2} aria-hidden="true" />
        </Primitive.ItemIndicator>
      </span>
      <Primitive.ItemText>{children}</Primitive.ItemText>
    </Primitive.Item>
  );
}

/** The wrapper `SelectLabel` needs, and the reason it is here.
 *
 *  Radix throws `SelectLabel must be used within SelectGroup` — at RENDER, not
 *  at build, so a screen with a labelled group compiles, type-checks, lints, and
 *  then blanks. The catalogue omitted it because a label looked like a leaf, and
 *  it is not: a group is what ties the label to its items for a screen reader,
 *  which is the whole reason to draw one. */
export function SelectGroup(props: SelectGroupProps) {
  return <Primitive.Group {...props} />;
}

export function SelectLabel({ className, ...props }: SelectLabelProps) {
  return <Primitive.Label className={cn(s.label, className)} {...props} />;
}

export function SelectSeparator({ className, ...props }: SelectSeparatorProps) {
  return <Primitive.Separator className={cn(s.separator, className)} {...props} />;
}
