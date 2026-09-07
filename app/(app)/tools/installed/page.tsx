import type { Metadata } from "next";
import { Panel } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { clientFor, usingFixtures } from "@/lib/root";
import { listMappings, listTools, successCodes, type Mapping, type Tool } from "@/lib/services/tooling";
import { loadShell } from "../../_shell";
import { PageHead } from "../../_components/page-head";
import { ToolRow } from "./tool-row";
import s from "../tools.module.css";

const TITLE = "Installed tools";
const SUB =
  "A tool is a definition and a field mapping, never an integration. Paste what it prints, say which field is which, and it is a tool — no plugin, no release, nobody's pull request.";

export const metadata: Metadata = { title: TITLE };

export default async function Page() {
  const shell = await loadShell();
  const org = shell.context?.org;

  /* Under `/orgs` and never under an engagement — `decisions/0031`. A tool is
     what the FIRM can do, and the same definition serves every client; putting
     it under a workspace would mean one firm re-typing its own tools per
     engagement. The gate is the org role, which is wider than any engagement
     gate, and `scope` refuses the spawn independently. */
  let tools: Tool[] = [];
  let mappings = new Map<string, Mapping[]>();
  let read = false;

  if (org) {
    const client = await clientFor("tooling");
    try {
      // `archived` INCLUDES them rather than selecting them, so this is one
      // read and the sections below are a filter.
      tools = await listTools(client, org.org_id, { archived: true });
      read = true;
      const lists = await Promise.all(
        tools.map(
          async (t): Promise<[string, Mapping[]]> => [
            t.tool_id,
            await listMappings(client, org.org_id, t.tool_id).catch(() => []),
          ],
        ),
      );
      mappings = new Map(lists);
    } catch {
      read = false;
    }
  }

  const live = tools.filter((t) => !t.archived);
  const archived = tools.filter((t) => t.archived);
  const mayWrite = org?.role === "owner" || org?.role === "admin";

  return (
    <>
      <PageHead title={TITLE} mock={await usingFixtures("tooling")}>{SUB}</PageHead>

      {!read ? (
        <Alert tone="warn">
          <Text size="sm">
            Never checked — the tool list could not be read. That is not the same as
            there being none, and this screen will not pretend otherwise.
          </Text>
        </Alert>
      ) : null}

      <Panel
        title={org ? `What ${org.name} can run` : "Tools"}
        note="Org-wide. Every engagement runs the same definitions, which is why a tool has no workspace in its path."
      >
        {live.length === 0 && read ? (
          <Text size="sm" tone="tertiary">
            Nothing installed. A tool is a name, a command and what flows in and
            out of it — there is no catalogue to pick from because there is
            nothing to package.
          </Text>
        ) : (
          <div className={s.rows}>
            {live.map((t) => (
              <ToolRow
                key={t.tool_id}
                tool={t}
                mappings={mappings.get(t.tool_id) ?? []}
                orgId={org!.org_id}
                mayWrite={Boolean(mayWrite)}
              />
            ))}
          </div>
        )}
      </Panel>

      {archived.length > 0 ? (
        <Panel
          title="Archived"
          note="Out of use and still here, because every invocation that ever ran names it. There is no reopen — the name is released on archive, so bringing one back would need the same collision refusal reopening an engagement has."
        >
          <div className={s.rows}>
            {archived.map((t) => (
              <ToolRow
                key={t.tool_id}
                tool={t}
                mappings={mappings.get(t.tool_id) ?? []}
                orgId={org!.org_id}
                mayWrite={false}
              />
            ))}
          </div>
        </Panel>
      ) : null}

      {live.some((t) => successCodes(t).length > 1) ? null : (
        <Alert tone="info">
          <Text size="sm">
            <strong>Every tool here answers only on exit 0.</strong> That is the
            default and it is wrong for at least one common case:{" "}
            <code>nuclei</code> exits <code>1</code> when it finds nothing, so
            reading exit codes strictly turns &ldquo;no vulnerabilities&rdquo; into
            a failed run.
          </Text>
        </Alert>
      )}

      {mayWrite ? null : (
        <Alert tone="info">
          <Text size="sm">
            Only an owner or an admin changes what the firm runs. You can see every
            definition — a tool is not client data — and the reason you cannot edit
            one is shown rather than the control being hidden.
          </Text>
        </Alert>
      )}
    </>
  );
}
