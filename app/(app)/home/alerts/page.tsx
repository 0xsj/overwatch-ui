import type { Metadata } from "next";
import { SourceAlertsScreen } from "./source-alerts-screen";

export const metadata: Metadata = { title: "Source alerts" };

export default function Page() {
  return <SourceAlertsScreen />;
}
