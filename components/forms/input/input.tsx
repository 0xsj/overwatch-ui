import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/kernel";
import { inputVariants, type InputVariants } from "./input.variants";

export type InputProps = InputHTMLAttributes<HTMLInputElement> &
  Omit<InputVariants, "multiline"> & { invalid?: boolean };

export function Input({ className, mono, invalid, ...props }: InputProps) {
  return (
    <input
      data-invalid={invalid || undefined}
      aria-invalid={invalid || undefined}
      className={cn(inputVariants({ mono }), className)}
      {...props}
    />
  );
}

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> &
  Omit<InputVariants, "multiline"> & { invalid?: boolean };

export function Textarea({ className, mono, invalid, rows = 4, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      data-invalid={invalid || undefined}
      aria-invalid={invalid || undefined}
      className={cn(inputVariants({ mono, multiline: true }), className)}
      {...props}
    />
  );
}
