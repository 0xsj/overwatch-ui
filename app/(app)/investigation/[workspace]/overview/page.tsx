import type { Metadata } from "next";
import { OverviewScreen } from "../../overview-screen";
export const metadata: Metadata = { title: "Investigation overview" };
export default async function Page({ params }: { params: Promise<{ workspace: string }> }) { const { workspace } = await params; return <OverviewScreen workspace={workspace} />; }
