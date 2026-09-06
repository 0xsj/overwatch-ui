import type { Metadata } from "next";
import Link from "next/link";
import { Chip } from "@/components/display";
import { Text } from "@/components/typography";
import { usingFixtures } from "@/lib/root";
import s from "./_components/marketing.module.css";

export const metadata: Metadata = {
  title: "Overwatch",
  description:
    "What you know, how you know it, and what you have never looked at. Coming soon.",
};

export default function ComingSoon() {
  return (
    <main className={s.page}>
      <div className={s.glow} aria-hidden="true" />

      <nav className={s.nav} aria-label="Overwatch">
        {/* Only while there is no server. `lib/root` is the one file that knows,
            so this entrance removes itself the moment NEXT_PUBLIC_API_URL is set
            rather than becoming an unguarded door somebody has to remember. */}
        {usingFixtures ? (
          <Link href="/home" className={s.quiet}>Open the application</Link>
        ) : null}
        <Link href="/sign-in" className={s.signIn}>Sign in</Link>
      </nav>

      <div className={s.body}>
        <Chip tone="accent" glyph="··">Coming soon</Chip>

        <h1 className={s.wordmark}>overwatch</h1>

        <Text size="lg" tone="secondary" className={s.tagline}>
          What you know, how you know it, and what you have never looked at.
        </Text>
      </div>

      <div className={s.foot}>
        <Text size="xs">An observation, never a fact.</Text>
      </div>
    </main>
  );
}
