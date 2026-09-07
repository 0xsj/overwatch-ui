import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Panel, Stat } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { loadShell } from "../../_shell";
import { PageHead } from "../../_components/page-head";
import s from "../settings.module.css";

const TITLE = "Organisation";
const SUB =
  "An organisation is the tenant. A solo hunter has one and never thinks about it; a consultancy has one per firm, with every engagement inside it and a hard wall between engagements.";

export const metadata: Metadata = { title: TITLE };

export default async function Page() {
  const shell = await loadShell();
  const org = shell.context?.org;

  if (!org) {
    return (
      <>
        <PageHead title={TITLE}>{SUB}</PageHead>
        <Alert tone="info">
          <Text size="sm">
            {shell.empty === "no-org"
              ? "Your organisation is still being provisioned. Registration writes the account and publishes a fact; the org and the first engagement arrive from that, each in its own transaction."
              : "You are in an organisation with no engagement you can see."}
          </Text>
        </Alert>
      </>
    );
  }

  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>

      <div className={s.stats}>
        <Stat label="Organisation" value={org.name} note={`you are ${org.role}`} />
        <Stat
          label="People"
          value={String(shell.members.length)}
          note={shell.members.length === 1 ? "just you, which is a correct state" : "in this org"}
        />
        {/* Every engagement in this count is one the caller can SEE. It is not
            the org's total and must never be reconstructed into one: a count
            that includes an invisible engagement is the same disclosure as
            showing its name. */}
        <Stat
          label="Engagements you can see"
          value={String(org.workspaces.length)}
          note="not the org's total"
        />
      </div>

      <Panel title="Renaming" >
        <Text size="sm" tone="tertiary">
          `SaveOrg` exists in the backend with no caller, so there is no endpoint
          that changes this name. It is listed here rather than shown as a
          disabled input, because a control that cannot work is worse than a
          sentence saying so.
        </Text>
      </Panel>

      <Panel title="Where the rest of this lives">
        <ul className={s.links}>
          <li>
            <Link href="/settings/members" className={s.link}>Members</Link>
            <Text size="xs" tone="quiet">who is in the firm, and what role they hold</Text>
          </li>
          <li>
            <Link href="/settings/workspaces" className={s.link}>Engagements</Link>
            <Text size="xs" tone="quiet">the work, and opening a new piece of it</Text>
          </li>
          <li>
            <Link href="/settings/access" className={s.link}>Access</Link>
            <Text size="xs" tone="quiet">
              who is on which engagement. Not the same permission as Members —{" "}
              <Badge tone="neutral" mono>admin</Badge> manages people, not work
            </Text>
          </li>
        </ul>
      </Panel>
    </>
  );
}
