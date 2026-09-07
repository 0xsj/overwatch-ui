import type { ReactNode } from "react";
import { VisuallyHidden } from "@/components/utility";
import { cn, PRESENCE_WORD, type Presence as PresenceValue } from "@/lib/kernel";
import s from "./presence.module.css";
import { presenceVariants } from "./presence.variants";

const GLYPH = { present: "●", absent: "—", unattempted: "··" } as const;

export type PresenceProps = {
  /** The three states, as a union. There is no boolean here on purpose. */
  of: PresenceValue<ReactNode>;
  /** Glyph only; the word moves into hidden text rather than being dropped. */
  compact?: boolean;
  className?: string;
};

export function Presence({ of, compact = false, className }: PresenceProps) {
  const word = of.state === "present" ? null : PRESENCE_WORD[of.state];

  return (
    <span className={cn(presenceVariants({ state: of.state, compact }), className)}>
      <span className={s.glyph} aria-hidden="true">{GLYPH[of.state]}</span>
      {of.state === "present" ? (
        <span className={s.label}>{of.value}</span>
      ) : compact ? (
        <VisuallyHidden>{word}</VisuallyHidden>
      ) : (
        <span className={s.label}>{word}</span>
      )}
    </span>
  );
}
