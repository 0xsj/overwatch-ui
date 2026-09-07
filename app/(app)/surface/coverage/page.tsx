import type { Metadata } from "next";
import { Panel, Stat } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { clientFor, usingFixtures } from "@/lib/root";
import { readCoverage, type Coverage } from "@/lib/services/coverage";
import { loadShell } from "../../_shell";
import { PageHead } from "../../_components/page-head";
import s from "../surface.module.css";

const TITLE = "Coverage";
const SUB =
  "What has never been looked at. The denominator is ragged on purpose — it is the sum of the checks that APPLY to each asset, never assets times checks, because an ASN has no TLS and a question that cannot be asked is not a question nobody answered.";

export const metadata: Metadata = { title: TITLE };

const STATE_MEANING = {
  fresh: "asked, and the answer is current",
  stale: "asked, and the answer is older than the check's interval",
  never: "nobody asked",
} as const;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ target?: string }>;
}) {
  const { target } = await searchParams;
  const shell = await loadShell();
  const workspace = shell.context?.workspace;

  let coverage: Coverage | null = null;
  if (workspace) {
    coverage = await readCoverage(await clientFor("coverage"), workspace.workspace_id, {
      target,
    }).catch(() => null);
  }

  if (!workspace || !coverage) {
    return (
      <>
        <PageHead title={TITLE}>{SUB}</PageHead>
        <Alert tone="info">
          <Text size="sm">
            {workspace
              ? "Coverage could not be read. That is not the same as nothing having been checked — this screen will not render a ratio it did not receive."
              : "No engagement open. Coverage is measured over one engagement's assets."}
          </Text>
        </Alert>
      </>
    );
  }

  /* The arithmetic is the client's because there is no percentage on the wire —
     and this is the guard that makes that worth it: `0/0` is not `0%`. An
     unmeasured ratio renders as a dash. */
  const ratio =
    coverage.pairs > 0 ? `${Math.round((coverage.fresh / coverage.pairs) * 100)}%` : "–";

  return (
    <>
      <PageHead title={TITLE} mock={await usingFixtures("coverage")}>{SUB}</PageHead>

      <div className={s.legend}>
        <Stat label="Assets" value={coverage.assets} note="fragments in a role" />
        <Stat
          label="Questions"
          value={coverage.pairs}
          note="the ragged denominator — a claim that this many questions exist"
        />
        <Stat label="Fresh" value={coverage.fresh} note={STATE_MEANING.fresh} tone="accent" />
        {/* TWO numbers and never summed. `never` and `stale` are different
            failures with different fixes — run it, versus run it again. */}
        <Stat label="Stale" value={coverage.stale} note={STATE_MEANING.stale} tone="warn" />
        <Stat label="Never" value={coverage.never} note={STATE_MEANING.never} />
        <Stat label="Current" value={ratio} note={coverage.pairs > 0 ? "fresh over questions" : "nothing to divide — not zero"} />
      </div>

      <Panel
        title="Every asset, and only the questions that apply to it"
        note="A row is as long as its own applicable checks. A short row is not a gap — it is an asset fewer questions can be asked about."
      >
        {coverage.rows.length === 0 ? (
          <Text size="sm" tone="tertiary">
            No assets yet, so there is nothing to have asked about. That is not
            zero coverage; it is no denominator.
          </Text>
        ) : (
          <div className={s.scroll}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th scope="col">kind</th>
                  <th scope="col">asset</th>
                  <th scope="col">applicable checks</th>
                  <th scope="col" className={s.num}>asked</th>
                </tr>
              </thead>
              <tbody>
                {coverage.rows.map((row) => (
                  <tr key={row.fragment_id}>
                    <td className={s.quiet}>{row.kind}</td>
                    <td className={s.value}>{row.value}</td>
                    <td>
                      <div className={s.cells}>
                        {row.cells.map((c) => (
                          <span
                            key={c.check_id}
                            className={s.cell}
                            data-state={c.state}
                            title={`${c.check_name} — ${STATE_MEANING[c.state]}${c.at ? ` (${c.at})` : ""}`}
                          />
                        ))}
                      </div>
                    </td>
                    <td className={s.num}>
                      {row.cells.filter((c) => c.state !== "never").length}/{row.cells.length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Reading the grid">
        <div className={s.legend}>
          {(["fresh", "stale", "never"] as const).map((state) => (
            <span key={state} className={s.legendItem}>
              <span className={s.cell} data-state={state} />
              <Text size="xs" tone="tertiary">{state} — {STATE_MEANING[state]}</Text>
            </span>
          ))}
          <Text size="xs" tone="quiet">
            A check that does not apply produces <strong>no square at all</strong>.
            A dashed square that sometimes meant &ldquo;impossible&rdquo; would make
            this legend false.
          </Text>
        </div>
      </Panel>
    </>
  );
}
