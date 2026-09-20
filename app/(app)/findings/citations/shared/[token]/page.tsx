import type { Metadata } from "next";
import { CitationShareScreen } from "../../../citation-share-screen";

export const metadata: Metadata = { title: "Shared citation" };

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <CitationShareScreen token={token} />;
}
