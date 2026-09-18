import type { Metadata } from "next";
import { AccessScreen } from "./access-screen";

export const metadata: Metadata = { title: "Access" };

export default function Page() {
  return <AccessScreen />;
}
