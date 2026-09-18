import type { Metadata } from "next";
import { QuestionsScreen } from "../../questions-screen";
export const metadata: Metadata = { title: "Open questions" };
export default async function Page({ params }: { params: Promise<{ workspace: string }> }) { const { workspace } = await params; return <QuestionsScreen workspace={workspace} />; }
