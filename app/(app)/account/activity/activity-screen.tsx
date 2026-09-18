"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Panel } from "@/components/display";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import { myActivityQuery } from "../../_queries";
import { PageHead } from "../../_components/page-head";
import { AuditTable } from "../../_components/audit-table";
import { FacetRow } from "../../_components/facet-row";

const TITLE = "Your record";
const SUB =
  "What is attached to your name. The audit log answers this for an engagement; this answers it for you — and it is the question people ask after an engagement rather than during it.";

export function ActivityScreen() {
  const params = useSearchParams();
  const after = params.get("after") ?? undefined;
  const facet = params.get("facet") ?? undefined;

  const q = useQuery({
    queryKey: keys.ledger.mine(after, facet),
    queryFn: () => myActivityQuery(after, facet),
  });
  const page = q.isSuccess ? q.data : null;

  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>

      <Panel
        title="Your account's entries"
        note="Yours only. It takes no id, because it is not a way to read anybody else's."
      >
        {page ? (
          <>
            <FacetRow
              facets={page.facets ?? []}
              active={facet}
              href={(f) => (f ? `/account/activity?facet=${encodeURIComponent(f)}` : "/account/activity")}
            />
            <AuditTable
              entries={page.entries}
              next={page.next}
              more={(cursor) => `/account/activity?after=${encodeURIComponent(cursor)}`}
              empty={facet ? `Nothing under “${facet}”.` : "Nothing is attached to your name yet."}
            />
          </>
        ) : (
          <Text size="sm" tone="tertiary">
            Never checked — your record could not be read. That is not the same as
            it being empty.
          </Text>
        )}
      </Panel>
    </>
  );
}
