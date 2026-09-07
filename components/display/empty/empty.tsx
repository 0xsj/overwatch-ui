import type { ReactNode } from "react";
import { cn } from "@/lib/kernel";
import s from "./empty.module.css";

/** WHY there is nothing here, and the third is not like the other two.
 *
 *  `empty` and `filtered` are RESULTS — something looked and there was nothing.
 *  `unmeasured` is not a result: nobody looked. Rendering the three the same way
 *  is the null-result rule breaking in the place it matters most, because an
 *  empty table is exactly where somebody concludes "we're clean". */
export type EmptyReason = "empty" | "filtered" | "unmeasured";

export type EmptyProps = {
  /** Required. There is no sensible default — the whole component is the
   *  distinction, and a default would let a caller skip making it. */
  reason: EmptyReason;
  headline: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
};

/** The second line each reason always carries, so the distinction survives a
 *  caller who only writes a headline. */
const CODA: Record<EmptyReason, string> = {
  empty: "That is a result.",
  filtered: "That is a result, not an error.",
  unmeasured: "That is not a result — nothing has looked yet.",
};

export function Empty({ reason, headline, children, action, className }: EmptyProps) {
  return (
    <div className={cn(s.empty, s[reason], className)} data-reason={reason}>
      <p className={s.headline}>{headline}</p>
      {children ? <p className={s.body}>{children}</p> : null}
      <p className={s.coda}>{CODA[reason]}</p>
      {action ? <div className={s.action}>{action}</div> : null}
    </div>
  );
}
