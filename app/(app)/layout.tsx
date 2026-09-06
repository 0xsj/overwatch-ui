import type { ReactNode } from "react";
import { http } from "@/lib/root";
import { getShellContext } from "@/lib/services/shell";
import { AppShell } from "./_components/app-shell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const context = await getShellContext(http);

  return <AppShell context={context}>{children}</AppShell>;
}
