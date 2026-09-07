"use client";

import type { Pin } from "@/lib/services/entities";

/* ─── Pins live in the BROWSER, and that is a statement rather than a gap ───
   Everything else on this screen is now a real endpoint. Pins are not: there is
   no pin table on the server and no route to write one, so the arrangement of
   one person's canvas is kept here, keyed by root.

   Why not propose an endpoint. A pin is one analyst's arrangement of one
   viewport — it is not evidence, nothing cites it, and it has no bearing on
   what is true about a client. Writing it server-side would put a per-person
   display preference inside an engagement's record, where it would be
   readable by everybody the engagement is shared with. `localStorage` gets
   the semantics right by accident and by argument at once: private, per
   device, and worthless if lost.

   The cost is stated rather than hidden: a pin does not follow you to another
   machine, and the screen says so beside the count.                          */

const key = (rootId: string) => `overwatch.canvas.pins.${rootId}`;

/** An empty list, and always the SAME empty list.
 *
 *  `useSyncExternalStore` compares snapshots by identity: returning a fresh
 *  `[]` on every read is an infinite render loop, and the server snapshot is
 *  read on every server render. */
const NONE: Pin[] = [];

/** One cached snapshot per root, because a snapshot must be stable between
 *  changes for the same reason. */
const CACHE = new Map<string, Pin[]>();
const LISTENERS = new Map<string, Set<() => void>>();

function listenersFor(rootId: string): Set<() => void> {
  const found = LISTENERS.get(rootId);
  if (found) return found;
  const made = new Set<() => void>();
  LISTENERS.set(rootId, made);
  return made;
}

export function subscribePins(rootId: string): (onChange: () => void) => () => void {
  return (onChange) => {
    const set = listenersFor(rootId);
    set.add(onChange);
    return () => set.delete(onChange);
  };
}

export function pinSnapshot(rootId: string): Pin[] {
  const cached = CACHE.get(rootId);
  if (cached) return cached;
  const read = readPins(rootId);
  CACHE.set(rootId, read);
  return read;
}

/** The SERVER snapshot, and it is unconditionally empty.
 *
 *  `localStorage` is not readable while the HTML is being produced. Seeding
 *  from it would be the classic hydration mismatch — the server draws an
 *  unpinned canvas and the client draws a pinned one — and React would keep the
 *  server's markup, so the pins would silently not apply. */
export const serverPins = (): Pin[] => NONE;

export function setPins(rootId: string, pins: Pin[]): void {
  CACHE.set(rootId, pins);
  writePins(rootId, pins);
  for (const notify of listenersFor(rootId)) notify();
}

export function readPins(rootId: string): Pin[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key(rootId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Validated rather than cast: this string is user-writable, survives a
    // deploy, and a NaN coordinate silently removes a node from the drawing.
    return parsed.flatMap((p) =>
      p && typeof p === "object" &&
      typeof (p as Pin).fragment_id === "string" &&
      Number.isFinite((p as Pin).x) && Number.isFinite((p as Pin).y)
        ? [{ fragment_id: (p as Pin).fragment_id, x: (p as Pin).x, y: (p as Pin).y }]
        : [],
    );
  } catch {
    // Private mode, a full quota, a hand-edited value. A canvas that throws
    // because somebody's browser refused a read is worse than an unpinned one.
    return [];
  }
}

export function writePins(rootId: string, pins: readonly Pin[]): void {
  if (typeof window === "undefined") return;
  try {
    if (pins.length === 0) window.localStorage.removeItem(key(rootId));
    else window.localStorage.setItem(key(rootId), JSON.stringify(pins));
  } catch {
    /* The drag already moved the node; failing to remember it is not worth
       interrupting the gesture for. */
  }
}
