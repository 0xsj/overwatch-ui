import type { Metadata } from "next";
import { HealthScreen } from "./health-screen";

export const metadata: Metadata = { title: "Health" };

export default function Page() {
  return <HealthScreen />;
}
