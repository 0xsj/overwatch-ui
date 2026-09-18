"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Panel, Stat } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import type { Finding } from "@/lib/services/findings";
import { PageHead } from "../../_components/page-head";
import { NoWorkspace, Query, useContext } from "../../_hooks";
import { findingsQuery } from "../../_queries";
import { FindingRow } from "./finding-row";
import s from "../../surface/surface.module.css";

const TITLE = "Findings";
const SUB =
  "A vulnerability claim with a lifecycle — not an observation. One problem on one fragment, however many times it has been seen: thirty nightly matches on one URL are one row with thirty sightings, not thirty rows.";

/** `resolved` and `dismissed` are NEVER one "closed" chip.
 *
 *  One is a change to the world and the other is a change of mind, and a client
 *  report cites them differently: *"we fixed eleven"* and *"we decided eleven
 *  did not matter"* are not the same sentence to hand somebody. */
const STATE_MEANING: Record<Finding["state"], string> = {
  open: "nobody has looked",
  triaged: "somebody looked, and it is real",
  resolved: "the thing was fixed",
  dismissed: "ruled not to matter, with a reason",
};

export function BoardScreen() {
  const { workspace } = useContext();
  const [showing, setShowing] = useState<"live" | "closed">("live");

  const q = useQuery({
    queryKey: keys.findings.list(workspace ?? ""),
    queryFn: () => findingsQuery(workspace!),
    enabled: Boolean(workspace),
  });

  if (!workspace) {
    return (
      <>
        <PageHead title={TITLE}>{SUB}</PageHead>
        <NoWorkspace what="A finding" />
      </>
    );
  }

  const all = q.data ?? [];
  const live = all.filter((f) => f.state === "open" || f.state === "triaged");
  const closed = all.filter((f) => f.state === "resolved" || f.state === "dismissed");
  const rows = showing === "live" ? live : closed;

  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>

      <div className={s.legend}>
        <Stat label="Open" value={all.filter((f) => f.state === "open").length} note={STATE_MEANING.open} tone="warn" />
        <Stat label="Triaged" value={all.filter((f) => f.state === "triaged").length} note={STATE_MEANING.triaged} />
        {/* TWO stats, never summed into "closed". */}
        <Stat label="Fixed" value={all.filter((f) => f.state === "resolved").length} note={STATE_MEANING.resolved} tone="accent" />
        <Stat label="Dismissed" value={all.filter((f) => f.state === "dismissed").length} note={STATE_MEANING.dismissed} />
      </div>

      <div className={s.cells}>
        {(["live", "closed"] as const).map((which) => (
          <button
            key={which}
            type="button"
            onClick={() => setShowing(which)}
            className={s.tab}
            data-on={showing === which}
          >
            {which === "live" ? `Open and triaged (${live.length})` : `Decided (${closed.length})`}
          </button>
        ))}
      </div>

      <Panel
        title={showing === "live" ? "Waiting on somebody" : "Already decided"}
        note="Worst first, then newest — sorted by the server. A board sorted by time puts a critical from Tuesday under an info from this morning."
      >
        <Query of={q} label="the findings">
          {() =>
            rows.length === 0 ? (
              <Text size="sm" tone="tertiary">
                {showing === "live"
                  ? "Nothing open. That is not the same as nothing having been looked for — the coverage grid is where “nobody asked” lives."
                  : "Nothing has been decided yet."}
              </Text>
            ) : (
              <div className={s.rows}>
                {rows.map((f) => (
                  <FindingRow key={f.finding_id} workspaceId={workspace} finding={f} />
                ))}
              </div>
            )
          }
        </Query>
      </Panel>

      <Alert tone="info">
        <Text size="sm">
          <strong>A finding is not a judgement.</strong> A fragment can be{" "}
          <code>watching</code> and carry an open finding at once — the badge sits
          beside the judgement rather than being a fifth value inside it. And{" "}
          <code>sightings</code> is the only evidence a reader has that a fix did
          not hold: an old first-seen beside a large count.
        </Text>
      </Alert>
    </>
  );
}
