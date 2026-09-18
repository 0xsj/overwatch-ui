import type { Metadata } from "next";
import { ExtractionScreen } from "./extraction-screen";

export const metadata: Metadata = { title: "Extraction quality" };

export default function Page() {
  return <ExtractionScreen />;
}
