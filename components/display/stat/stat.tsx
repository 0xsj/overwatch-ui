import type { ReactNode } from "react";
import { cn } from "@/lib/kernel";
import s from "./stat.module.css";
import { statVariants, type StatVariants } from "./stat.variants";

export type StatProps = StatVariants & {
  label: ReactNode;
  /** A number that nothing measured is `undefined`, and renders as an em dash.
   *  Never pass 0 for "we did not count" — a zero nothing computed is not a
   *  zero, and this is the component where that rule is cheapest to hold. */
  value?: ReactNode;
  note?: ReactNode;
  className?: string;
};

export function Stat({ label, value, note, tone, className }: StatProps) {
  return (
    <div className={cn(s.stat, className)}>
      <div className={s.label}>{label}</div>
      <div className={s.value}>{value ?? <span className={s.unmeasured}>—</span>}</div>
      {note ? <div className={statVariants({ tone })}>{note}</div> : null}
    </div>
  );
}
