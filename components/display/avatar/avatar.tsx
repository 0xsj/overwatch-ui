import { cn } from "@/lib/kernel";
import { avatarVariants, type AvatarVariants } from "./avatar.variants";

export type AvatarProps = AvatarVariants & {
  /** The whole name. Initials are derived here so two callers cannot derive
   *  them differently — the sidebar and a members table would drift on the day
   *  somebody has three names. */
  name: string;
  className?: string;
};

export function initialsOf(name: string): string {
  const parts = name.split(/[\s._-]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

export function Avatar({ name, size, className }: AvatarProps) {
  return (
    <span className={cn(avatarVariants({ size }), className)} title={name} aria-hidden="true">
      {initialsOf(name)}
    </span>
  );
}
