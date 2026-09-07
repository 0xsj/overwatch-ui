import type { Metadata } from "next";
import Link from "next/link";
import { Panel } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { clientFor } from "@/lib/root";
import { getOrgAudit, type AuditPage } from "@/lib/services/ledger";
import { loadShell } from "../../_shell";
import { PageHead } from "../../_components/page-head";
import { AuditTable } from "../../_components/audit-table";
import { FacetRow } from "../../_components/facet-row";
import s from "../settings.module.css";

const TITLE = "Organisation log";
const SUB =
  "Membership, roles and invitations — who joined this firm, who was invited, and who changed what about people. Every member may read it.";

export const metadata: Metadata = { title: TITLE };

/** The FIRM's log, and a different screen from an engagement's.
 *
 *  This route existed until 2026-09-07, was deleted as unsafe, and is back
 *  narrower — which is worth knowing, because the reasoning changed rather than
 *  the mind. The objection was that an org-wide feed lists rows about
 *  engagements the reader may not be on. The answer is a database constraint: an
 *  org-scope entry can NEVER name a workspace, and that is the only reason this
 *  is safe to serve at all.
 *
 *  So these are two screens rather than one with a filter, and this one must
 *  never try to show engagement activity. `home/audit-log` is the other. */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ after?: string; facet?: string }>;
}) {
  const { after, facet } = await searchParams;
  const shell = await loadShell();
  const org = shell.context?.org;

  if (!org) {
    return (
      <>
        <PageHead title={TITLE}>{SUB}</PageHead>
        <Alert tone="info"><Text size="sm">No organisation yet.</Text></Alert>
      </>
    );
  }

  let page: AuditPage | null = null;
  try {
    page = await getOrgAudit(await clientFor("ledger"), org.org_id, { after, facet, limit: 50 });
  } catch {
    page = null;
  }

  const href = (f?: string) =>
    f ? `/settings/audit-log?facet=${encodeURIComponent(f)}` : "/settings/audit-log";

  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>

      <Alert tone="info">
        <Text size="sm">
          Engagement activity is not here and cannot be. An entry at this level
          never names a workspace, which is what makes the firm-wide log safe to
          show every member — for one engagement&rsquo;s record, open it and use{" "}
          <Link href="/home/audit-log" className={s.link}>its own log</Link>.
        </Text>
      </Alert>

      <Panel title={org.name}>
        {page ? (
          <>
            <FacetRow facets={page.facets ?? []} active={facet} href={href} />
            <AuditTable
              entries={page.entries}
              next={page.next}
              more={(cursor) =>
                `${href(facet)}${href(facet).includes("?") ? "&" : "?"}after=${encodeURIComponent(cursor)}`
              }
              empty={
                facet
                  ? `Nothing under “${facet}”. The counts above are for the whole log, so another facet may still have rows.`
                  : "Nobody has joined, been invited, or had their role changed yet."
              }
              chainHref={(id) => `/home/audit-log/${id}`}
            />
          </>
        ) : (
          <Text size="sm" tone="tertiary">
            Never checked — this organisation&rsquo;s log could not be read.
          </Text>
        )}
      </Panel>
    </>
  );
}
