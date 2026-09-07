/** The three states §Scope refuses to collapse. Generic in the value so the
 *  kernel stays free of React — a component narrows `T` to `ReactNode`. */
export type Presence<T = string> =
  | { state: "present"; value: T }
  | { state: "absent" }
  | { state: "unattempted" };

export type PresenceState = Presence["state"];

export const present = <T,>(value: T): Presence<T> => ({ state: "present", value });
export const absent = (): Presence<never> => ({ state: "absent" });
export const unattempted = (): Presence<never> => ({ state: "unattempted" });

export function isPresent<T>(p: Presence<T>): p is { state: "present"; value: T } {
  return p.state === "present";
}

/** What each state MEANS, in the product's own words. One definition, so a
 *  table cell, a legend and a screen reader cannot drift apart. */
export const PRESENCE_MEANING: Record<PresenceState, string> = {
  present: "found — a source said so",
  absent: "looked, found nothing",
  unattempted: "never checked — not the same as nothing",
};

/** The word that stands in for a value there is none of. `present` has no entry
 *  because it renders its value. */
export const PRESENCE_WORD = {
  absent: "none",
  unattempted: "never checked",
} as const;
