"use client";

import { Dialog as Primitive } from "radix-ui";
import type { ComponentPropsWithoutRef, HTMLAttributes } from "react";
import { X } from "@/components/utility";
import { cn } from "@/lib/kernel";
import surface from "../../surface.module.css";
import s from "./dialog.module.css";

export type DialogProps = ComponentPropsWithoutRef<typeof Primitive.Root>;
export type DialogTriggerProps = ComponentPropsWithoutRef<typeof Primitive.Trigger>;
export type DialogCloseProps = ComponentPropsWithoutRef<typeof Primitive.Close>;
export type DialogTitleProps = ComponentPropsWithoutRef<typeof Primitive.Title>;
export type DialogDescriptionProps = ComponentPropsWithoutRef<typeof Primitive.Description>;
export type DialogContentProps = ComponentPropsWithoutRef<typeof Primitive.Content> & {
  /** Anchored to an edge and full height, rather than centred. The mock's
   *  record drawer. */
  side?: "center" | "right";
};

export function Dialog(props: DialogProps) {
  return <Primitive.Root {...props} />;
}

export function DialogTrigger(props: DialogTriggerProps) {
  return <Primitive.Trigger {...props} />;
}

export function DialogClose(props: DialogCloseProps) {
  return <Primitive.Close {...props} />;
}

export function DialogContent({ className, side = "center", children, ...props }: DialogContentProps) {
  return (
    <Primitive.Portal>
      <Primitive.Overlay className={s.overlay} />
      <Primitive.Content
        className={cn(surface.elevated, s.content, side === "right" && s.right, className)}
        {...props}
      >
        {children}
        <Primitive.Close className={s.dismiss} aria-label="Close">
          <X size={15} strokeWidth={1.8} aria-hidden="true" />
        </Primitive.Close>
      </Primitive.Content>
    </Primitive.Portal>
  );
}

export function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(s.header, className)} {...props} />;
}

export function DialogTitle({ className, ...props }: DialogTitleProps) {
  return <Primitive.Title className={cn(s.title, className)} {...props} />;
}

export function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  return <Primitive.Description className={cn(s.description, className)} {...props} />;
}

export function DialogBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(s.body, className)} {...props} />;
}

export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(s.footer, className)} {...props} />;
}
