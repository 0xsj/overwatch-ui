import type { Metadata } from "next";
import { LineageScreen } from "./lineage-screen";

export const metadata: Metadata = { title: "Lineage" };

export default function Page() {
  return <LineageScreen />;
}
