import type { Metadata } from "next";
import { WhatsNewScreen } from "./whats-new-screen";

export const metadata: Metadata = { title: "What's new" };

export default function Page() {
  return <WhatsNewScreen />;
}
