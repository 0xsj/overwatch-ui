import type { Metadata } from "next";
import { ChecksScreen } from "./checks-screen";

export const metadata: Metadata = { title: "Checks" };

export default function Page() {
  return <ChecksScreen />;
}
