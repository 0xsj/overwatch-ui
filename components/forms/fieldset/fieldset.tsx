import type { FieldsetHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/kernel";
import s from "./fieldset.module.css";

export type FieldsetProps = Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, "title"> & {
  /** Names the SET. Rendered as a `<legend>`, which is the one element a screen
   *  reader announces before every control inside the group. */
  legend: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
};

export function Fieldset({ legend, hint, className, children, ...props }: FieldsetProps) {
  return (
    <fieldset className={cn(s.fieldset, className)} {...props}>
      <legend className={s.legend}>{legend}</legend>
      {hint ? <p className={s.hint}>{hint}</p> : null}
      <div className={s.body}>{children}</div>
    </fieldset>
  );
}
