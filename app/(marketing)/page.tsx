import type { Metadata } from "next";
import { Chip } from "@/components/display";
import { Text } from "@/components/typography";
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
