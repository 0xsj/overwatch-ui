import type { Metadata } from "next";
import { Panel, Stat } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { clientFor, usingFixtures } from "@/lib/root";
import { readExtraction, type Extraction } from "@/lib/services/observed";
import { listRuns, readRun } from "@/lib/services/runs";
import { loadShell } from "../../_shell";
import { PageHead } from "../../_components/page-head";
import s from "../../surface/surface.module.css";

const TITLE = "Extraction quality";
const SUB =
  "How much of what the tools printed actually became an observation. It is the number the compounding loop lives or dies on, and one nobody has ever recorded — and the unmapped paths come back with it, because a ratio a person cannot act on is a metric rather than a tool.";

export const metadata: Metadata = { title: TITLE };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ invocation?: string }>;
}) {
  const { invocation } = await searchParams;
  const shell = await loadShell();
  const workspace = shell.context?.workspace;

  if (!workspace) {
    return (
      <>
        <PageHead title={TITLE}>{SUB}</PageHead>
        <Alert tone="info"><Text size="sm">No engagement open.</Text></Alert>
      </>
    );
  }

  /* Per INVOCATION, because that is the unit that printed the bytes. Without one
     named, the most recent run's first invocation is the honest default — and
     the screen says which it is rather than presenting a workspace-wide figure
     nothing computed. */
  let invocationId = invocation;
  let ran: string | null = null;
  if (!invocationId) {
    const page = await listRuns(await clientFor("runs"), workspace.workspace_id, { limit: 1 })
      .catch(() => ({ runs: [] }));
    const latest = page.runs[0];
    if (latest) {
      const detail = await readRun(await clientFor("runs"), workspace.workspace_id, latest.run_id)
        .catch(() => null);
      // An invocation that never spawned printed nothing, so it is not the one
      // to measure — a `refused` step would read as 0% extraction.
      const first = detail?.invocations.find((i) => i.artifacts.length > 0);
      invocationId = first?.invocation_id;
      ran = first ? first.argv.join(" ") : null;
    }
  }

  const extraction: Extraction | null = invocationId
    ? await readExtraction(await clientFor("observed"), workspace.workspace_id, invocationId)
        .catch(() => null)
    : null;

  if (!extraction) {
    return (
      <>
        <PageHead title={TITLE} mock={await usingFixtures("observed")}>{SUB}</PageHead>
        <Alert tone="info">
          <Text size="sm">
            Nothing has printed anything yet in {workspace.name}. This is measured
            per invocation, and an invocation that was refused wrote no bytes —
            so there is no ratio rather than a ratio of zero.
          </Text>
        </Alert>
      </>
    );
  }

  /* `fields_seen = mapped + left_alone`, all counted in PATHS so the identity
     holds. `observations` is a SEPARATE question — one flattened path can
     become many observations — so it is not a fourth term of the same sum, and
     it is deliberately not in this bar. */
  const share = (n: number) =>
    extraction.fields_seen > 0 ? `${Math.round((n / extraction.fields_seen) * 100)}%` : "–";

  return (
    <>
      <PageHead title={TITLE} mock={await usingFixtures("observed")}>{SUB}</PageHead>

      {ran ? (
        <Text size="xs" tone="quiet">
          Measured on <code>{ran}</code> — the most recent invocation that wrote
          anything.
        </Text>
      ) : null}

      <div className={s.legend}>
        <Stat label="Paths seen" value={extraction.fields_seen} note="distinct paths in what the tool printed" />
        <Stat label="Mapped" value={extraction.mapped} note={`${share(extraction.mapped)} of them are read by a mapping`} tone="accent" />
        <Stat
          label="Left alone"
          value={extraction.left_alone}
          note="recorded rather than guessed — the list below is the work"
          tone="warn"
        />
        <Stat
          label="Observations"
          value={extraction.observations}
          note="a separate question — one path can become many"
        />
        <Stat label="Fields" value={extraction.fields} note="distinct fields written" />
      </div>

      <Panel
        title="Where the output went"
        note="The three numbers travel together, because a ratio without its denominator is exactly what decisions/0011 refuses."
      >
        <div className={s.bars}>
          <div className={s.bar}>
            <div
              className={s.barFill}
              style={{
                inlineSize:
                  extraction.fields_seen > 0
                    ? `${(extraction.mapped / extraction.fields_seen) * 100}%`
                    : "0%",
              }}
            />
          </div>
          <Text size="xs" tone="tertiary">
            {extraction.mapped} mapped · {extraction.left_alone} left alone ·{" "}
            {extraction.fields_seen} seen. The first two sum to the third by
            construction, which is what makes this bar checkable rather than
            decorative.
          </Text>
        </div>
      </Panel>

      <Panel
        title="Paths nobody mapped"
        note="A field nobody mapped is RECORDED rather than guessed — decisions/0035. This is the list that makes the mapping editor's next job obvious."
      >
        {extraction.left_alone_paths.length === 0 ? (
          <Text size="sm" tone="tertiary">
            Nothing left alone. Every path the tool printed is read by a mapping.
          </Text>
        ) : (
          <div className={s.paths}>
            {extraction.left_alone_paths.map((p) => (
              <div key={p.path} className={s.path}>
                <code className={s.mono}>{p.path}</code>
                <span className={s.num}>{p.seen}×</span>
                {/* A sample is not always kept — a path seen only where the
                    value was empty has nothing to show, and a blank there is
                    the honest render. */}
                <span className={s.quiet}>{p.sample ?? "–"}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
