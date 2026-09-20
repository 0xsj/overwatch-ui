import type { Metadata } from "next";
import { RecipientHandoffScreen } from "../../handoff-screen";

export const metadata: Metadata = { title: "Recipient handoff" };

export default async function Page({ params }: { params: Promise<{ snapshot: string }> }) {
  const { snapshot } = await params;
  return <RecipientHandoffScreen snapshot={snapshot} />;
}
