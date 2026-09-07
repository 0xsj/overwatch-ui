import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Panel } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { clientFor } from "@/lib/root";
import { listChecks, type Check } from "@/lib/services/checks";
import { loadShell } from "../../_shell";
import { PageHead } from "../../_components/page-head";
import s from "./checks.module.css";

const TITLE = "Checks";
const SUB =
  "A check is a named question with its own interval — not a script and not a schedule. It belongs to the firm rather than to an engagement: “what ports are open” is a question you know how to ask, and it is the same question for every client.";

export const metadata: Metadata = { title: TITLE };

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

export default async function Page() {
  const shell = await loadShell();
  const org = shell.context?.org;

  let checks: Check[] = [];
  let read = false;
  if (org) {
    try {
      checks = await listChecks(await clientFor("checks"), org.org_id);
      read = true;
    } catch {
      read = false;
    }
  }

  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>

      <Panel
        title={org ? `Questions ${org.name} knows how to ask` : "Checks"}
        note="Org-wide. A per-engagement “do not run this here” is not modelled and must not be — that is what scope already is, and a second flag would be a second, invisible authority over the same question."
      >
        {!read ? (
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
                    {c.enabled ? (
                      <Badge tone="accent" mono>on</Badge>
                    ) : (
                      <Badge tone="neutral" mono>off</Badge>
                    )}
                    <span className={s.interval}>{intervalWords(c.interval_seconds)}</span>
                  </span>
                  <span className={s.question}>{c.question}</span>
                  {/* The coverage denominator. A check with `applies_to: ["host"]`
                      produces NO CELL for a /24 — not a cell in state `never`. */}
                  <span className={s.chain}>
                    applies to {c.applies_to.join(" · ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

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
