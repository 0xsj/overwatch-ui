import type { Metadata } from "next";
import { BriefScreen } from "../../brief-screen";

export const metadata: Metadata = { title: "Working brief" };
export default async function Page({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  return <BriefScreen workspace={workspace} />;
}
