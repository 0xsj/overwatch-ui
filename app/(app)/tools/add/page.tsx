import type { Metadata } from "next";
import { AddToolScreen } from "./add-screen";

export const metadata: Metadata = { title: "Add a tool" };

export default function Page() {
  return <AddToolScreen />;
}
