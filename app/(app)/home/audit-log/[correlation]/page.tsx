import type { Metadata } from "next";
import { ChainScreen } from "./chain-screen";

export const metadata: Metadata = { title: "One act — Overwatch" };

export default function Page() {
  return <ChainScreen />;
}
