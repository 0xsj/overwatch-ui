import { VisuallyHidden } from "@/components/utility";
import { cn } from "@/lib/kernel";
import s from "./mock.module.css";

const DEFAULT_NOTE =
  "Fixture data. Nothing here was measured, and no server produced it.";

export type MockProps = {
  /** What the badge says when hovered or read aloud. Override it when the
   *  reason is narrower than "the whole build has no server". */
  note?: string;
  className?: string;
};

export function Mock({ note = DEFAULT_NOTE, className }: MockProps) {
  return (
    <span className={cn(s.mock, className)} title={note}>
      mock
      <VisuallyHidden> — {note}</VisuallyHidden>
    </span>
  );
}
