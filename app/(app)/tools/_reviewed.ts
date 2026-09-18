"use client";

/* ─── "A person read the argv" — held in the BROWSER, and not enforced ──────
   `CLAUDE.md` keeps `reviewed` and `in scope` apart as one of its four pairs:
   *a person read the argv / a rule permits this spawn. Two gates, two
   moments.* The second is real and lives in `scope`. **The first has no
   backend at all** — there is no `reviewed_at` on `tool.tool`, checked against
   the live schema on 2026-09-07 — so this is what the client can hold on its
   own, and the card says so rather than implying a gate that is not there.

   Why it is worth holding anyway, and why bundling makes it MORE necessary:
   `/tools/add` promises *nothing runs until a person has read the command it
   will run*. That promise is weakest exactly when WE supplied the command. A
   catalogue whose entries arrive pre-read would collapse the pair on every
   tool that matters, so an installed definition arrives UNREAD, the same as
   one somebody imported.

   It does not gate the run button, deliberately. A client-side gate on a
   server-side act is bypassed by anybody who wants to and gives false
   assurance to everybody who does not — which is worse than an honest label.
   `ALIGNMENT` carries the request for the real one.                          */

const KEY = "overwatch.tools.reviewed";

const NONE: readonly string[] = [];
let cache: readonly string[] | null = null;
const listeners = new Set<() => void>();

function read(): readonly string[] {
  if (typeof window === "undefined") return NONE;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return NONE;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : NONE;
  } catch {
    // Private mode, a full quota, a hand-edited value. A tools screen that
    // throws because a browser refused a read is worse than an unread one.
    return NONE;
  }
}

export function subscribeReviewed(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** The snapshot must be STABLE between changes — `useSyncExternalStore`
 *  compares by identity, and a fresh array per read is an infinite loop. */
export function reviewedSnapshot(): readonly string[] {
  if (cache === null) cache = read();
  return cache;
}

/** Unconditionally empty. `localStorage` is unreadable while the HTML is being
 *  produced, so the server renders every tool unread and the client swaps the
 *  real answer in after hydration. */
export const serverReviewed = (): readonly string[] => NONE;

export function markReviewed(toolId: string): void {
  const next = reviewedSnapshot().includes(toolId)
    ? reviewedSnapshot()
    : [...reviewedSnapshot(), toolId];
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* The label is already updated; failing to remember it is not worth an
       error dialog over. */
  }
  for (const notify of listeners) notify();
}
