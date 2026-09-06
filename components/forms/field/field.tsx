import { useId, type ReactNode } from "react";
import { cn } from "@/lib/kernel";
import s from "./field.module.css";

export type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: (aria: {
    id: string;
    "aria-describedby": string | undefined;
    required: boolean | undefined;
    invalid: boolean | undefined;
  }) => ReactNode;
};

export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn(s.field, className)}>
      <label className={s.label} htmlFor={id}>
        {label}
        {required ? <span className={s.required} aria-hidden="true">*</span> : null}
      </label>
      {children({
        id,
        "aria-describedby": describedBy,
        required: required || undefined,
        invalid: Boolean(error) || undefined,
      })}
      {error ? <p id={errorId} className={s.error}>{error}</p> : null}
      {hint ? <p id={hintId} className={s.hint}>{hint}</p> : null}
    </div>
  );
}
