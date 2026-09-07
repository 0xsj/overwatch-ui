import { Label as Primitive } from "radix-ui";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/kernel";
import s from "./label.module.css";

export type LabelProps = ComponentPropsWithoutRef<typeof Primitive.Root>;

export function Label({ className, ...props }: LabelProps) {
  return <Primitive.Root className={cn(s.label, className)} {...props} />;
}
