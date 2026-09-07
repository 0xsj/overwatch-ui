"use client";

import { Tabs as Primitive } from "radix-ui";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/kernel";
import s from "./tabs.module.css";

export type TabsProps = ComponentPropsWithoutRef<typeof Primitive.Root>;
export type TabsListProps = ComponentPropsWithoutRef<typeof Primitive.List>;
export type TabsTriggerProps = ComponentPropsWithoutRef<typeof Primitive.Trigger>;
export type TabsContentProps = ComponentPropsWithoutRef<typeof Primitive.Content>;

export function Tabs(props: TabsProps) {
  return <Primitive.Root {...props} />;
}

export function TabsList({ className, ...props }: TabsListProps) {
  return <Primitive.List className={cn(s.list, className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: TabsTriggerProps) {
  return <Primitive.Trigger className={cn(s.trigger, className)} {...props} />;
}

export function TabsContent({ className, ...props }: TabsContentProps) {
  return <Primitive.Content className={cn(s.content, className)} {...props} />;
}
