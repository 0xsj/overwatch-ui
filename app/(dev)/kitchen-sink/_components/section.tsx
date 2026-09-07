import type { ReactNode } from "react";
import { Heading, Text } from "@/components/typography";
import s from "./sink.module.css";

/** A stable anchor from the visible title, so the nav can be derived from the
 *  page rather than declared beside it — a case cannot exist and be unreachable. */
export const slug = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function Section({ id, title, blurb, children }: {
  id: string; title: string; blurb?: string; children: ReactNode;
}) {
  return (
    <section id={id} data-section={title} className={s.section}>
      <Heading level={2} scale="h1">{title}</Heading>
      {blurb ? <Text tone="tertiary" size="sm" measure>{blurb}</Text> : null}
      <div className={s.sectionBody}>{children}</div>
    </section>
  );
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={s.row}>
      <Text as="span" size="xs" tone="quiet" className={s.rowLabel}>{label}</Text>
      {children}
    </div>
  );
}

/** The sink's own demo frame. Named `Case` and not `Panel` because
 *  `display/Panel` is a component this page has to be able to show. */
export function Case({ title, note, children, sources }: {
  title: string; note?: string; children: ReactNode;
  sources?: ReadonlyArray<{ path: string; code: string }>;
}) {
  const id = slug(title);
  return (
    <div id={id} data-case={title} className={s.panel}>
      <div className={s.panelHead}>
        <Heading level={3} scale="h3">
          <a href={`#${id}`} className={s.anchor}>{title}</a>
        </Heading>
        {note ? <Text as="span" size="xs" tone="tertiary">{note}</Text> : null}
      </div>
      <div className={s.panelBody}>{children}</div>
      {sources?.length ? (
        /* Collapsed. The source used to be the tallest thing in every case, so
           scrolling the page showed code and the demos were what you passed on
           the way. A <details> needs no component and is keyboard-operable and
           announced by default. */
        <details className={s.source}>
          <summary className={s.sourceSummary}>
            source
            <span className={s.sourcePaths}>{sources.map((x) => x.path).join(" · ")}</span>
          </summary>
          {sources.map((src) => (
            <div key={src.path}>
              <p className={s.codePath}>{src.path}</p>
              <pre className={s.code}><code>{src.code}</code></pre>
            </div>
          ))}
        </details>
      ) : null}
    </div>
  );
}
