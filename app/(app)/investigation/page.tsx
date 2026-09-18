import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loadShell } from "../_shell";
import { InvestigationsScreen } from "./investigations-screen";
export const metadata: Metadata = { title: "Investigations" };
export default async function Page() {
  const shell = await loadShell();
  if (shell.context?.org.role === "client") redirect("/findings/report");
  return <InvestigationsScreen />;
}
