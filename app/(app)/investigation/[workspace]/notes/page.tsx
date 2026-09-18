import type { Metadata } from "next";
import { NotesScreen } from "../../notes-screen";
export const metadata: Metadata = { title: "Working notes" };
export default async function Page({ params }: { params: Promise<{ workspace: string }> }) { const { workspace } = await params; return <NotesScreen workspace={workspace} />; }
