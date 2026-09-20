import type { Metadata } from "next";
import { AcrossTargetsScreen } from "./across-targets-screen";

export const metadata: Metadata = { title: "Across targets" };

export default function Page() {
  return <AcrossTargetsScreen />;
}
