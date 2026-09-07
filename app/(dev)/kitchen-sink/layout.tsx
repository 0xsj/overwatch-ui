import type { ReactNode } from "react";
import { Mock } from "@/components/display";
import { Heading, Text } from "@/components/typography";
import { ThemeToggle } from "@/components/chrome";
import { CaseNav } from "./_components/case-nav";
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

      <div className={s.body}>
        <aside className={s.rail}>
          <CaseNav />
        </aside>

        <main className={s.main}>
          <div className={s.intro}>
            <div className={s.titleRow}>
              <Heading level={1} scale="d2">Kitchen sink</Heading>
              <Mock note="Every value on this page is a sample chosen to exercise a component. None of it is a record." />
            </div>
            <Text tone="tertiary" measure>
              The design system, rendered, with nothing above it. Both navigations are derived from
              the page rather than declared beside it — the top from the same registry it composes,
              the rail from the cases actually on screen — so nothing here can exist and be
              unreachable. Source is collapsed under each case; the demo is the point.
            </Text>
          </div>
          <div className={s.sections}>{children}</div>
        </main>
      </div>
    </div>
  );
}
