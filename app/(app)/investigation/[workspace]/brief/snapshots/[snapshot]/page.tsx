import type { Metadata } from "next";
import { SnapshotDetailScreen } from "../../../../snapshot-detail-screen";

export const metadata: Metadata = { title: "Frozen handoff" };

export default async function Page({ params }: { params: Promise<{ workspace: string; snapshot: string }> }) {
  const { workspace, snapshot } = await params;
  return <SnapshotDetailScreen workspace={workspace} snapshot={snapshot} />;
}
