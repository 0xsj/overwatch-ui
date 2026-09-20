import type { Metadata } from "next";
import { RecipientHandoffsScreen } from "./handoffs-screen";

export const metadata: Metadata = { title: "Recipient handoffs" };

export default function Page() {
  return <RecipientHandoffsScreen />;
}
