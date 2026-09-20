import type { Metadata } from "next";
import { PlacesScreen } from "../../places-screen";

export const metadata: Metadata = { title: "Place geometry" };

export default async function Page({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  return <PlacesScreen workspace={workspace} />;
}
