import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { clientFor } from "@/lib/root";
import { listChecks, readChain, type Chain, type Check } from "@/lib/services/checks";
import { listTools, type Tool } from "@/lib/services/tooling";
import { listRuns, type Run } from "@/lib/services/runs";
import { listTargets, type Target } from "@/lib/services/targets";
import { loadShell } from "../../../_shell";
import { PageHead } from "../../../_components/page-head";
import { CheckWorkspace } from "../_components/check-workspace";
import s from "../checks.module.css";

export const metadata: Metadata = { title: "Check — Overwatch" };

export default async function Page({ params }: { params: Promise<{ check: string }> }) {
  const { check: id } = await params;
  const shell = await loadShell();
  const org = shell.context?.org;
  const workspace = shell.context?.workspace;

  /* NOT `notFound()`, which is a claim.
   *
   *  A 404 here says "this check does not exist". When the read fails for any
   *  other reason the truth is "it could not be read", and the two are the
   *  `never checked vs found nothing` pair on a screen where the difference is
   *  between a broken product and a missing record. There is no single-check
   *  read, so the list is filtered — which also means a 404 and an empty org
   *  arrive the same way, and the copy says so. */
  let check: Check | null = null;
  let chain: Chain | null = null;
  let tools: Tool[] = [];
  let runs: Run[] = [];
  let targets: Target[] = [];

  if (org) {
    const checksClient = await clientFor("checks");
    try {
      const all = await listChecks(checksClient, org.org_id);
      check = all.find((c) => c.check_id === id) ?? null;
    } catch {
      check = null;
    }
    if (check) {
      [chain, tools] = await Promise.all([
        readChain(checksClient, org.org_id, id).catch(() => null),
        listTools(await clientFor("tooling"), org.org_id).catch(() => []),
      ]);
      if (workspace) {
        // Runs and targets are per ENGAGEMENT — a run is a claim about a
        // client, which is the side of 0031's test that keeps the narrow key.
        // The check is the firm's; its runs are not.
        //
        // Live targets only. A closed one is readable and not workable, so
        // offering it as something to run against would be offering an act
        // that is going to be refused.
        [runs, targets] = await Promise.all([
          listRuns(await clientFor("runs"), workspace.workspace_id)
            .then((page) => page.runs.filter((r) => r.check_id === id))
            .catch(() => []),
          listTargets(await clientFor("targets"), workspace.workspace_id).catch(() => []),
        ]);
      }
    }
  }

  if (!check || !chain) {
    return (
      <>
        <Link href="/tools/checks" className={s.back}>← all checks</Link>
        <PageHead title="This check could not be read">
          Either there is none under this id, or the list could not be read — and
          this screen cannot tell you which, because a refusal and an absence come
          back the same way.
        </PageHead>
        <Alert tone="info">
          <Text size="sm">
            Checks belong to the organisation rather than to an engagement, so a
            check from another firm reads exactly like one that does not exist.
            That is the non-disclosure rule working, not a fault.
          </Text>
        </Alert>
      </>
    );
  }

  return (
    <>
      <Link href="/tools/checks" className={s.back}>← all checks</Link>
      <PageHead title={check.name}>{check.question}</PageHead>
      <Text size="xs" tone="quiet">
        A node here is a program and an edge is bytes moving between two of them.
        Nothing on this canvas is a claim about the world — that is the entity
        canvas, and the two are drawn differently on purpose.
      </Text>
      <CheckWorkspace
        check={check}
        chain={chain}
        tools={tools}
        runs={runs}
        targets={targets}
        orgId={org!.org_id}
        workspaceId={workspace?.workspace_id ?? null}
        workspaceName={workspace?.name ?? null}
      />
    </>
  );
}
