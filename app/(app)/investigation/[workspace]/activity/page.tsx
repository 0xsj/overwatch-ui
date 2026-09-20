import type { Metadata } from "next";
import { InvestigationActivityScreen } from "../../activity-screen";

export const metadata: Metadata = { title: "Investigation activity" };

export default async function Page({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  return <InvestigationActivityScreen workspace={workspace} />;
}
