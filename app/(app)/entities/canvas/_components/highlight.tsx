"use client";

import { createContext, useContext } from "react";

export type Highlight = {
  /** The node under the pointer, or selected. `null` when nothing is lit. */
  lit: string | null;
  /** Everything one hop from it, INCLUDING it. `null` when nothing is lit, so a
   *  consumer can tell "nothing is highlighted" from "nothing is near". */
  near: ReadonlySet<string> | null;
};

const HighlightContext = createContext<Highlight>({ lit: null, near: null });

export const HighlightProvider = HighlightContext.Provider;

/** The highlight is a CONTEXT rather than node data, and that is a performance
 *  decision with a visible symptom behind it.
 *
 *  It lived in `data.mark` first, which put it in `rfNodes`' dependencies — so
 *  every hover rebuilt the whole node array, `setNodes` replaced all fourteen
 *  nodes with objects carrying no `measured`, and React Flow re-measured every
 *  one of them. For that frame `floating-edge` fell back to its default radius
 *  and all twenty-three edges snapped to the wrong length and back. Hovering
 *  anything made the entire map flicker.
 *
 *  Through context the arrays never change on hover: React Flow's node and edge
 *  state is untouched, measurement is never invalidated, and only the components
 *  that actually read the value re-render. */
export const useHighlight = () => useContext(HighlightContext);

/** What a node should look like given the current highlight. `undefined` means
 *  nothing is lit and the node is at rest — which is not the same as `dim`. */
export function markOf(highlight: Highlight, id: string): "lit" | "near" | "dim" | undefined {
  if (highlight.near === null) return undefined;
  if (id === highlight.lit) return "lit";
  return highlight.near.has(id) ? "near" : "dim";
}
