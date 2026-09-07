import type { Metadata } from "next";
import { Badge, Mock, Panel } from "@/components/display";
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
import { absent, isPresent, present, unattempted, type Presence } from "@/lib/kernel";
import { clientFor } from "@/lib/root";
import { listInvites, type Invite } from "@/lib/services/access";
import type { OrgRole } from "@/lib/services/tenancy";
import { loadShell } from "../../_shell";
import { PageHead } from "../../_components/page-head";
import { InviteForm } from "./invite-form";
import { MemberRoleControl } from "./role-control";
import s from "../settings.module.css";

const TITLE = "Members";
const SUB =
  "Who is in this organisation and what they can do. A claimant is an account, so every human attribution in the record points at a row on this screen — which is why removing somebody archives them rather than deleting them.";

export const metadata: Metadata = { title: TITLE };

/** The three that are inside the firm, then the two that face outward. Kept as
 *  a rendered distinction rather than a comment: `guest` and `client` are the
 *  two roles that will carry a time box, and somebody choosing one should see
 *  that they are choosing something different in kind. */
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

  /* Three states, not two. An empty list means nobody has been invited; a
     refusal means nothing was asked, because no invite endpoint exists and this
     session is not a fixture persona. Rendering the second as the first is the
     `never checked vs found nothing` collapse §Scope refuses, on the one screen
     where "nobody is waiting" is a claim somebody might act on. */
  let waiting: Presence<Invite[]>;
  try {
    const all = await listInvites(await clientFor("access"), org.org_id);
    const pending = all.filter((i) => i.state === "pending");
    waiting = pending.length ? present(pending) : absent();
  } catch {
    waiting = unattempted();
  }
  const invites = isPresent(waiting) ? waiting.value : [];

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
                  {manages ? (
                    <MemberRoleControl
                      orgId={org.org_id}
                      accountId={m.account_id}
                      role={m.role}
                      self={m.account_id === shell.me.account_id}
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
        <>
          <Panel
            title="Invite somebody"
            note="One flow, one email, one accepted state — the invitation carries the first engagement with it."
            actions={<Mock note="No invite endpoint exists. decisions/0019 defines the model; the commands that write it arrive with this flow, so everything here reaches a fixture." />}
          >
            <Alert tone="info">
              <Text size="sm">
                An invitation that carries no engagement lands somebody in an
                organisation where they can see <strong>nothing</strong> — an empty
                grant set means <code>none</code>, and <code>none</code> means
                invisible. That is technically correct and a terrible first screen,
                which is why the engagement is part of the invitation rather than a
                second job somebody has to remember.
              </Text>
            </Alert>
            <InviteForm orgId={org.org_id} workspaces={org.workspaces} />
          </Panel>

          <Panel
            title="Waiting"
            note={
              waiting.state === "absent"
                ? "Nobody has been invited."
                : waiting.state === "unattempted"
                  ? "Never checked — there is no invite endpoint, and this session is not a fixture persona. That is not the same as nobody waiting."
                  : undefined
            }
            actions={isPresent(waiting) ? <Mock /> : undefined}
          >
            {invites.length === 0 ? null : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Address</TableHeaderCell>
                    <TableHeaderCell>As</TableHeaderCell>
                    <TableHeaderCell>Starts on</TableHeaderCell>
                    <TableHeaderCell>Link expires</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invites.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell><span className={s.email}>{i.email}</span></TableCell>
                      <TableCell><Badge tone={ROLE_TONE[i.role]} mono>{i.role}</Badge></TableCell>
                      <TableCell>
                        {i.first_grant ? (
                          <span className={s.row}>
                            {i.first_grant.workspace_name}
                            <Badge tone="neutral" mono>{i.first_grant.level}</Badge>
                          </span>
                        ) : (
                          <span className={s.muted}>nothing yet</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={s.muted}>{i.expires_at.slice(0, 10)}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Panel>
        </>
      ) : (
        <Alert tone="info">
          <Text size="sm">
            Only an owner or an admin can invite and change roles. You can see who is
            here, which is what a member needs to know who claimed what.
          </Text>
        </Alert>
      )}
    </>
  );
}
