import type { Metadata } from "next";
import { OverviewScreen } from "./overview-screen";

export const metadata: Metadata = { title: "Overview" };

export default function Page() {
  return <OverviewScreen />;
}
