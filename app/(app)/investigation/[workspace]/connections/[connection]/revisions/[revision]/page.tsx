import type { Metadata } from "next";
import { ConnectionRevisionScreen } from "../../../../../connection-revision-screen";

export const metadata: Metadata = { title: "Connection revision" };

export default async function Page({ params }: { params: Promise<{ workspace: string; connection: string; revision: string }> }) {
  const { workspace, connection, revision } = await params;
  return <ConnectionRevisionScreen workspace={workspace} connection={connection} revision={revision} />;
}
