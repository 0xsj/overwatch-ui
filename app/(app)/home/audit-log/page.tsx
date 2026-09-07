import type { Metadata } from "next";
import { Panel } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { clientFor } from "@/lib/root";
import { getWorkspaceAudit, type AuditPage } from "@/lib/services/ledger";
import { loadShell } from "../../_shell";
import { PageHead } from "../../_components/page-head";
import { AuditTable } from "../../_components/audit-table";

const TITLE = "Audit log";
const SUB =
  "Who changed what in this engagement, and when. Scope edits and accepted attributions are here because both change what the record claims — and “who widened the scope” is a question that gets asked after an engagement, not during it.";

export const metadata: Metadata = { title: TITLE };

/** An ENGAGEMENT-level screen, and it was in org settings until 2026-09-07.
 *
 *  An audit entry has a scope of `system`, `account` or `workspace` and no org
 *  id, so "the audit log for my firm" is not a question the table can answer —
 *  and not one it should. An org-wide feed lists rows about engagements the
 *  reader may not be on, which is the wall `decisions/0005` exists to keep.
 *
 *  The honest org-shaped version, if one is ever wanted, is the workspace
 *  switcher in the chrome — which already shows exactly the engagements this
 *  caller may read — and never a single unfiltered feed. */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ after?: string }>;
}) {
  const { after } = await searchParams;
  const shell = await loadShell();
  const workspace = shell.context?.workspace;

  if (!workspace) {
    return (
      <>
        <PageHead title={TITLE}>{SUB}</PageHead>
        <Alert tone="info">
          <Text size="sm">No engagement is open, so there is no ledger to read.</Text>
        </Alert>
      </>
    );
  }

  let page: AuditPage | null = null;
  try {
    page = await getWorkspaceAudit(await clientFor("ledger"), workspace.workspace_id, {
      after,
      limit: 50,
    });
  } catch {
    page = null;
  }

  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>

      <Panel
        title={workspace.name}
        note="This engagement only. There is no organisation-wide log, because an entry about an engagement you are not on is a disclosure rather than a row."
      >
        {page ? (
          <AuditTable
            entries={page.entries}
            next={page.next}
            more={(cursor) => `/home/audit-log?after=${encodeURIComponent(cursor)}`}
          />
        ) : (
          <Text size="sm" tone="tertiary">
            Never checked — this engagement&rsquo;s ledger could not be read. That is
            not the same as nothing having happened in it.
          </Text>
        )}
      </Panel>
    </>
  );
}
