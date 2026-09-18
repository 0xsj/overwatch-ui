import type { Metadata } from "next";
import { AttributionsScreen } from "./attributions-screen";

export const metadata: Metadata = { title: "Attributions" };

export default function Page() {
  return <AttributionsScreen />;
}
