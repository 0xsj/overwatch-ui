"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Panel, Stat } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import { PageHead } from "../../_components/page-head";
import { NoWorkspace, useContext } from "../../_hooks";
import { extractionQuery, runQuery, runsQuery } from "../../_queries";
import s from "../../surface/surface.module.css";

const TITLE = "Extraction quality";
const SUB =
  "How much of what the tools printed actually became an observation. It is the number the compounding loop lives or dies on, and one nobody has ever recorded — and the unmapped paths come back with it, because a ratio a person cannot act on is a metric rather than a tool.";

export function ExtractionScreen() {
  const { workspace } = useContext();
  const params = useSearchParams();
  const invocation = params.get("invocation") ?? undefined;

  /* Per INVOCATION, because that is the unit that printed the bytes. Without
     one named, the most recent run's first invocation that WROTE ANYTHING is
     the honest default — a refused step printed nothing, and measuring it would
     read as 0% extraction. */
  const runsQ = useQuery({
    queryKey: keys.runs.list(workspace ?? ""),
    queryFn: () => runsQuery(workspace!),
    enabled: Boolean(workspace),
  });
  const latest = runsQ.data?.runs[0];
  const detailQ = useQuery({
    queryKey: keys.runs.one(workspace ?? "", latest?.run_id ?? ""),
    queryFn: () => runQuery(workspace!, latest!.run_id),
    enabled: Boolean(workspace && latest && !invocation),
  });
  const first = detailQ.data?.invocations.find((i) => i.artifacts.length > 0);
  const invocationId = invocation ?? first?.invocation_id;
  const ran = first ? first.argv.join(" ") : null;

  const extractionQ = useQuery({
    queryKey: keys.observed.extraction(workspace ?? "", invocationId ?? ""),
    queryFn: () => extractionQuery(workspace!, invocationId!),
    enabled: Boolean(workspace && invocationId),
  });
  const extraction = extractionQ.data ?? null;

  if (!workspace) {
    return (
      <>
        <PageHead title={TITLE}>{SUB}</PageHead>
        <NoWorkspace what="Extraction" />
      </>
    );
  }

  if (!extraction) {
    return (
      <>
        <PageHead title={TITLE}>{SUB}</PageHead>
        <Alert tone="info">
          <Text size="sm">
            Nothing has printed anything yet in this engagement. This is measured
            per invocation, and an invocation that was refused wrote no bytes —
            so there is no ratio rather than a ratio of zero.
          </Text>
        </Alert>
      </>
    );
  }

  /* `fields_seen = mapped + left_alone`, all counted in PATHS so the identity
     holds. `observations` is a SEPARATE question — one flattened path can
     become many observations — so it is not a fourth term of the same sum. */
  const share = (n: number) =>
    extraction.fields_seen > 0
      ? `${Math.round((n / extraction.fields_seen) * 100)}%`
      : "–";

  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>

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
