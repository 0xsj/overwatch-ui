import type { Metadata } from "next";
import Link from "next/link";
import { Panel } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { usingFixtures } from "@/lib/root";
import { loadShell } from "../../_shell";
import { PageHead } from "../../_components/page-head";
import { AddToolForm } from "./add-form";
import s from "../tools.module.css";

const TITLE = "Add a tool";
const SUB =
  "Three steps, and the third is the one that matters: nothing runs until a person has read the command it will run.";

export const metadata: Metadata = { title: TITLE };

export default async function Page() {
  const shell = await loadShell();
  const org = shell.context?.org;
  const mayWrite = org?.role === "owner" || org?.role === "admin";

  return (
    <>
      <PageHead title={TITLE} mock={await usingFixtures("tooling")}>{SUB}</PageHead>

      {!org ? (
        <Alert tone="info"><Text size="sm">No organisation yet.</Text></Alert>
      ) : !mayWrite ? (
        <Alert tone="info">
          <Text size="sm">
            Only an owner or an admin changes what the firm runs. That is the same
            reach <code>0019</code> gives an admin over people — and it is wide:
            an admin with no grant on any engagement can edit a parser every
            engagement uses.
          </Text>
        </Alert>
      ) : (
        <Panel
          title={`A definition ${org.name} owns`}
          note="Not an integration. There is no plugin to write, no release to wait for and nobody's pull request to land — a tool is a name, a command, and what flows in and out of it."
        >
          <AddToolForm orgId={org.org_id} />
        </Panel>
      )}

      <Alert tone="info">
        <Text size="sm">
          <strong>A tool with no <code>consumes</code> is a source</strong> — it is
          seeded from the target&rsquo;s scope rather than fed by another tool.
          Absent means <em>nothing upstream</em>, never <em>any kind</em>, so leave
          the box empty rather than reaching for a wildcard.
        </Text>
      </Alert>

      <Alert tone="info">
        <Text size="sm">
          Adding the definition runs nothing. The command becomes reachable to a
          check&rsquo;s chain, and a chain becomes a run only when somebody asks —
          at which point the <Link href="/tools/checks">scope gate</Link> is asked
          separately and can refuse it.
        </Text>
      </Alert>

      <div className={s.rows} />
    </>
  );
}
