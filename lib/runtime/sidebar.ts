"use client";

import { useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "overwatch.shell.sidebar";

const listeners = new Set<() => void>();
let cached: boolean | null = null;

function read(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "hidden";
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function getSnapshot(): boolean {
  if (cached === null) cached = read();
  return cached;
}

function getServerSnapshot(): boolean {
  return false;
}

export function setSidebarHidden(next: boolean): void {
  if (cached === next) return;
  cached = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "hidden" : "shown");
  } catch {
    /* the preference does not persist; the shell still works */
  }
  for (const listener of listeners) listener();
}

export function useSidebarHidden(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function toggleSidebar(): void {
  setSidebarHidden(!getSnapshot());
}

export function useSidebarShortcut(): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey && !event.metaKey && !event.altKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        toggleSidebar();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
