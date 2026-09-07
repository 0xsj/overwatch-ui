import Link from "next/link";
import type { ReactNode } from "react";
import { Mock } from "@/components/display";
import { Alert } from "@/components/feedback";
import { Heading, Text } from "@/components/typography";
import { ThemeToggle } from "@/components/chrome";
import { servedByFixtures, transport } from "@/lib/root";
import s from "./auth.module.css";

export function AuthShell({
  title, blurb, children, below, note,
}: {
  title: string;
  blurb?: ReactNode;
  children: ReactNode;
  below?: ReactNode;
  /** Appended to the no-backend notice. For anything only true of one screen. */
  note?: ReactNode;
}) {
  const onFixtures = servedByFixtures("identity");
  return (
    <div className={s.shell}>
      <div className={s.glow} aria-hidden="true" />

      <div className={s.column}>
        <Link href="/" className={s.brand}>
          <span className={s.wordmark}>overwatch</span>
        </Link>

        <div className={s.card}>
          <div className={s.cardHead}>
            <Heading level={1} scale="h1">{title}</Heading>
            {blurb ? <Text size="sm" tone="tertiary">{blurb}</Text> : null}
          </div>
          {children}
        </div>

        {below ? <div className={s.alt}>{below}</div> : null}
      </div>

      <div className={s.foot}>
        {/* The tone, the badge and the sentence all follow the adapter.
            Hard-coding "this build has no backend" was true for a fortnight and
            became a lie the moment one was configured — a notice that cannot be
            wrong is worth more than one that is usually right. */}
        <Alert tone={onFixtures ? "warn" : "info"} live={false}>
          <Text size="xs">
            {onFixtures ? (
              <Mock
                note="This build has no server configured, so every account, invitation and workspace named here comes from a fixture."
                className={s.mock}
              />
            ) : null}
            <strong>
              {onFixtures ? "This build has no backend." : "Connected."}
            </strong>{" "}
            {transport}
          </Text>
          {onFixtures && note ? <Text size="xs" tone="tertiary">{note}</Text> : null}
        </Alert>
        <ThemeToggle />
      </div>
    </div>
  );
}
