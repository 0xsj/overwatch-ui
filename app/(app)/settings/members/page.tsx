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
import { listWorkspaces, type OrgRole } from "@/lib/services/tenancy";
import { clientFor } from "@/lib/root";
import { listWorkspaceMembers } from "@/lib/services/access";
import { loadShell } from "../../_shell";
import { PageHead } from "../../_components/page-head";
import { Owed } from "../../_components/owed";
import { InviteForm } from "./invite-form";
import { MemberRow } from "./member-row";
import s from "../settings.module.css";

const TITLE = "Members";
const SUB =
  "Who is in this organisation and what they can do. A claimant is an account, so every human attribution in the record points at a row on this screen — which is why removing somebody archives them rather than deleting them.";

export const metadata: Metadata = { title: TITLE };

/** `guest` and `client` are the two that face outward, and they are toned apart
 *  from the three inside the firm because both will carry a time box that does
 *  not exist yet. */
const ROLE_TONE: Record<OrgRole, "accent" | "info" | "neutral"> = {
  owner: "accent",
  admin: "accent",
  member: "neutral",
  guest: "info",
  client: "info",
};

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

  const manages = org.role === "owner" || org.role === "admin";

  /* How many engagements each person is on, so the removal confirmation can name
     the cost.
     
     Counted from the LISTING and not from `/v1/me`, which is the correction that
     matters: `/v1/me` excludes closed engagements, and removal deletes grants on
     those too. Counting from the switcher's source undercounts, and the number
     in that dialog is the whole reason the dialog exists.

     One call per engagement. `ALIGNMENT.md` says to show it "from the seat lists
     it already has", and there is no org-wide grants read by design — a
     workspace the caller cannot see 404s rather than appearing empty. Fine at a
     firm's worth of engagements and wrong at a thousand; the answer then is an
     endpoint, not a cache here. */
  const seats = new Map<string, number>();
  if (manages) {
    const [access, tenancy] = [await clientFor("access"), await clientFor("tenancy")];
    const every = await listWorkspaces(tenancy, org.org_id).catch(() => []);
    const lists = await Promise.all(
      every.map((w) => listWorkspaceMembers(access, w.workspace_id).catch(() => [])),
    );
    for (const list of lists)
      for (const row of list) seats.set(row.account_id, (seats.get(row.account_id) ?? 0) + 1);
  }

  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>

      <Panel
        title="In this organisation"
        note={
          shell.members.length === 1
            ? "One row, and that is a correct state rather than an empty one."
            : `${shell.members.length} people.`
        }
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Person</TableHeaderCell>
              <TableHeaderCell>Role</TableHeaderCell>
              <TableHeaderCell>Joined</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shell.members.map((m) => (
              <TableRow key={m.account_id}>
                <TableCell>
                  <div className={s.who}>
                    <span className={s.name}>{m.name}</span>
                    <span className={s.email}>{m.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {manages ? (
                    <MemberRow
                      orgId={org.org_id}
                      accountId={m.account_id}
                      role={m.role}
                      name={m.name}
                      self={m.account_id === shell.me.account_id}
                      mayActOnOwners={org.role === "owner"}
                      seats={seats.get(m.account_id) ?? 0}
                    />
                  ) : (
                    <Badge tone={ROLE_TONE[m.role]} mono>{m.role}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <span className={s.muted}>{m.joined_at.slice(0, 10)}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>

      {manages ? (
        <Panel
          title="Invite somebody"
          note="One flow, one email, one accepted state — the invitation carries the first engagement with it."
        >
          <Alert tone="info">
            <Text size="sm">
              An invitation that carries no engagement lands somebody in an
              organisation where they can see <strong>nothing</strong> — an empty
              grant set means <code>none</code>, and <code>none</code> means
              invisible. That is correct and it is the worst possible first screen,
              which is why the engagement is part of the invitation rather than a
              second job somebody has to remember.
            </Text>
          </Alert>
          <InviteForm orgId={org.org_id} workspaces={org.workspaces} />
        </Panel>
      ) : (
        <Alert tone="info">
          <Text size="sm">
            Only an owner or an admin can invite. You can see who is here, which is
            what a member needs in order to know who claimed what.
          </Text>
        </Alert>
      )}

      {/* No list endpoint: `GET /v1/orgs/{org}/invites` is 405 and there is no
          read for a single one either. So a "waiting" list cannot be built, and
          saying that beats an empty panel that reads as "nobody is waiting". */}
      {manages ? (
        <Owed
          title="Invitations still waiting"
          note="Nothing lists them. An invitation can be sent and withdrawn by id, and there is no endpoint that reads one back — so this screen cannot tell you who has not accepted yet. It is in ALIGNMENT.md as a request rather than guessed at."
        />
      ) : null}

      <Alert tone="info">
        <Text size="sm">
          <strong>There is no transfer-ownership button, and that is two calls
          rather than one.</strong> Promote somebody to <code>owner</code>, then
          demote yourself. The other order is refused, correctly — it has a moment
          with no owner in it.
        </Text>
        <Text size="sm" tone="tertiary">
          Demoting caps somebody&rsquo;s access and is reversible. Removing deletes
          every grant they hold, and re-inviting them starts from nothing.
        </Text>
      </Alert>
    </>
  );
}
