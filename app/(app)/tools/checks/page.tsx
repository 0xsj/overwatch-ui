import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Mock, Panel } from "@/components/display";
import { Text } from "@/components/typography";
import { clientFor } from "@/lib/root";
import { listChecks, type Check } from "@/lib/services/pipeline";
import { PageHead } from "../../_components/page-head";
import s from "./checks.module.css";

const TITLE = "Checks";
const SUB =
  "A check is a named question with its own interval — not a script and not a schedule. The chain of tools underneath is how the question gets answered; coverage is computed from the question, which is why the two are stored separately.";

export const metadata: Metadata = { title: TITLE };

export default async function Page() {
  let checks: Check[] = [];
  try {
    checks = await listChecks(await clientFor("pipeline"));
  } catch {
    checks = [];
  }

  return (
    <>
      <PageHead title={TITLE} mock>{SUB}</PageHead>

      <Panel
        title="Questions this engagement asks"
        actions={<Mock note="check, run, invocation and tool are all UNBUILT in the workspace scope document. Nothing here is served — the shape exists so it can be argued with before a backend commits to it." />}
      >
        {checks.length === 0 ? (
          <Text size="sm" tone="tertiary">
            Never checked — nothing serves checks yet, and this session is not a
            fixture persona.
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
                    {/* An absent interval is a real kind of check — it runs when
                        somebody asks — and not an unset field. It says so
                        rather than rendering as a blank or a zero. */}
                    <span className={s.interval}>
                      {c.interval ? `every ${c.interval.replace("PT", "").toLowerCase()}` : "on request only"}
                    </span>
                  </span>
                  <span className={s.question}>{c.question}</span>
                  <span className={s.chain}>
                    {c.steps.length} {c.steps.length === 1 ? "step" : "steps"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
