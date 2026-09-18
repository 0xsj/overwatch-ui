"use client";

import { useQuery } from "@tanstack/react-query";
import { Panel } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import { successCodes } from "@/lib/services/tooling";
import { PageHead } from "../../_components/page-head";
import { useContext } from "../../_hooks";
import { toolsQuery } from "../../_queries";
import { CatalogueSection } from "./catalogue-section";
import { ToolRow } from "./tool-row";
import s from "../tools.module.css";

const TITLE = "Installed tools";
const SUB =
  "A tool is a definition and a field mapping, never an integration. Paste what it prints, say which field is which, and it is a tool — no plugin, no release, nobody's pull request.";

export function InstalledScreen() {
  const { org, shell } = useContext();
  const role = shell?.context?.org.role;
  const mayWrite = role === "owner" || role === "admin";

  /* Under `/orgs` and never under an engagement — `decisions/0031`. A tool is
     what the FIRM can do, and the same definition serves every client.
     `archived` INCLUDES them rather than selecting them, so this is one read
     and the sections below are a filter. */
  const toolsQ = useQuery({
    queryKey: keys.tooling.tools(org ?? ""),
    queryFn: () => toolsQuery(org!),
    enabled: Boolean(org),
  });
  const tools = toolsQ.data ?? [];

  const live = tools.filter((t) => !t.archived);
  const archived = tools.filter((t) => t.archived);

  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>

      {toolsQ.isError ? (
        <Alert tone="warn">
          <Text size="sm">
            Never checked — the tool list could not be read. That is not the same as
            there being none, and this screen will not pretend otherwise.
          </Text>
        </Alert>
      ) : null}

      <Panel
        title={`What ${shell?.context?.org.name ?? "the firm"} can run`}
        note="Org-wide. Every engagement runs the same definitions, which is why a tool has no workspace in its path."
      >
        {live.length === 0 && !toolsQ.isPending ? (
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
                orgId={org!}
                mayWrite={Boolean(mayWrite)}
              />
            ))}
          </div>
        )}
      </Panel>

      <Panel
        title="Ships with overwatch"
        note="Definitions, and only definitions. Installing one posts exactly what the Add a tool form posts — it is a pre-filled form, not a plugin, and nothing about the binary itself is bundled."
      >
        <CatalogueSection
          installed={tools.map((t) => t.name)}
          mayWrite={Boolean(mayWrite)}
        />
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
                orgId={org!}
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
