import type { Metadata } from "next";
import { AssistanceRunsScreen } from "./assistance-runs-screen";

export const metadata: Metadata = { title: "Assistance" };

export default function Page() {
  return <AssistanceRunsScreen />;
}
