import type { Metadata } from "next";
import { WorkspaceAuditScreen } from "./audit-screen";

export const metadata: Metadata = { title: "Engagement log" };

export default function Page() {
  return <WorkspaceAuditScreen />;
}
