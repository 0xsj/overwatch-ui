import type { Metadata } from "next";
import { SourceReader } from "../../../source-reader";
export const metadata: Metadata = { title: "Read source" };
export default async function Page({ params }: { params: Promise<{ workspace: string; source: string }> }) { const { workspace, source } = await params; return <SourceReader workspace={workspace} source={source} />; }
