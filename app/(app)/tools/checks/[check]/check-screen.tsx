"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import { PageHead } from "../../../_components/page-head";
import { useContext } from "../../../_hooks";
import {
  chainQuery, checksQuery, runsQuery, targetsQuery, toolsQuery,
} from "../../../_queries";
import { ArchiveCheck } from "../_components/archive-check";
import { CheckWorkspace } from "../_components/check-workspace";
import s from "../checks.module.css";

export function CheckScreen() {
  const id = String(useParams().check ?? "");
  const { org, workspace, shell } = useContext();
  const role = shell?.context?.org.role;

  /* There is no single-check read, so the list is filtered — which also means a
     404 and an empty org arrive the same way, and the copy says so. */
  const checksQ = useQuery({
    queryKey: keys.checks.list(org ?? ""),
    queryFn: () => checksQuery(org!),
    enabled: Boolean(org),
  });
  const check = checksQ.data?.find((c) => c.check_id === id) ?? null;

  const chainQ = useQuery({
    queryKey: keys.checks.chain(org ?? "", id),
    queryFn: () => chainQuery(org!, id),
    enabled: Boolean(org && check),
  });
  const toolsQ = useQuery({
    queryKey: keys.tooling.tools(org ?? ""),
    queryFn: () => toolsQuery(org!),
    enabled: Boolean(org),
  });
  /* Runs and targets are per ENGAGEMENT — a run is a claim about a client,
     which is the side of `0031`'s test that keeps the narrow key. The check is
     the firm's; its runs are not. */
  const runsQ = useQuery({
    queryKey: keys.runs.list(workspace ?? ""),
    queryFn: () => runsQuery(workspace!),
    enabled: Boolean(workspace),
  });
  const targetsQ = useQuery({
    queryKey: keys.targets.list(workspace ?? "", false),
    queryFn: () => targetsQuery(workspace!, false),
    enabled: Boolean(workspace),
  });

  if (checksQ.isPending || chainQ.isPending) {
    return <Text size="sm" tone="quiet">Reading the check…</Text>;
  }

  /* NOT `notFound()`, which is a claim. A 404 says "this check does not exist";
     when the read fails for any other reason the truth is "it could not be
     read", and the two are the `never checked vs found nothing` pair on a
     screen where the difference is a broken product and a missing record. */
  if (!check || !chainQ.data) {
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
      <PageHead
        title={check.name}
        actions={
          org && (role === "owner" || role === "admin") ? (
            <ArchiveCheck orgId={org} checkId={check.check_id} />
          ) : null
        }
      >
        {check.question}
      </PageHead>
      <Text size="xs" tone="quiet">
        A node here is a program and an edge is bytes moving between two of them.
        Nothing on this canvas is a claim about the world — that is the entity
        canvas, and the two are drawn differently on purpose.
      </Text>
      {/* KEYED, so moving between checks remounts rather than keeping the
          first one's graph. `useState(chain)` is state derived from a prop, and
          the only correct way to reset that is a new instance. */}
      <CheckWorkspace
        key={check.check_id}
        check={check}
        chain={chainQ.data}
        tools={toolsQ.data ?? []}
        runs={(runsQ.data?.runs ?? []).filter((r) => r.check_id === id)}
        targets={targetsQ.data ?? []}
        orgId={org!}
        workspaceId={workspace ?? null}
        workspaceName={shell?.context?.workspace.name ?? null}
      />
    </>
  );
}
