import type { Metadata } from "next";
import { RecipientHandoffScreen } from "../../../handoff-screen";

export const metadata: Metadata = { title: "Shared recipient handoff" };

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <RecipientHandoffScreen shareToken={token} />;
}
