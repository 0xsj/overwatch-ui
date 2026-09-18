"use client";

import { useQuery } from "@tanstack/react-query";
import { Panel } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import { PageHead } from "../../_components/page-head";
import { useContext } from "../../_hooks";
import { targetsQuery } from "../../_queries";
import { TargetForm } from "./target-form";
import { TargetRow } from "./target-row";
import s from "../../surface/surface.module.css";

const TITLE = "Targets";
const SUB =
  "The thing being looked at; everything else hangs off it. A target is an organisation or a person — never a hostname, because a hostname is something a tool said about one, and the distance between the two is the whole attribution question.";

export function TargetsScreen() {
  const { workspace, shell } = useContext();

  // `archived: true` INCLUDES the closed ones, which is what makes one
  // reachable and therefore reopenable.
  const targetsQ = useQuery({
    queryKey: keys.targets.list(workspace ?? "", true),
    queryFn: () => targetsQuery(workspace!, true),
    enabled: Boolean(workspace),
  });

  if (!workspace) {
    return (
      <>
        <PageHead title={TITLE}>{SUB}</PageHead>
        <Alert tone="info">
          <Text size="sm">
            No engagement open. A target lives inside one, and is never resolved
            without it — a target in another engagement answers the same 404 as
            one that does not exist, because you must not learn which.
          </Text>
        </Alert>
      </>
    );
  }

  const targets = targetsQ.data ?? [];
  const live = targets.filter((t) => !t.archived);
  const closed = targets.filter((t) => t.archived);
  const mayAdmin = shell?.context?.workspace.access === "admin";

  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>

      <Panel title="Open in this engagement">
        {live.length === 0 ? (
          <Text size="sm" tone="tertiary">
            Nothing to look at yet. Scope hangs off a target, so nothing can be
            run and nothing can be attributed until there is one.
          </Text>
        ) : (
          <div className={s.scroll}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th scope="col">name</th>
                  <th scope="col">kind</th>
                  <th scope="col">opened</th>
                  <th scope="col">scope</th>
                  <th scope="col"><span className={s.quiet}>admin</span></th>
                </tr>
              </thead>
              <tbody>
                {live.map((t) => (
                  <TargetRow
                    key={t.target_id}
                    workspaceId={workspace}
                    target={t}
                    mayAdmin={Boolean(mayAdmin)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {closed.length > 0 ? (
        <Panel
          title="Archived"
          note="Hidden, not deleted. Every run, observation and attribution names it, so the record stays — and it is reachable here precisely so it can be reopened."
        >
          <div className={s.scroll}>
            <table className={s.table}>
              <tbody>
                {closed.map((t) => (
                  <TargetRow
                    key={t.target_id}
                    workspaceId={workspace}
                    target={t}
                    mayAdmin={Boolean(mayAdmin)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      <Panel
        title="Add a target"
        note="Two kinds and no more. An asset attributed to an organisation and a fragment attributed to a person are the same machinery at different roots — which is why there is no third."
      >
        <TargetForm workspaceId={workspace} />
      </Panel>

      {mayAdmin ? null : (
        <Alert tone="info">
          <Text size="sm">
            Archiving a target needs admin on this engagement — it hides a
            record, which is nearer editing scope than to the ordinary work of
            an engagement. Adding one needs only write.
          </Text>
        </Alert>
      )}
    </>
  );
}
