import type { Metadata } from "next";
import { AllEntitiesScreen } from "./all-screen";

export const metadata: Metadata = { title: "All entities" };

export default function Page() {
  return <AllEntitiesScreen />;
}
