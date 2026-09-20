import type { Metadata } from "next";
import { LogsScreen } from "./logs-screen";

export const metadata: Metadata = { title: "Logs" };

export default function Page() {
  return <LogsScreen />;
}
