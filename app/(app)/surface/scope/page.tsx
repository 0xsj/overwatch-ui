import type { Metadata } from "next";
import { ScopeScreen } from "./scope-screen";

export const metadata: Metadata = { title: "Scope" };

export default function Page() {
  return <ScopeScreen />;
}
