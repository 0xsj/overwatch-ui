import type { Metadata } from "next";
import { Panel } from "@/components/display";
import { DensityToggle, ThemeToggle } from "@/components/chrome";
import { Alert } from "@/components/feedback";
import { Text } from "@/components/typography";
import { PageHead } from "../../_components/page-head";

const TITLE = "Preferences";
const SUB =
  "What you see, and only you. None of this is a fact about the organisation, so none of it is stored against one — it follows you between engagements and nobody else is affected by it.";

export const metadata: Metadata = { title: TITLE };

/** Two preferences, and the count is the point.
 *
 *  `ALIGNMENT.md` asked which preferences the mock implies, so they could be
 *  designed rather than guessed — nothing is modelled: no column, no type. The
 *  answer sent back is these two and no more, because these two are the only
 *  ones with a control that already exists and something that already reads
 *  them. `CLAUDE.md` §5: a modelled state with no caller is a state that will be
 *  wrong when something finally reaches it. */
export default function Page() {
  return (
    <>
      <PageHead title={TITLE}>{SUB}</PageHead>

      <Panel title="Theme" note="Follow the system, or pick one.">
        <ThemeToggle />
      </Panel>

      <Panel
        title="Density"
        note="Compact tightens every control in the application by a few pixels — it changes three tokens, so anything that reads them follows."
      >
        <DensityToggle />
      </Panel>

      <Alert tone="info">
        <Text size="sm">
          <strong>These live in this browser and nowhere else.</strong> Nothing
          stores a preference against your account yet — no column, no type — so
          signing in somewhere else starts from the default, and clearing site data
          resets them.
        </Text>
        <Text size="sm" tone="tertiary">
          Said rather than hidden, because a preferences screen that quietly forgets
          is worse than one that tells you it will.
        </Text>
      </Alert>

      <Panel title="What is deliberately not here">
        <Text size="sm" tone="tertiary">
          A default engagement, a default target, saved filters, notification
          settings. Each is a plausible preference and none of them has a caller —
          adding a column for one now means guessing its meaning, and a guessed
          preference is wrong in a way nobody notices until somebody relies on it.
        </Text>
      </Panel>
    </>
  );
}
