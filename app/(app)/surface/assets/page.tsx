import type { Metadata } from "next";
import { AssetsScreen } from "./assets-screen";

export const metadata: Metadata = { title: "Assets" };

export default function Page() {
  return <AssetsScreen />;
}
