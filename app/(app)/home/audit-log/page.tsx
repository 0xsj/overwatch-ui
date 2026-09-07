import type { Metadata } from "next";
import Link from "next/link";
import { Panel } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { clientFor } from "@/lib/root";
import { getWorkspaceAudit, type AuditPage } from "@/lib/services/ledger";
import { listWorkspaces } from "@/lib/services/tenancy";
import { loadShell } from "../../_shell";
import { PageHead } from "../../_components/page-head";
import { AuditTable } from "../../_components/audit-table";
import { FacetRow } from "../../_components/facet-row";

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
  searchParams: Promise<{ after?: string; facet?: string; workspace?: string }>;
}) {
  const { after, facet, workspace: wanted } = await searchParams;
  const shell = await loadShell();

  /* `?workspace=` exists for the CLOSED case, and only for it.
   *
   *  An engagement id can now stop appearing in `/v1/me` without being deleted
   *  and without the caller losing access — `decisions/0027`. So the old rule,
   *  *absent from `/v1/me` means gone or forbidden*, is no longer safe:
   *
   *      absent + 404 from its endpoints   no grant. Not yours to see
   *      absent + 200 from its audit       CLOSED. Yours, and read-only
   *
   *  The chrome's workspace can only ever be a live one, so a closed
   *  engagement's record would be unreachable without this — and reading it is
   *  precisely what closing is supposed to leave you. Reached from the Closed
   *  section on the engagements screen. */
  const listed = wanted
    ? await listWorkspaces(await clientFor("tenancy"), shell.context?.org.org_id ?? "")
        .then((all) => all.find((w) => w.workspace_id === wanted))
        .catch(() => undefined)
    : undefined;

  const workspace = listed ?? shell.context?.workspace;

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
      facet,
      limit: 50,
    });
  } catch {
    page = null;
  }

  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>

      {listed?.closed ? (
        <Alert tone="warn">
          <Text size="sm">
            <strong>{listed.name} is closed.</strong> Its record stays readable and
            nothing can be done in it — which is the point of closing rather than
            deleting. Reopen it from{" "}
            <Link href="/settings/workspaces">Engagements</Link>.
          </Text>
        </Alert>
      ) : null}

      <Panel
        title={workspace.name}
        note="This engagement only. There is no organisation-wide log, because an entry about an engagement you are not on is a disclosure rather than a row."
      >
        {page ? (
          <>
            <FacetRow
              facets={page.facets ?? []}
              active={facet}
              href={(f) => (f ? `/home/audit-log?facet=${encodeURIComponent(f)}` : "/home/audit-log")}
            />
            <AuditTable
              entries={page.entries}
              next={page.next}
              more={(cursor) => `/home/audit-log?after=${encodeURIComponent(cursor)}`}
              /* An engagement provisioned at signup has an EMPTY log and that is
                 correct: `workspace.created` is work and `workspace.opened` is
                 the decision — 0020 — so nobody chose to open `Personal`. It is
                 the first thing a new user sees here, and an empty list with no
                 explanation reads as broken. */
              empty={
                facet
                  ? `Nothing under “${facet}” on this engagement.`
                  : "Nothing has been recorded on this engagement yet. An engagement provisioned when you registered has an empty log because nobody chose to open it — one you started yourself has an entry from the moment it exists."
              }
            />
          </>
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
