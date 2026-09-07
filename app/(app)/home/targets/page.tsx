import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Panel } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { clientFor, usingFixtures } from "@/lib/root";
import { listTargets, type Target } from "@/lib/services/targets";
import { loadShell } from "../../_shell";
import { PageHead } from "../../_components/page-head";
import { TargetForm } from "./target-form";
import s from "../../surface/surface.module.css";

const TITLE = "Targets";
const SUB =
  "The thing being looked at; everything else hangs off it. A target is an organisation or a person — never a hostname, because a hostname is something a tool said about one, and the distance between the two is the whole attribution question.";

export const metadata: Metadata = { title: TITLE };

export default async function Page() {
  const shell = await loadShell();
  const workspace = shell.context?.workspace;

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

  // `archived: true` INCLUDES the closed ones, which is what makes one
  // reachable and therefore reopenable.
  const targets: Target[] = await listTargets(
    await clientFor("targets"),
    workspace.workspace_id,
    { archived: true },
  ).catch(() => []);

  const live = targets.filter((t) => !t.archived);
  const closed = targets.filter((t) => t.archived);
  const mayAdmin = workspace.access === "admin";

  return (
    <>
      <PageHead title={TITLE} mock={await usingFixtures("targets")}>{SUB}</PageHead>

      <Panel title={`Open in ${workspace.name}`}>
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
                </tr>
              </thead>
              <tbody>
                {live.map((t) => (
                  <tr key={t.target_id}>
                    <td className={s.value}>{t.name}</td>
                    <td><Badge mono>{t.kind}</Badge></td>
                    <td className={s.quiet}>{t.created_at}</td>
                    <td>
                      <Link href={`/surface/scope?target=${encodeURIComponent(t.target_id)}`}>
                        rules →
                      </Link>
                    </td>
                  </tr>
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
                  <tr key={t.target_id}>
                    <td className={s.value}>{t.name}</td>
                    <td><Badge mono>{t.kind}</Badge></td>
                  </tr>
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
        <TargetForm workspaceId={workspace.workspace_id} />
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
