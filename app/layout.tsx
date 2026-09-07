/* FIRST, above every other import, and load-bearing.
 *
 * Turbopack emits CSS chunks in import-graph order, so whatever the root layout
 * imports first is the first stylesheet in the document. `globals.css` is the
 * only file that carries `@layer reset, token, base, primitive, ...`, and a
 * layer order statement can only order the layers it has not already seen.
 *
 * Imported after the components, the component modules' `@layer primitive`
 * blocks reach the browser first, primitive/composition/screen get established
 * in that order, and the statement then appends reset/token/base BEHIND them —
 * `button { border: none }` in @layer reset started beating every button
 * primitive in the app. Measured 2026-09-07; see the module note. */
import "./globals.css";

import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/overlays";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const mono = JetBrains_Mono({ variable: "--font-mono-src", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Overwatch",
  description: "Is this asset ours, and what is the evidence.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
