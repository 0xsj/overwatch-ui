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
import type { OrgRole } from "@/lib/services/tenancy";
import { loadShell } from "../../_shell";
import { PageHead } from "../../_components/page-head";
import { Owed } from "../../_components/owed";
import { InviteForm } from "./invite-form";
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
                  {/* READ-ONLY, and it was an editable dropdown until
                      2026-09-07. Nothing can change a role over HTTP, and a
                      control that cannot work is worse than a value that is
                      plainly just a value. */}
                  <Badge tone={ROLE_TONE[m.role]} mono>{m.role}</Badge>
                  {m.account_id === shell.me.account_id ? (
                    <Text size="xs" tone="quiet">this is you</Text>
                  ) : null}
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

      <Owed
        title="Changing a role, removing somebody, leaving"
        note="None of the three exists over HTTP. ErrLastOwner is declared in the backend and unreachable, so 'an org cannot lose its last owner' is true today only because nothing can remove one — which is why the roles above are read-only rather than a dropdown that would fail."
      />
    </>
  );
}
