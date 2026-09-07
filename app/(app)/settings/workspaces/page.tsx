import type { Metadata } from "next";
import { Badge, Panel } from "@/components/display";
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
import { loadShell } from "../../_shell";
import { PageHead } from "../../_components/page-head";
import { OpenWorkspaceForm } from "./open-form";

const TITLE = "Engagements";
const SUB =
  "The unit of work — CTF1, a client engagement, a quarter's retainer. Everything in the product carries one, and the wall a consultancy is buying is drawn here rather than around a target.";

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

  const mayOpen = org.role === "owner" || org.role === "admin";

  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>

      <Panel
        title="Engagements you can see"
        note="Not the organisation's total. One you have no grant on is absent from this list, and that is the wall working rather than a filter."
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Your access</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {org.workspaces.map((w) => (
              <TableRow key={w.workspace_id}>
                <TableCell>{w.name}</TableCell>
                <TableCell><Badge tone="neutral" mono>{w.access}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>

      {mayOpen ? (
        <Panel
          title="Open a new engagement"
          note="You are admin on what you open, and it appears above as soon as the grant is written."
        >
          {shell.me.verified ? null : (
            <Alert tone="warn">
              <Text size="sm">
                Confirm your email address first. An unproven address must not end up
                on a client&rsquo;s record, so the server refuses this until it is —
                and tells you why rather than hiding the control.
              </Text>
            </Alert>
          )}
          <OpenWorkspaceForm orgId={org.org_id} />
        </Panel>
      ) : (
        <Alert tone="info">
          <Text size="sm">
            Only an owner or an admin opens an engagement. You already know this
            organisation exists, so there is nothing left to disclose — what you
            need is the reason, and this is it.
          </Text>
        </Alert>
      )}

      <Panel title="Renaming and closing">
        <Text size="sm" tone="tertiary">
          `Workspace.Rename` and `Workspace.Archive` both exist in the backend with
          no caller. Closing is not deleting — the record is what the product exists
          to keep — and neither has an endpoint yet.
        </Text>
      </Panel>
    </>
  );
}
