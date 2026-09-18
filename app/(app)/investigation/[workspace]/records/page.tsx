import type { Metadata } from "next";
import { RecordsScreen } from "../../records-screen";

export const metadata: Metadata = { title: "Research records" };
export default async function Page({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  return <RecordsScreen workspace={workspace} />;
}
