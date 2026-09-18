import type { Metadata } from "next";
import { SourcesScreen } from "../../sources-screen";
export const metadata: Metadata = { title: "Sources" };
export default async function Page({ params }: { params: Promise<{ workspace: string }> }) { const { workspace } = await params; return <SourcesScreen workspace={workspace} />; }
