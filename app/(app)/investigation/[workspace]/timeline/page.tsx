import type { Metadata } from "next";
import { TimelineScreen } from "../../timeline-screen";

export const metadata: Metadata = { title: "Timeline" };
export default async function Page({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  return <TimelineScreen workspace={workspace} />;
}
