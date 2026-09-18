"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Panel, Stat } from "@/components/display";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import { PageHead } from "../../_components/page-head";
import { NoWorkspace, Query, useContext } from "../../_hooks";
import { coverageQuery } from "../../_queries";
import s from "../surface.module.css";

const TITLE = "Coverage";
const SUB =
  "What has never been looked at. The denominator is ragged on purpose — it is the sum of the checks that APPLY to each asset, never assets times checks, because an ASN has no TLS and a question that cannot be asked is not a question nobody answered.";

const STATE_MEANING = {
  fresh: "asked, and the answer is current",
  stale: "asked, and the answer is older than the check's interval",
  never: "nobody asked",
} as const;

export function CoverageScreen() {
  const { workspace } = useContext();
  const target = useSearchParams().get("target") ?? undefined;

  const coverage = useQuery({
    queryKey: keys.coverage(workspace ?? "", target),
    queryFn: () => coverageQuery(workspace!, target),
    enabled: Boolean(workspace),
  });

  if (!workspace) {
    return (
      <>
        <PageHead title={TITLE}>{SUB}</PageHead>
        <NoWorkspace what="Coverage" />
      </>
    );
  }

  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>
      <Query of={coverage} label="coverage">
        {(coverage) => {
          /* The arithmetic is the client's because there is no percentage on
             the wire — and this is the guard that makes that worth it: `0/0` is
             not `0%`. An unmeasured ratio renders as a dash. */
          const ratio =
            coverage.pairs > 0
              ? `${Math.round((coverage.fresh / coverage.pairs) * 100)}%`
              : "–";
          return (
            <>

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
          <Text size="xs" tone="quiet">
            {/* `0037` §6. Both of these read as bugs and are not — and the
                second is the one somebody will file a ticket about. */}
            <strong>A refused invocation is not coverage.</strong> The scope gate
            said no, so nothing looked, and the cell is <code>never</code> —
            rendering a refusal as checked would make a wall look like a
            measurement. The rule that refused it is on the run, not on this
            grid: the wire carries no join from a cell back to a refusal, so
            this screen does not invent one.
          </Text>
          <Text size="xs" tone="quiet">
            <strong>A human read never goes stale.</strong> <code>READ BY YOU</code>{" "}
            is <code>fresh</code> at any age, and the date beside it is for the
            reader rather than for the state — it is not a warning.
          </Text>
        </div>
      </Panel>
            </>
          );
        }}
      </Query>
    </>
  );
}
