import type { Metadata } from "next";
import { Mock, Panel } from "@/components/display";
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
import { clientFor } from "@/lib/root";
import { listGrants, type Grant } from "@/lib/services/access";
import { GRANT_MEANING } from "@/lib/services/tenancy";
import { loadShell } from "../../_shell";
import { PageHead } from "../../_components/page-head";
import { GrantCell } from "./grant-cell";
import s from "../settings.module.css";

const TITLE = "Access";
const SUB =
  "Which member is on which engagement. This is the grid a consultancy actually buys — a client contact who can read their own report and nothing else, and an analyst who cannot see the engagement they are not on.";

export const metadata: Metadata = { title: TITLE };

export default async function Page() {
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

  /* A grid of `none` when nothing could be read is a claim that nobody is on
     anything. Three states, so the screen can say which it is. */
  let known: Presence<Grant[]>;
  try {
    known = present(await listGrants(await clientFor("access"), org.org_id));
  } catch {
    known = unattempted();
  }
  const at = new Map(
    (isPresent(known) ? known.value : []).map((g) => [`${g.account_id}:${g.workspace_id}`, g.level]),
  );
  const manages = org.role === "owner" || org.role === "admin";

  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>

      <Alert tone="info">
        <Text size="sm">
          This is <strong>not</strong> the same permission as Members. An{" "}
          <code>admin</code> manages people — invite, remove, change a role — and is
          granted an engagement like anybody else. Promoting somebody to handle
          invitations must not hand them every client&rsquo;s wall.
        </Text>
      </Alert>

      {isPresent(known) ? null : (
        <Alert tone="warn">
          <Text size="sm">
            No grant endpoint exists over HTTP and this session is not a fixture
            persona, so nothing below has been read. Every cell shows{" "}
            <code>none</code> because nothing was asked — which is not the same as
            nobody being on anything.
          </Text>
        </Alert>
      )}

      <Panel
        title="Members × engagements"
        note={Object.entries(GRANT_MEANING)
          .map(([level, meaning]) => `${level} — ${meaning}`)
          .join(" · ")}
        actions={<Mock note="No grant endpoint exists over HTTP. decisions/0019 defines the model and grants can only be written directly in the database today, so every cell here reaches a fixture." />}
        bleed
      >
        <div className={s.gridScroll}>
          <Table className={s.grid}>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Person</TableHeaderCell>
                {org.workspaces.map((w) => (
                  <TableHeaderCell key={w.workspace_id}>{w.name}</TableHeaderCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {shell.members.map((m) => (
                <TableRow key={m.account_id}>
                  <TableCell>
                    <div className={s.who}>
                      <span className={s.name}>{m.name}</span>
                      <span className={s.email}>{m.role}</span>
                    </div>
                  </TableCell>
                  {org.workspaces.map((w) => (
                    <TableCell key={w.workspace_id}>
                      <div className={s.cell}>
                        {/* The owner is the ONE exemption: admin on every
                            engagement with no grant row written, because the
                            firm's principal is accountable for every engagement
                            it runs. There is nothing to edit, so nothing is
                            offered — an editable cell here would write a row
                            that changes nothing. */}
                        {m.role === "owner" ? (
                          <span className={s.exempt} title="The org owner is admin everywhere, with no grant written.">
                            owner
                          </span>
                        ) : (
                          <GrantCell
                            orgId={org.org_id}
                            workspaceId={w.workspace_id}
                            accountId={m.account_id}
                            level={at.get(`${m.account_id}:${w.workspace_id}`) ?? "none"}
                            editable={manages}
                          />
                        )}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>
    </>
  );
}
