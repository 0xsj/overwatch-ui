import type { Metadata } from "next";
import { EventRevisionScreen } from "../../../../../event-revision-screen";

export const metadata: Metadata = { title: "Event revision" };

export default async function Page({ params }: { params: Promise<{ workspace: string; event: string; revision: string }> }) {
  const { workspace, event, revision } = await params;
  return <EventRevisionScreen workspace={workspace} event={event} revision={revision} />;
}
