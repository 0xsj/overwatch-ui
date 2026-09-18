import type { Metadata } from "next";
import { InstalledScreen } from "./installed-screen";

export const metadata: Metadata = { title: "Installed tools" };

export default function Page() {
  return <InstalledScreen />;
}
