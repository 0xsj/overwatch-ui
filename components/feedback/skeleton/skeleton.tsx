import { cn } from "@/lib/kernel";
import s from "./skeleton.module.css";

export type SkeletonProps = {
  /** A CSS length. Vary it across a group — a column of identical bars reads as
   *  a pattern rather than as text that has not arrived. */
  width?: string;
  height?: string;
  className?: string;
};

/** `aria-hidden` and no live region. A screen reader should hear the loading
 *  state ONCE, from whatever owns it — a `Text` saying so, or `aria-busy` on the
 *  region — not a bar per row. */
export function Skeleton({ width, height, className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(s.skeleton, className)}
      style={{ inlineSize: width, blockSize: height }}
    />
  );
}
