"use client";

import { AlertDialog as Primitive } from "radix-ui";
import type { ComponentPropsWithoutRef, HTMLAttributes } from "react";
import { cn } from "@/lib/kernel";
import surface from "../../surface.module.css";
import dialog from "../dialog/dialog.module.css";

export type AlertDialogProps = ComponentPropsWithoutRef<typeof Primitive.Root>;
export type AlertDialogTriggerProps = ComponentPropsWithoutRef<typeof Primitive.Trigger>;
export type AlertDialogContentProps = ComponentPropsWithoutRef<typeof Primitive.Content>;
export type AlertDialogTitleProps = ComponentPropsWithoutRef<typeof Primitive.Title>;
export type AlertDialogDescriptionProps = ComponentPropsWithoutRef<typeof Primitive.Description>;
export type AlertDialogActionProps = ComponentPropsWithoutRef<typeof Primitive.Action>;
export type AlertDialogCancelProps = ComponentPropsWithoutRef<typeof Primitive.Cancel>;

export function AlertDialog(props: AlertDialogProps) {
  return <Primitive.Root {...props} />;
}

export function AlertDialogTrigger(props: AlertDialogTriggerProps) {
  return <Primitive.Trigger {...props} />;
}

export function AlertDialogContent({ className, ...props }: AlertDialogContentProps) {
  return (
    <Primitive.Portal>
      <Primitive.Overlay className={dialog.overlay} />
      <Primitive.Content
        className={cn(surface.elevated, dialog.content, className)}
        {...props}
      />
    </Primitive.Portal>
  );
}

export function AlertDialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(dialog.header, className)} {...props} />;
}

export function AlertDialogTitle({ className, ...props }: AlertDialogTitleProps) {
  return <Primitive.Title className={cn(dialog.title, className)} {...props} />;
}

export function AlertDialogDescription({ className, ...props }: AlertDialogDescriptionProps) {
  return <Primitive.Description className={cn(dialog.description, className)} {...props} />;
}

export function AlertDialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(dialog.footer, className)} {...props} />;
}

export function AlertDialogAction(props: AlertDialogActionProps) {
  return <Primitive.Action {...props} />;
}

export function AlertDialogCancel(props: AlertDialogCancelProps) {
  return <Primitive.Cancel {...props} />;
}
