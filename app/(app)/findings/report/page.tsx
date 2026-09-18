import type { Metadata } from "next";
import { ReportScreen } from "./report-screen";

export const metadata: Metadata = { title: "Report" };

export default function Page() {
  return <ReportScreen />;
}
