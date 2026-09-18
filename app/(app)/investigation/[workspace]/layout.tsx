import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { isAppError } from "@/lib/kernel";
import { loadInvestigationContext } from "../../_investigation-context";
import { InvestigationNav } from "../_shared";

export default async function InvestigationLayout({ children, params }: { children: ReactNode; params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  let context;
  try { context = await loadInvestigationContext(workspace); }
  catch (error) {
    if (isAppError(error) && error.status === 404) notFound();
    if (isAppError(error) && error.status === 401) redirect("/sign-in");
    throw error;
  }
  return <><InvestigationNav workspace={workspace} name={context.workspace.name} closed={context.workspace.closed} />{children}</>;
}
