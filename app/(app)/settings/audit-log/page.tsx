import type { Metadata } from "next";
import { OrgAuditScreen } from "./audit-screen";

export const metadata: Metadata = { title: "Organisation log" };

export default function Page() {
  return <OrgAuditScreen />;
}
