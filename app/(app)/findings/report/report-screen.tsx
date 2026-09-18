"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Badge, Panel } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import { PageHead } from "../../_components/page-head";
import { NoWorkspace, Query, useContext } from "../../_hooks";
import { reportPreviewQuery, reportQuery, reportsQuery } from "../../_queries";
import { SectionToggle } from "./section-toggle";
import { IssueButton } from "./issue-button";
import s from "../../surface/surface.module.css";

const TITLE = "Report";
const SUB =
  "A report is a configuration; issuing it freezes bytes. A section is a capability — what you leave out is named in the document rather than quietly missing.";

export function ReportScreen() {
  const { workspace } = useContext();
  const chosen = useSearchParams().get("report") ?? undefined;

  const list = useQuery({
    queryKey: keys.reports.list(workspace ?? ""),
    queryFn: () => reportsQuery(workspace!),
    enabled: Boolean(workspace),
  });
  const id = chosen ?? list.data?.[0]?.report_id;

  const report = useQuery({
    queryKey: keys.reports.one(workspace ?? "", id ?? ""),
    queryFn: () => reportQuery(workspace!, id!),
    enabled: Boolean(workspace && id),
  });

  /* The SAME render `issue` freezes — byte for byte. Two implementations of one
     render drift, and the one that drifts is the preview, which is the half
     somebody reads before deciding. */
  const preview = useQuery({
    queryKey: keys.reports.preview(workspace ?? "", id ?? ""),
    queryFn: () => reportPreviewQuery(workspace!, id!),
    enabled: Boolean(workspace && id),
  });

  if (!workspace) {
    return (
      <>
        <PageHead title={TITLE}>{SUB}</PageHead>
        <NoWorkspace what="A report" />
      </>
    );
  }

  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>

      <Query of={list} label="the reports">
        {(all) =>
          all.length === 0 ? (
            <Text size="sm" tone="tertiary">
              No report opened yet. A report is a configuration you keep and
              issue from, not a button that produces a file.
            </Text>
          ) : (
            <div className={s.cells}>
              {all.map((r) => (
                <Link key={r.report_id} href={`/findings/report?report=${encodeURIComponent(r.report_id)}`}>
                  <Badge tone={r.report_id === id ? "accent" : "neutral"} mono>
                    {r.title} · {r.revisions} issued
                  </Badge>
                </Link>
              ))}
            </div>
          )
        }
      </Query>

      {id ? (
        <Query of={report} label="that report">
          {(r) => (
            <>
              <Panel
                title="What goes in"
                note="All seven, always — the toggles that are OFF are the ones this screen most needs to draw."
              >
                <div className={s.rows}>
                  {r.sections.map((section) => (
                    <SectionToggle
                      key={section.key}
                      workspaceId={workspace}
                      reportId={r.report_id}
                      section={section}
                    />
                  ))}
                </div>
              </Panel>

              <Alert tone="info">
                <Text size="sm">
                  A disabled section is <strong>absent</strong> from the issued
                  document rather than present and empty — an empty section reads
                  as <em>we looked and there was nothing</em>. What was left out
                  is named in the document instead.
                </Text>
              </Alert>

              <Panel
                title="Preview"
                note="Byte for byte what issuing would freeze — the same function, so there is no second render to drift."
              >
                <Query of={preview} label="the preview">
                  {(rev) => (
                    <>
                      {rev.withheld.length > 0 ? (
                        <Text size="xs" tone="tertiary">
                          withheld: {rev.withheld.join(", ")}
                        </Text>
                      ) : null}
                      <div className={s.steps}>
                        {rev.sections.map((sec) => (
                          <div key={sec.key} className={s.step}>
                            <span className={s.drawerRow}>
                              <Badge mono>{sec.number}</Badge>
                              <span className={s.value}>{sec.title}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </Query>
              </Panel>

              <IssueButton workspaceId={workspace} reportId={r.report_id} revisions={r.revisions} />
            </>
          )}
        </Query>
      ) : null}
    </>
  );
}
