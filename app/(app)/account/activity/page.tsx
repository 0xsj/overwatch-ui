import type { Metadata } from "next";
import { ActivityScreen } from "./activity-screen";

export const metadata: Metadata = { title: "Your activity" };

export default function Page() {
  return <ActivityScreen />;
}
