import type { Metadata } from "next";
import { EvidenceScreen } from "../../evidence-screen";
export const metadata: Metadata = { title: "Evidence review" };
export default async function Page({ params }: { params: Promise<{ workspace: string }> }) { const { workspace } = await params; return <EvidenceScreen workspace={workspace} />; }
