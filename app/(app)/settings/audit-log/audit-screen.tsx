"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Panel } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import { useContext } from "../../_hooks";
import { orgAuditQuery } from "../../_queries";
import { PageHead } from "../../_components/page-head";
import { AuditTable } from "../../_components/audit-table";
import { FacetRow } from "../../_components/facet-row";
import s from "../settings.module.css";

const TITLE = "Organisation log";
const SUB =
  "Membership, roles and invitations — who joined this firm, who was invited, and who changed what about people. Every member may read it.";

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
export function OrgAuditScreen() {
  const { org } = useContext();
  const params = useSearchParams();
  const after = params.get("after") ?? undefined;
  const facet = params.get("facet") ?? undefined;

  const q = useQuery({
    queryKey: keys.ledger.org(org ?? "", after, facet),
    queryFn: () => orgAuditQuery(org!, after, facet),
    enabled: Boolean(org),
  });

  if (!org) {
    return (
      <>
        <PageHead title={TITLE}>{SUB}</PageHead>
        <Alert tone="info"><Text size="sm">No organisation yet.</Text></Alert>
      </>
    );
  }

  const page = q.isSuccess ? q.data : null;

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

      <Panel title="The firm's log">
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
