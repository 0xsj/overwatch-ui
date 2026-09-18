import type { Metadata } from "next";
import { WorkspacesScreen } from "./workspaces-screen";

export const metadata: Metadata = { title: "Engagements" };

export default function Page() {
  return <WorkspacesScreen />;
}
