"use client";

import { useQuery } from "@tanstack/react-query";
import { Panel } from "@/components/display";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/display";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { isPresent, present, unattempted, type Presence } from "@/lib/kernel";
import { keys } from "@/lib/query";
import type { WorkspaceMember } from "@/lib/services/access";
import { GRANT_MEANING } from "@/lib/services/tenancy";
import { useContext } from "../../_hooks";
import { workspaceMembersQuery } from "../../_queries";
import { PageHead } from "../../_components/page-head";
import { LevelCell } from "./level-cell";
import s from "../settings.module.css";

const TITLE = "Access";
const SUB =
  "Who is on this engagement. This is the grid a consultancy actually buys — a client contact who can read their own report and nothing else, and an analyst who cannot see the engagement they are not on.";

/** ONE engagement, not a members × workspaces matrix.
 *
 *  The rows come from `GET /v1/workspaces/{id}/members`, and there is no
 *  org-wide grants read — which is not a missing endpoint but the same rule the
 *  whole model runs on. A workspace the caller cannot see answers 404, so a
 *  matrix would have to ask for engagements it may not know exist, and would
 *  disclose them by the shape of what came back. */
export function AccessScreen() {
  const { workspace, shell } = useContext();

  const rowsQ = useQuery({
    queryKey: keys.access.grants(workspace ?? ""),
    queryFn: () => workspaceMembersQuery(workspace!),
    enabled: Boolean(workspace),
  });

  if (!workspace || !shell) {
    return (
      <>
        <PageHead title={TITLE}>{SUB}</PageHead>
        <Alert tone="info"><Text size="sm">No engagement is open.</Text></Alert>
      </>
    );
  }

  /* A FAILED read is not an empty one — the pair this whole product is built
     on, and the place a query library makes it easiest to get wrong. `unattempted`
     when the read did not happen; `present` with an empty array is a real
     answer meaning nobody has a seat. */
  const rows: Presence<WorkspaceMember[]> = rowsQ.isSuccess
    ? present(rowsQ.data)
    : unattempted();

  // Granting needs `admin` ON THIS ENGAGEMENT, which is not the same as being
  // an org admin — an org admin with no grant here cannot see it at all.
  const mayGrant = shell.context?.workspace.access === "admin";

  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>

      <Alert tone="info">
        <Text size="sm">
          This is <strong>not</strong> the same permission as Members. An{" "}
          <code>admin</code> manages people — invite, remove, change a role — and is
          granted an engagement like anybody else. Granting here needs{" "}
          <code>admin</code> on <strong>{shell.context?.workspace.name}</strong>, and you hold{" "}
          <code>{shell.context?.workspace.access}</code>.
        </Text>
      </Alert>

      <Panel
        title={`On ${shell.context?.workspace.name}`}
        note={
          "Everybody here can see this engagement. Somebody with no access is not a row with `none` — they are absent, because a greyed row tells you a person exists who cannot see this."
        }
      >
        {!isPresent(rows) ? (
          <Text size="sm" tone="tertiary">
            Never checked — this engagement&rsquo;s access list could not be read.
            That is not the same as nobody being on it.
          </Text>
        ) : (
          <Table className={s.accessTable} aria-label="Engagement access">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Person</TableHeaderCell>
                <TableHeaderCell>Role in the firm</TableHeaderCell>
                <TableHeaderCell>On this engagement</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.value.map((m) => (
                <TableRow key={m.account_id}>
                  <TableCell data-label="Person">
                    <div className={s.who}>
                      <span className={s.name}>{m.name}</span>
                      <span className={s.email}>{m.email}</span>
                    </div>
                  </TableCell>
                  <TableCell data-label="Organisation role"><span className={s.muted}>{m.role}</span></TableCell>
                  <TableCell data-label="Engagement access">
                    <LevelCell
                      workspaceId={workspace}
                      accountId={m.account_id}
                      name={m.name}
                      role={m.role}
                      access={m.access}
                      editable={mayGrant}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      <Panel title="What each level covers">
        <dl className={s.legend}>
          {(Object.keys(GRANT_MEANING) as (keyof typeof GRANT_MEANING)[]).map((k) => (
            <div key={k} className={s.legendRow}>
              <dt><code>{k}</code></dt>
              <dd><Text size="xs" tone="tertiary">{GRANT_MEANING[k]}</Text></dd>
            </div>
          ))}
        </dl>
      </Panel>
    </>
  );
}
