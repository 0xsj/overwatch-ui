import type { ReactNode } from "react";
import { Heading, Text } from "@/components/typography";
import { ThemeToggle } from "@/components/chrome";
import { SECTIONS } from "./_sections/registry";
import s from "./_components/sink.module.css";

export default function KitchenSinkLayout({ children }: { children: ReactNode }) {
  return (
    <div className={s.shell}>
      <header className={s.header}>
        <div className={s.headerInner}>
          <span className={s.wordmark}>overwatch</span>
          <nav aria-label="Sections on this page" className={s.nav}>
            {SECTIONS.map(({ id, label }) => (
              <a key={id} href={`#${id}`} className={s.navLink}>{label}</a>
            ))}
          </nav>
          <div className={s.controls}><ThemeToggle /></div>
        </div>
      </header>
      <main className={s.main}>
        <div className={s.intro}>
          <Heading level={1} scale="d2">Kitchen sink</Heading>
          <Text tone="tertiary" measure>
            The design system, rendered, with nothing above it. The nav is derived from
            the same registry the page composes, so a section cannot exist and be
            unreachable — and the token audit is computed rather than eyeballed.
          </Text>
        </div>
        <div className={s.sections}>{children}</div>
      </main>
    </div>
  );
}
