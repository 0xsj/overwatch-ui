import type { Metadata } from "next";
import { TargetsScreen } from "./targets-screen";

export const metadata: Metadata = { title: "Targets" };

export default function Page() {
  return <TargetsScreen />;
}
