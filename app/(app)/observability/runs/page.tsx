import type { Metadata } from "next";
import { RunsScreen } from "./runs-screen";

/* The page file is a manifest, not a screen.
 *
 *  `metadata` is server-only — a module carrying "use client" cannot export it
 *  — so the four lines that name the tab stay here and everything that reads
 *  data, holds state or renders is the client component beside this one. That
 *  is the whole of what a `page.tsx` does in this build now. */
export const metadata: Metadata = { title: "Runs" };

export default function Page() {
  return <RunsScreen />;
}
