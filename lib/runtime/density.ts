import { useSyncExternalStore } from "react";

/** Compact or comfortable, held on `<html>` as `data-density`.
 *
 *  The DOM attribute IS the store — the same shape as the theme toggle, and for
 *  the same reason: the value has to be readable by CSS, so putting it anywhere
 *  else means keeping two copies in step. `useSyncExternalStore` subscribes to
 *  the attribute rather than mirroring it into `useState`, which is the mistake
 *  this codebase has made twice and caught with
 *  `react-hooks/set-state-in-effect` both times.
 *
 *  It changes three tokens in `styles/tokens/shape.css` and nothing else. That
 *  is deliberate: anything reading `--control-*` follows without knowing density
 *  exists, and a component that hard-codes a height stands out. */
export type Density = "comfortable" | "compact";

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ["data-density"] });
  return () => observer.disconnect();
}

function getSnapshot(): Density {
  return document.documentElement.getAttribute("data-density") === "compact"
    ? "compact"
    : "comfortable";
}

/** The server has no DOM and no per-browser value, so it renders the default.
 *  A density chosen in one browser is not a fact about the account. */
const getServerSnapshot = (): Density => "comfortable";

export function useDensity(): Density {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setDensity(next: Density): void {
  const el = document.documentElement;
  if (next === "compact") el.setAttribute("data-density", "compact");
  else el.removeAttribute("data-density");
}
