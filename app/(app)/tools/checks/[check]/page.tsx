import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { clientFor } from "@/lib/root";
import {
  getCheck,
  listRuns,
  listTools,
  previewSpawn,
  type Check,
} from "@/lib/services/pipeline";
import { loadShell } from "../../../_shell";
import { PageHead } from "../../../_components/page-head";
import { CheckWorkspace } from "../_components/check-workspace";
import s from "../checks.module.css";

export const metadata: Metadata = { title: "Check — Overwatch" };

export default async function Page({ params }: { params: Promise<{ check: string }> }) {
  const { check: id } = await params;
  const client = await clientFor("pipeline");
  const shell = await loadShell();

  /* NOT `notFound()`, which is a claim.
   *
   *  A 404 here says "this check does not exist". When the domain is unserved
   *  the truth is "nothing serves checks", and the two are the `never checked vs
   *  found nothing` pair one more time — on a screen where the difference is
   *  between a broken product and an unbuilt one. */
  let check: Check | null = null;
  try {
    check = await getCheck(client, id);
  } catch {
    check = null;
  }

  if (!check) {
    return (
      <>
        <Link href="/tools/checks" className={s.back}>← all checks</Link>
        <PageHead title="This check could not be read">
          Either nothing serves checks yet, or there is none under this id — and
          this screen cannot tell you which, because a refusal and an absence come
          back the same way.
        </PageHead>
        <Alert tone="info">
          <Text size="sm">
            <code>tool</code>, <code>check</code>, <code>run</code> and{" "}
            <code>invocation</code> are all UNBUILT in the workspace scope
            document. When they are served, this becomes an ordinary not-found.
          </Text>
        </Alert>
      </>
    );
  }

  const [tools, runs, preview] = await Promise.all([
    listTools(client).catch(() => []),
    listRuns(client, id).catch(() => []),
    // The gate's answer depends on the TARGET, so it is asked per engagement
    // rather than stored on the check — the same chain is permitted against one
    // engagement's scope and refused against another's.
    previewSpawn(client, id, shell.context?.workspace.name ?? "").catch(() => []),
  ]);

  return (
    <>
      <Link href="/tools/checks" className={s.back}>← all checks</Link>
      <PageHead title={check.name} mock>
        {check.question}
      </PageHead>
      <Text size="xs" tone="quiet">
        A node here is a program and an edge is bytes moving between two of them.
        Nothing on this canvas is a claim about the world — that is the entity
        canvas, and the two are drawn differently on purpose.
      </Text>
      <CheckWorkspace check={check} tools={tools} runs={runs} preview={preview} />
    </>
  );
}
