"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Badge, Panel } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import { PageHead } from "../../_components/page-head";
import { useContext } from "../../_hooks";
import { chainQuery, checksQuery } from "../../_queries";
import { CheckForm } from "./_components/check-form";
import s from "./checks.module.css";

const TITLE = "Checks";
const SUB =
  "A check is a named question with its own interval — not a script and not a schedule. It belongs to the firm rather than to an engagement: “what ports are open” is a question you know how to ask, and it is the same question for every client.";

/** Every hour a duration can be, said in words.
 *
 *  The wire is SECONDS, because `P1M` is not a length of time — a "monthly"
 *  check is stale after 28, 29, 30 or 31 days depending on when it last ran, and
 *  that ambiguity lands exactly where staleness is decided. Offering readable
 *  intervals is the client's job, and this is that mapping. */
function intervalWords(seconds?: number): string {
  if (!seconds) return "on request only";
  const units: [number, string][] = [
    [604800, "week"], [86400, "day"], [3600, "hour"], [60, "minute"],
  ];
  for (const [size, name] of units) {
    if (seconds % size === 0) {
      const n = seconds / size;
      return `every ${n === 1 ? name : `${n} ${name}s`}`;
    }
  }
  return `every ${seconds}s`;
}

export function ChecksScreen() {
  const { org, shell } = useContext();
  const role = shell?.context?.org.role;
  const mayWrite = role === "owner" || role === "admin";

  const checksQ = useQuery({
    queryKey: keys.checks.list(org ?? ""),
    queryFn: () => checksQuery(org!),
    enabled: Boolean(org),
  });
  const checks = checksQ.data ?? [];

  /* Which checks have a chain. A check somebody created, gave an interval,
     enabled and never wired a chain to sits here looking scheduled and never
     runs; the scheduler skips it, correctly, and there is no error anywhere to
     make that visible. One read per check is the cost of saying so, and it is a
     list a firm has tens of rather than thousands. */
  const chains = useQueries({
    queries: checks.map((c) => ({
      queryKey: keys.checks.chain(org ?? "", c.check_id),
      queryFn: () => chainQuery(org!, c.check_id),
      enabled: Boolean(org),
    })),
  });
  const wired = new Set(
    checks.filter((_, n) => (chains[n]?.data?.steps.length ?? 0) > 0).map((c) => c.check_id),
  );

  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>

      <Panel
        title={`Questions ${shell?.context?.org.name ?? "the firm"} knows how to ask`}
        note="Org-wide. A per-engagement “do not run this here” is not modelled and must not be — that is what scope already is, and a second flag would be a second, invisible authority over the same question."
      >
        {checksQ.isError ? (
          <Text size="sm" tone="tertiary">
            Never checked — the check list could not be read. That is not the same
            as there being none.
          </Text>
        ) : checks.length === 0 ? (
          <Text size="sm" tone="tertiary">
            No checks yet. A check with no steps is a real one — it is a question a
            person answers by reading, and it never goes stale because there is no
            clock.
          </Text>
        ) : (
          <ul className={s.list}>
            {checks.map((c) => (
              <li key={c.check_id}>
                <Link href={`/tools/checks/${c.check_id}`} className={s.card}>
                  <span className={s.row}>
                    <span className={s.name}>{c.name}</span>
                    {/* Enabling a check that has an interval IS the standing
                        authorisation for every future scheduled run of it,
                        including a loud one — `decisions/0038`. So the word is
                        what it does rather than "on". */}
                    {c.enabled ? (
                      <Badge tone="accent" mono>
                        {c.interval_seconds ? "runs itself" : "on"}
                      </Badge>
                    ) : (
                      <Badge tone="neutral" mono>off</Badge>
                    )}
                    {c.human ? <Badge tone="neutral" mono>human</Badge> : null}
                    <span className={s.interval}>{intervalWords(c.interval_seconds)}</span>
                  </span>
                  <span className={s.question}>{c.question}</span>
                  {/* The coverage denominator. A check with `applies_to: ["host"]`
                      produces NO CELL for a /24 — not a cell in state `never`. */}
                  <span className={s.chain}>
                    applies to {c.applies_to.join(" · ")}
                  </span>
                  {/* THREE different facts, and a UI that shows one badge for
                      "not running" collapses them. Only the last is a fault. */}
                  {c.human ? (
                    <span className={s.chain}>
                      Nothing spawns — a person reading the thing is the whole
                      act, and it never goes stale.
                    </span>
                  ) : !wired.has(c.check_id) ? (
                    <span className={s.unwired}>
                      <strong>No chain.</strong> This check is unfinished: it
                      cannot run, it is skipped silently every tick, and it will
                      report <code>never</code> for every asset until something
                      is wired to it.
                    </span>
                  ) : !c.enabled ? (
                    <span className={s.chain}>
                      The standing authorisation is withdrawn. It runs when
                      somebody asks, and not on its clock.
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {org && mayWrite ? (
        <Panel
          title="Ask a new question"
          note="A check belongs to the firm, so this one question is asked of every client. What varies per engagement is scope, and that is the only thing that should."
        >
          <CheckForm orgId={org} />
        </Panel>
      ) : (
        <Alert tone="info">
          <Text size="sm">
            Only an owner or an admin changes what the firm asks. You can see
            every check — a question is not client data — and the reason you
            cannot write one is shown rather than the control being hidden.
          </Text>
        </Alert>
      )}

      <Alert tone="info">
        <Text size="sm">
          A check with <strong>no steps</strong> is the human check — <code>READ BY
          YOU</code>. It applies to every kind and never reports stale, and both
          fall out of its shape rather than out of a special case: nothing spawns,
          and there is no interval to be late against.
        </Text>
      </Alert>
    </>
  );
}
