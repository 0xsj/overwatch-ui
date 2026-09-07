import type { Metadata } from "next";
import { Panel } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { clientFor } from "@/lib/root";
import { listWorkspaces, type OrgWorkspace } from "@/lib/services/tenancy";
import { loadShell } from "../../_shell";
import { PageHead } from "../../_components/page-head";
import { OpenWorkspaceForm } from "./open-form";
import { WorkspaceRow } from "./workspace-row";
import s from "../settings.module.css";

const TITLE = "Engagements";
const SUB =
  "The unit of work — CTF1, a client engagement, a quarter's retainer. Everything in the product carries one, and the wall a consultancy is buying is drawn here rather than around a target.";

export const metadata: Metadata = { title: TITLE };

/** Reads the LISTING, not `/v1/me`, and the difference is the point.
 *
 *  `/v1/me` is the boot call and the switcher's source, so it excludes closed
 *  engagements — a firm's history does not belong in a switcher. This listing
 *  includes them, and is the only way to reach a closed one at all. */
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

  let all: OrgWorkspace[] = [];
  try {
    all = await listWorkspaces(await clientFor("tenancy"), org.org_id);
  } catch {
    all = [];
  }

  const live = all.filter((w) => !w.closed);
  const closed = all.filter((w) => w.closed);
  const mayOpen = org.role === "owner" || org.role === "admin";

  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>

      <Panel
        title="Open"
        note="Engagements you can see. One you have no grant on is absent from this list, and that is the wall working rather than a filter."
      >
        <div className={s.rows}>
          {live.map((w) => <WorkspaceRow key={w.workspace_id} workspace={w} />)}
          {live.length === 0 ? (
            <Text size="sm" tone="tertiary">Nothing open.</Text>
          ) : null}
        </div>
      </Panel>

      {closed.length > 0 ? (
        <Panel
          title="Closed"
          note="Readable, not workable. The record stays and so does everybody's access to it — which is what makes the trail readable by the people who made it rather than only by the owner."
        >
          <div className={s.rows}>
            {closed.map((w) => <WorkspaceRow key={w.workspace_id} workspace={w} />)}
          </div>
        </Panel>
      ) : null}

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

      <Alert tone="info">
        <Text size="sm">
          <strong>Closing frees the name.</strong> The uniqueness rule only covers
          open engagements, so another may take it — and reopening then fails on
          the name rather than on the engagement you are reopening. Rename one of
          them first.
        </Text>
      </Alert>
    </>
  );
}
