import type { Metadata } from "next";
import { ConnectionsScreen } from "../../connections-screen";

export const metadata: Metadata = { title: "Connections" };
export default async function Page({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  return <ConnectionsScreen workspace={workspace} />;
}
